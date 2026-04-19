import {
  createVideo,
  getVideoFileType,
  getVideoStatus,
  processVideo,
  requestVideoUploadUrl,
  uploadVideoFileWithProgress,
} from './dashboardApi'
import { uploadStore } from '../store/uploadStore'

const POLL_INTERVAL_MS = 3000
const MAX_POLL_ATTEMPTS = 120
const PROGRESS_THROTTLE_MS = 150

const uploadRuntime = new Map()
const uploadTasks = new Map()
const uploadAbortControllers = new Map()
const pollingTimers = new Map()
const progressUpdaters = new Map()

const createUploadId = () => `upload-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const stopPolling = (uploadId) => {
  const timerId = pollingTimers.get(uploadId)

  if (timerId) {
    window.clearTimeout(timerId)
    pollingTimers.delete(uploadId)
  }
}

const cleanupProgressUpdater = (uploadId) => {
  const updater = progressUpdaters.get(uploadId)

  if (updater?.dispose) {
    updater.dispose()
  }

  progressUpdaters.delete(uploadId)
}

const cleanupUploadResources = (uploadId) => {
  stopPolling(uploadId)
  cleanupProgressUpdater(uploadId)
  uploadAbortControllers.delete(uploadId)
  uploadTasks.delete(uploadId)
}

const createProgressUpdater = (uploadId) => {
  let lastProgress = 0
  let lastSentAt = 0
  let queuedProgress = null
  let timerId = null

  const flush = (progress) => {
    if (timerId) {
      window.clearTimeout(timerId)
      timerId = null
    }

    queuedProgress = null
    lastProgress = progress
    lastSentAt = Date.now()
    uploadStore.updateProgress(uploadId, progress)
  }

  const queueFlush = (progress) => {
    queuedProgress = progress

    if (timerId) {
      return
    }

    const delay = Math.max(0, PROGRESS_THROTTLE_MS - (Date.now() - lastSentAt))

    timerId = window.setTimeout(() => {
      flush(queuedProgress ?? lastProgress)
    }, delay)
  }

  return {
    update(progress) {
      const normalizedProgress = Math.max(0, Math.min(100, Math.round(progress)))
      const now = Date.now()

      if (
        normalizedProgress >= 100 ||
        normalizedProgress <= lastProgress ||
        now - lastSentAt >= PROGRESS_THROTTLE_MS ||
        normalizedProgress - lastProgress >= 5
      ) {
        flush(normalizedProgress)
        return
      }

      queueFlush(normalizedProgress)
    },

    dispose() {
      if (timerId) {
        window.clearTimeout(timerId)
      }
    },
  }
}

const schedulePoll = (uploadId, callback, delay = POLL_INTERVAL_MS) => {
  stopPolling(uploadId)
  const timerId = window.setTimeout(callback, delay)
  pollingTimers.set(uploadId, timerId)
}

const beginPolling = (uploadId, token) => {
  const poll = async (attempt = 0, consecutiveErrors = 0) => {
    const upload = uploadStore.getUpload(uploadId)

    if (!upload?.videoId || upload.status !== 'processing') {
      stopPolling(uploadId)
      return
    }

    try {
      const statusPayload = await getVideoStatus(token, upload.videoId)
      const status = statusPayload?.status || 'processing'

      if (status === 'ready') {
        uploadStore.updateStatus(uploadId, 'ready', {
          progress: 100,
          error: null,
          hint: '',
          queuePosition: null,
          queueState: null,
        })
        cleanupUploadResources(uploadId)
        return
      }

      if (status === 'failed') {
        uploadStore.setError(uploadId, 'Video processing failed on the server.', {
          progress: 100,
          queuePosition: null,
          queueState: null,
        })
        cleanupUploadResources(uploadId)
        return
      }

      uploadStore.updateStatus(uploadId, 'processing', {
        progress: 100,
        error: null,
        hint: statusPayload?.queuePosition
          ? ''
          : statusPayload?.queueState === 'active'
            ? ''
            : upload.hint || '',
        queuePosition: Number.isFinite(statusPayload?.queuePosition)
          ? statusPayload.queuePosition
          : null,
        queueState: statusPayload?.queueState || null,
      })

      if (attempt + 1 >= MAX_POLL_ATTEMPTS) {
        uploadStore.updateStatus(uploadId, 'processing', {
          hint: 'Processing is taking longer than expected. Check status manually if needed.',
        })
        stopPolling(uploadId)
        return
      }

      schedulePoll(uploadId, () => poll(attempt + 1, 0))
    } catch (error) {
      const nextErrorCount = consecutiveErrors + 1

      if (attempt + 1 >= MAX_POLL_ATTEMPTS) {
        uploadStore.updateStatus(uploadId, 'processing', {
          hint: 'Unable to keep polling right now. Check status manually.',
        })
        stopPolling(uploadId)
        return
      }

      uploadStore.updateStatus(uploadId, 'processing', {
        hint:
          nextErrorCount >= 3
            ? 'Status checks are failing. The video may still be processing.'
            : upload.hint || '',
      })

      schedulePoll(uploadId, () => poll(attempt + 1, nextErrorCount), POLL_INTERVAL_MS)
    }
  }

  poll()
}

const runUpload = async (uploadId, file, metadata, token) => {
  const progressUpdater = createProgressUpdater(uploadId)
  progressUpdaters.set(uploadId, progressUpdater)

  try {
    const fileType = getVideoFileType(file)
    const abortController = new AbortController()
    uploadAbortControllers.set(uploadId, abortController)

    uploadStore.updateStatus(uploadId, 'uploading', {
      error: null,
      hint: '',
      queuePosition: null,
      queueState: null,
      progress: 0,
    })

    const { uploadUrl, r2Key } = await requestVideoUploadUrl(token, {
      courseId: metadata.courseId,
      hubId: metadata.hubId,
      batchId: metadata.batchId,
      fileType,
      videoType: metadata.videoType || 'course',
    })

    progressUpdater.update(5)

    await uploadVideoFileWithProgress(
      uploadUrl,
      file,
      fileType,
      (progress) => {
        const scaledProgress = 5 + progress * 0.9
        progressUpdater.update(scaledProgress)
      },
      abortController.signal
    )

    progressUpdater.update(96)

    const createdVideo = await createVideo(token, {
      title: metadata.title || file.name.replace(/\.[^.]+$/, ''),
      description: metadata.description || '',
      courseId: metadata.courseId,
      lessonId: metadata.lessonId,
      batchId: metadata.batchId,
      hubId: metadata.hubId,
      r2Key,
      videoType: metadata.videoType || 'course',
    })

    const videoId = createdVideo?._id || createdVideo?.id

    if (!videoId) {
      throw new Error('The uploaded video could not be created.')
    }

    uploadStore.updateStatus(uploadId, 'uploading', {
      progress: 99,
      videoId,
    })

    const processResult = await processVideo(token, videoId)

    uploadStore.updateStatus(uploadId, 'processing', {
      progress: 100,
      error: null,
      hint: '',
      videoId,
      queuePosition: Number.isFinite(processResult?.queuePosition) ? processResult.queuePosition : null,
      queueState: processResult?.queueState || null,
    })

    uploadAbortControllers.delete(uploadId)
    cleanupProgressUpdater(uploadId)
    beginPolling(uploadId, token)
  } catch (error) {
    const nextUpload = uploadStore.getUpload(uploadId)
    const isAbortError =
      error?.name === 'AbortError' || /cancelled/i.test(error?.message || '') || /canceled/i.test(error?.message || '')

    uploadStore.setError(
      uploadId,
      isAbortError ? 'Upload cancelled.' : error?.message || 'Upload failed. Please try again.',
      {
        progress: nextUpload?.videoId ? 100 : nextUpload?.progress || 0,
        queuePosition: null,
        queueState: null,
      }
    )
  } finally {
    cleanupProgressUpdater(uploadId)
    uploadAbortControllers.delete(uploadId)
    uploadTasks.delete(uploadId)
  }
}

export const startUpload = (file, metadata, token) => {
  if (!file) {
    throw new Error('Please choose a video file to upload.')
  }

  if (!token) {
    throw new Error('You need to be signed in to upload videos.')
  }

  const uploadId = createUploadId()

  uploadRuntime.set(uploadId, {
    file,
    metadata,
    token,
  })

  uploadStore.addUpload({
    id: uploadId,
    fileName: file.name,
    progress: 0,
    status: 'uploading',
    videoId: null,
    error: null,
    courseId: metadata.courseId || null,
    hubId: metadata.hubId || null,
    lessonId: metadata.lessonId || null,
    batchId: metadata.batchId || null,
    videoType: metadata.videoType || 'course',
    size: file.size || 0,
  })

  const task = runUpload(uploadId, file, metadata, token)
  uploadTasks.set(uploadId, task)

  return uploadId
}

export const cancelUpload = (uploadId) => {
  stopPolling(uploadId)
  cleanupProgressUpdater(uploadId)

  const controller = uploadAbortControllers.get(uploadId)
  if (controller) {
    controller.abort()
  }

  const upload = uploadStore.getUpload(uploadId)

  if (!upload) {
    return
  }

  if (upload.status === 'uploading') {
    uploadStore.setError(uploadId, 'Upload cancelled.', {
      queuePosition: null,
      queueState: null,
    })
    return
  }

  if (upload.status === 'processing') {
    uploadStore.updateStatus(uploadId, 'processing', {
      hint: 'Background tracking stopped. Processing may still finish on the server.',
      queuePosition: null,
      queueState: null,
    })
  }
}

export const retryUpload = (uploadId) => {
  const runtime = uploadRuntime.get(uploadId)

  if (!runtime?.file || !runtime?.token) {
    throw new Error('The original file is no longer available for retry.')
  }

  stopPolling(uploadId)
  cleanupProgressUpdater(uploadId)

  uploadStore.updateStatus(uploadId, 'uploading', {
    progress: 0,
    videoId: null,
    error: null,
    hint: '',
    queuePosition: null,
    queueState: null,
  })

  const task = runUpload(uploadId, runtime.file, runtime.metadata, runtime.token)
  uploadTasks.set(uploadId, task)
}

export const retryProcessing = async (uploadId) => {
  const runtime = uploadRuntime.get(uploadId)
  const upload = uploadStore.getUpload(uploadId)

  if (!upload?.videoId || !runtime?.token) {
    throw new Error('This upload is not ready for processing retry.')
  }

  stopPolling(uploadId)

  uploadStore.updateStatus(uploadId, 'processing', {
    progress: 100,
    error: null,
    hint: '',
    queuePosition: null,
    queueState: null,
  })

  try {
    const processResult = await processVideo(runtime.token, upload.videoId)

    uploadStore.updateStatus(uploadId, 'processing', {
      queuePosition: Number.isFinite(processResult?.queuePosition) ? processResult.queuePosition : null,
      queueState: processResult?.queueState || null,
    })

    beginPolling(uploadId, runtime.token)
  } catch (error) {
    uploadStore.setError(uploadId, error?.message || 'Failed to restart processing.', {
      progress: 100,
    })
  }
}

export const dismissUpload = (uploadId) => {
  cleanupUploadResources(uploadId)
  uploadRuntime.delete(uploadId)
  uploadStore.removeUpload(uploadId)
}

export const clearCompletedUploads = () => {
  const uploads = uploadStore.getState().uploads

  uploads
    .filter((upload) => upload.status === 'ready' || upload.status === 'failed')
    .forEach((upload) => {
      dismissUpload(upload.id)
    })
}

const uploadManager = {
  startUpload,
  cancelUpload,
  retryUpload,
  retryProcessing,
  dismissUpload,
  clearCompletedUploads,
}

export default uploadManager
