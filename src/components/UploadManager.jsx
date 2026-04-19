import { useEffect, useMemo, useRef } from 'react'
import { useUploadStore } from '../store/uploadStore'
import {
  cancelUpload,
  dismissUpload,
  retryProcessing,
  retryUpload,
} from '../utils/uploadManager'
import './UploadManager.css'

const READY_AUTO_DISMISS_MS = 5000

function UploadManager() {
  const { uploads: rawUploads } = useUploadStore()
  const dismissTimersRef = useRef(new Map())
  const uploads = useMemo(
    () => [...rawUploads].sort((left, right) => right.createdAt - left.createdAt),
    [rawUploads]
  )

  const activeUploads = useMemo(
    () => uploads.filter((upload) => upload.status !== 'ready' && upload.status !== 'failed'),
    [uploads]
  )
  const completedUploads = useMemo(
    () => uploads.filter((upload) => upload.status === 'ready' || upload.status === 'failed'),
    [uploads]
  )

  useEffect(() => {
    const readyIds = new Set()

    uploads.forEach((upload) => {
      if (upload.status !== 'ready') {
        return
      }

      readyIds.add(upload.id)

      if (dismissTimersRef.current.has(upload.id)) {
        return
      }

      const timerId = window.setTimeout(() => {
        dismissUpload(upload.id)
        dismissTimersRef.current.delete(upload.id)
      }, READY_AUTO_DISMISS_MS)

      dismissTimersRef.current.set(upload.id, timerId)
    })

    dismissTimersRef.current.forEach((timerId, uploadId) => {
      if (readyIds.has(uploadId)) {
        return
      }

      window.clearTimeout(timerId)
      dismissTimersRef.current.delete(uploadId)
    })
  }, [uploads])

  useEffect(
    () => () => {
      dismissTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      dismissTimersRef.current.clear()
    },
    []
  )

  if (!uploads.length) {
    return null
  }

  const title = activeUploads.length
    ? `${activeUploads.length} upload${activeUploads.length === 1 ? '' : 's'} in progress`
    : completedUploads.some((upload) => upload.status === 'failed')
      ? 'Upload issues'
      : 'Uploads complete'

  return (
    <aside className="upload-manager" aria-live="polite" aria-label="Background uploads">
      <div className="upload-manager__container">
        <header className="upload-manager__header">
          <div>
            <p className="upload-manager__eyebrow">Background uploads</p>
            <h2 className="upload-manager__title">{title}</h2>
          </div>
        </header>

        <div className="upload-manager__list">
          {uploads.map((upload) => (
            <UploadItem key={upload.id} upload={upload} />
          ))}
        </div>
      </div>
    </aside>
  )
}

function UploadItem({ upload }) {
  const statusLabel =
    upload.status === 'uploading'
      ? `Uploading ${upload.progress}%`
      : upload.status === 'processing'
        ? upload.queuePosition
          ? `Queued (position ${upload.queuePosition})`
          : 'Processing...'
        : upload.status === 'ready'
          ? 'Upload complete'
          : 'Upload failed'

  const secondaryText =
    upload.status === 'processing' && upload.queueState === 'active'
      ? 'Transcoding now'
      : upload.hint || upload.error || ''

  const showRetryProcessing = upload.status === 'failed' && Boolean(upload.videoId)
  const showRetryUpload = upload.status === 'failed' && !upload.videoId

  return (
    <article className={`upload-item upload-item--${upload.status}`}>
      <div className="upload-item__header">
        <span className={`upload-item__badge upload-item__badge--${upload.status}`} aria-hidden="true">
          {upload.status === 'processing' ? <span className="upload-item__spinner" /> : null}
        </span>

        <div className="upload-item__meta">
          <p className="upload-item__filename" title={upload.fileName}>
            {upload.fileName}
          </p>
          <p className="upload-item__status">{statusLabel}</p>
          {secondaryText ? <p className="upload-item__hint">{secondaryText}</p> : null}
        </div>

        {(upload.status === 'ready' || upload.status === 'failed') && (
          <button
            type="button"
            className="upload-item__icon-button"
            onClick={() => dismissUpload(upload.id)}
            aria-label="Dismiss upload"
          >
            Dismiss
          </button>
        )}
      </div>

      {upload.status === 'uploading' && (
        <div className="upload-item__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={upload.progress}>
          <div className="upload-item__progress-track">
            <div className="upload-item__progress-fill" style={{ width: `${upload.progress}%` }} />
          </div>
          <span className="upload-item__progress-text">{upload.progress}%</span>
        </div>
      )}

      {upload.status === 'processing' && (
        <div className="upload-item__indeterminate">
          <div className="upload-item__indeterminate-bar" />
        </div>
      )}

      <div className="upload-item__actions">
        {upload.status === 'uploading' && (
          <button type="button" className="upload-item__button upload-item__button--ghost" onClick={() => cancelUpload(upload.id)}>
            Cancel
          </button>
        )}

        {showRetryUpload && (
          <button type="button" className="upload-item__button" onClick={() => retryUpload(upload.id)}>
            Retry upload
          </button>
        )}

        {showRetryProcessing && (
          <button type="button" className="upload-item__button" onClick={() => retryProcessing(upload.id)}>
            Retry processing
          </button>
        )}
      </div>
    </article>
  )
}

export default UploadManager
