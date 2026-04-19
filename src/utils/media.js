export const CDN_BASE_URL = (import.meta.env.VITE_CDN_URL || 'https://cf.sparklass.com').replace(/\/+$/, '')
export const DEFAULT_THUMBNAIL = '/default-thumbnail.svg'

const ABSOLUTE_ASSET_PATTERN = /^(?:https?:)?\/\//i

export const buildAssetUrl = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value.trim()

  if (!normalized) {
    return ''
  }

  if (
    normalized.startsWith('blob:') ||
    normalized.startsWith('data:') ||
    ABSOLUTE_ASSET_PATTERN.test(normalized)
  ) {
    return normalized
  }

  return `${CDN_BASE_URL}/${normalized.replace(/^\/+/, '')}`
}

export const resolveThumbnailUrl = (...candidates) => {
  for (const candidate of candidates) {
    const resolved = buildAssetUrl(candidate)

    if (resolved) {
      return resolved
    }
  }

  return DEFAULT_THUMBNAIL
}

export const getVideoThumbnailUrl = (video) =>
  resolveThumbnailUrl(
    video?.selectedThumbnailUrl,
    video?.selectedThumbnail,
    video?.thumbnailUrl,
    video?.thumbnail
  )

export const applyThumbnailFallback = (event) => {
  event.currentTarget.onerror = null
  event.currentTarget.src = DEFAULT_THUMBNAIL
}
