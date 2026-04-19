import { createContext, createElement, useContext, useSyncExternalStore } from 'react'

const createUploadStore = () => {
  let state = {
    uploads: [],
  }

  const listeners = new Set()

  const emitChange = () => {
    listeners.forEach((listener) => listener())
  }

  const setState = (updater) => {
    const nextState = typeof updater === 'function' ? updater(state) : updater

    if (nextState === state) {
      return
    }

    state = nextState
    emitChange()
  }

  const patchUpload = (uploadId, patch) => {
    setState((currentState) => {
      const nextUploads = currentState.uploads.map((upload) =>
        upload.id === uploadId
          ? {
              ...upload,
              ...(typeof patch === 'function' ? patch(upload) : patch),
            }
          : upload
      )

      return {
        ...currentState,
        uploads: nextUploads,
      }
    })
  }

  return {
    getState: () => state,

    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },

    addUpload: (upload) => {
      setState((currentState) => ({
        ...currentState,
        uploads: [
          {
            progress: 0,
            status: 'uploading',
            videoId: null,
            error: null,
            hint: '',
            queuePosition: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            ...upload,
          },
          ...currentState.uploads,
        ],
      }))
    },

    patchUpload,

    updateProgress: (uploadId, progress) => {
      patchUpload(uploadId, {
        progress: Math.max(0, Math.min(100, Math.round(progress))),
        updatedAt: Date.now(),
      })
    },

    updateStatus: (uploadId, status, extra = {}) => {
      patchUpload(uploadId, {
        status,
        updatedAt: Date.now(),
        ...extra,
      })
    },

    setVideoId: (uploadId, videoId) => {
      patchUpload(uploadId, {
        videoId,
        updatedAt: Date.now(),
      })
    },

    setError: (uploadId, error, extra = {}) => {
      patchUpload(uploadId, {
        status: 'failed',
        error,
        updatedAt: Date.now(),
        ...extra,
      })
    },

    removeUpload: (uploadId) => {
      setState((currentState) => ({
        ...currentState,
        uploads: currentState.uploads.filter((upload) => upload.id !== uploadId),
      }))
    },

    clearCompleted: () => {
      setState((currentState) => ({
        ...currentState,
        uploads: currentState.uploads.filter(
          (upload) => upload.status !== 'ready' && upload.status !== 'failed'
        ),
      }))
    },

    getUpload: (uploadId) => state.uploads.find((upload) => upload.id === uploadId) || null,
  }
}

export const uploadStore = createUploadStore()

const UploadStoreContext = createContext(uploadStore)

export function UploadStoreProvider({ children }) {
  return createElement(UploadStoreContext.Provider, { value: uploadStore }, children)
}

export function useUploadStore() {
  const store = useContext(UploadStoreContext)

  if (!store) {
    throw new Error('useUploadStore must be used within <UploadStoreProvider>')
  }

  return useSyncExternalStore(store.subscribe, store.getState, store.getState)
}

export function useUploadStoreApi() {
  const store = useContext(UploadStoreContext)

  if (!store) {
    throw new Error('useUploadStoreApi must be used within <UploadStoreProvider>')
  }

  return store
}
