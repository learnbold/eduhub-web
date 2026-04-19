import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  addVideoComment,
  deleteVideoComment,
  fetchVideoComments,
  fetchVideoStatus,
  incrementVideoView,
  toggleVideoLike,
} from '../utils/dashboardApi'
import { buildAssetUrl, getVideoThumbnailUrl } from '../utils/media'
import './VideoPlayer.css'

const getVideoId = (video) => video?._id || video?.videoId || video?.id || ''

const getStatusLabel = (status) => {
  if (status === 'failed') {
    return 'Failed'
  }

  if (status === 'ready') {
    return 'Ready'
  }

  if (status === 'processing') {
    return 'Processing'
  }

  if (status === 'uploading') {
    return 'Uploading'
  }

  return 'Processing'
}

const getCommentAuthor = (comment) => {
  const user = comment?.userId

  if (!user || typeof user !== 'object') {
    return 'Sparklass Member'
  }

  return user.displayName || user.preferredName || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || 'Sparklass Member'
}

function VideoPlayer({ video, onEnded, showHeader = true, showComments = true, autoPlay = true }) {
  const { token, user } = useAuth()
  const videoRef = useRef(null)
  const viewedVideoIdRef = useRef('')
  const videoId = getVideoId(video)
  const eyebrow = video?.eyebrow || (video?.order ? `Lesson ${video.order}` : 'Featured video')
  const statusLabel = video?.statusLabel || 'Streaming ready'
  const currentUserId = user?._id || user?.id || ''
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [viewsCount, setViewsCount] = useState(0)
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState('')
  const [posting, setPosting] = useState(false)
  const [liking, setLiking] = useState(false)
  const [status, setStatus] = useState('processing')
  const displayedStatus = ['processing', 'ready', 'failed'].includes(status) ? status : 'processing'
  const displayedStatusLabel =
    statusLabel === 'Streaming ready' || displayedStatus !== 'ready' ? getStatusLabel(displayedStatus) : statusLabel
  const engagementLabel = useMemo(() => {
    const views = Number(viewsCount || 0).toLocaleString()
    const likes = Number(likesCount || 0).toLocaleString()

    return `${views} view${Number(viewsCount || 0) === 1 ? '' : 's'} - ${likes} like${Number(likesCount || 0) === 1 ? '' : 's'}`
  }, [likesCount, viewsCount])

  useEffect(() => {
    const element = videoRef.current
    let sourceUrl = buildAssetUrl(video?.url || video?.hlsUrl || video?.videoUrl)

    if (!element || !sourceUrl) {
      return undefined
    }

    let hls
    let isDisposed = false
    const shouldUseHls = Boolean(video?.hlsUrl || sourceUrl?.includes('.m3u8'))

    const loadStream = async () => {
      if (!shouldUseHls) {
        element.src = sourceUrl
        return
      }

      const { default: Hls } = await import('hls.js/light')

      if (isDisposed) {
        return
      }

      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        })
        hls.loadSource(sourceUrl)
        hls.attachMedia(element)
      } else if (element.canPlayType('application/vnd.apple.mpegurl')) {
        element.src = sourceUrl
      }
    }

    loadStream().catch(() => {})

    return () => {
      isDisposed = true

      if (hls) {
        hls.destroy()
      }

      element.pause()
      element.removeAttribute('src')
      element.load()
    }
  }, [video])

  useEffect(() => {
    setLiked(false)
    setLikesCount(Number(video?.likesCount || 0))
    setViewsCount(Number(video?.viewsCount ?? video?.views ?? 0))
    setStatus(video?.status || (video?.url || video?.hlsUrl || video?.videoUrl ? 'ready' : 'processing'))
    setComments([])
    setLoadingComments(false)
    setCommentText('')
    setCommentError('')
  }, [videoId, video?.hlsUrl, video?.likesCount, video?.status, video?.url, video?.videoUrl, video?.views, video?.viewsCount])

  useEffect(() => {
    if (!videoId) return
    viewedVideoIdRef.current = null
  }, [videoId])

  useEffect(() => {
    if (!videoId) return
    if (viewedVideoIdRef.current === videoId) return

    viewedVideoIdRef.current = videoId

    incrementVideoView(videoId)
      .then((payload) => {
        if (typeof payload?.views === 'number') {
          setViewsCount(payload.views)
        }
      })
      .catch(() => {})
  }, [videoId])

  useEffect(() => {
    if (!videoId || !showComments) return

    const controller = new AbortController()

    const fetchComments = async () => {
      setLoadingComments(true)
      try {
        const data = await fetchVideoComments(videoId, 1, controller.signal)
        setComments(data || [])
      } catch (error) {
        if (error.name !== 'AbortError') console.error(error)
      } finally {
        if (!controller.signal.aborted) {
          setLoadingComments(false)
        }
      }
    }

    fetchComments()

    return () => controller.abort()
  }, [showComments, videoId])

  useEffect(() => {
    if (!token || !videoId) return

    let isMounted = true
    const controller = new AbortController()
    
    const interval = setInterval(async () => {
      try {
        const data = await fetchVideoStatus(token, videoId, controller.signal)
        if (isMounted && data?.status) {
          setStatus(data.status)
        }

        if (data?.status === 'ready' || data?.status === 'failed') {
          clearInterval(interval)
        }
      } catch (err) {
        console.error(err)
      }
    }, 5000)

    return () => {
      isMounted = false
      controller.abort()
      clearInterval(interval)
    }
  }, [token, videoId])

  useEffect(() => {
    if (status === 'ready') {
      const timer = setTimeout(() => setStatus(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [status])

  const handleLike = async () => {
    if (!token || !videoId) return
    if (liking) return
    
    setLiking(true)

    const prevLiked = liked
    const safeLikes = Number.isFinite(likesCount) ? likesCount : 0
    const prevCount = safeLikes

    // Optimistic update
    setLiked(!prevLiked)
    setLikesCount(prevCount + (prevLiked ? -1 : 1))

    try {
      const data = await toggleVideoLike(token, videoId)
      setLiked(Boolean(data?.liked))
    } catch (err) {
      // Rollback on failure
      setLiked(prevLiked)
      setLikesCount(prevCount)
      console.error(err)
    } finally {
      setLiking(false)
    }
  }

  const handleAddComment = async () => {
    if (posting) return

    const trimmed = commentText.trim()

    if (!token || !videoId || !trimmed) return

    if (trimmed.length > 500) {
      setCommentError('Keep comments under 500 characters.')
      return
    }

    try {
      setPosting(true)
      setCommentError('')
      const comment = await addVideoComment(token, videoId, trimmed)

      setComments((currentComments) => (comment ? [comment, ...currentComments] : currentComments))
      setCommentText('')
    } catch (error) {
      console.error(error)
    } finally {
      setPosting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!token || !commentId) {
      return
    }

    try {
      await deleteVideoComment(token, commentId)
      setComments((currentComments) => currentComments.filter((comment) => comment._id !== commentId))
    } catch (error) {
      setCommentError(error.message || 'Unable to delete comment right now.')
    }
  }

  const hasComments = Array.isArray(comments) && comments.length > 0

  if (!video || !videoId) return null

  return (
    <section className="video-player">
      {showHeader ? (
        <div className="video-player__header">
          <div>
            <p className="video-player__eyebrow">{eyebrow}</p>
            <h2>{video.title}</h2>
            <div className="video-player__actions">
              <span className="video-player__metric">{engagementLabel}</span>
              <button
                type="button"
                className={`video-player__like ${liked ? 'liked is-liked' : ''}`}
                disabled={!token || liking}
                onClick={handleLike}
              >
                {liked ? 'Liked' : 'Like'} {Number(likesCount || 0).toLocaleString()}
              </button>
            </div>
          </div>
          <span className={`video-player__status video-player__status--${displayedStatus} ${!status ? 'hidden' : ''}`}>
            {displayedStatusLabel}
          </span>
        </div>
      ) : null}

      <div
        className={showHeader ? 'video-player__surface' : 'video-player__surface video-player__surface--standalone'}
        key={`${video.order}-${video.title}`}
      >
        <video
          ref={videoRef}
          className="video-player__element"
          controls
          playsInline
          autoPlay={autoPlay}
          onEnded={onEnded}
          poster={getVideoThumbnailUrl(video)}
        />
      </div>

      {showComments && videoId ? (
        <section className="video-player__comments">
          <div className="video-player__comments-header">
            <h3>Comments</h3>
            <span>{comments.length}</span>
          </div>

          {token ? (
            <div className="video-player__comment-form">
              <textarea
                value={commentText}
                maxLength={500}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Add a comment..."
                disabled={posting}
              />
              <button
                type="button"
                disabled={!commentText.trim() || posting}
                onClick={handleAddComment}
              >
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          ) : (
            <p className="video-player__comment-note">Sign in to join the conversation.</p>
          )}

          {commentError ? <p className="video-player__comment-error">{commentError}</p> : null}

          <div className="video-player__comment-list">
            {loadingComments ? (
              <p className="video-player__comment-note muted">Loading comments...</p>
            ) : !hasComments ? (
              <p className="video-player__comment-note">No comments yet.</p>
            ) : (
              comments.map((comment) => {
                const commentUserId =
                  typeof comment.userId === 'object' ? comment.userId?._id || comment.userId?.id : comment.userId
                const canDelete = currentUserId && commentUserId === currentUserId

                return (
                  <article key={comment._id} className="video-player__comment">
                    <div>
                      <strong>{getCommentAuthor(comment)}</strong>
                      <p>{comment.text}</p>
                    </div>
                    {canDelete ? (
                      <button type="button" onClick={() => handleDeleteComment(comment._id)}>
                        Delete
                      </button>
                    ) : null}
                  </article>
                )
              })
            )}
          </div>
        </section>
      ) : null}
    </section>
  )
}

export default VideoPlayer
