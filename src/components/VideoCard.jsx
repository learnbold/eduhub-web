import './VideoCard.css'

const FALLBACK_THUMBNAIL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'

const formatCount = (value) => Number(value || 0).toLocaleString()

const formatDuration = (seconds) => {
  if (!seconds) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function VideoCard({ video, onClick }) {
  const title = video?.title || 'Untitled video'
  const hubName = video?.hub?.name || 'Sparklass Hub'
  const price = video?.price || 'Free'
  
  const displayPrice = price.toString().toLowerCase() === 'free' ? 'Free' : `₹${price.toString().replace(/[^0-9]/g, '') || price}`

  return (
    <article
      className="video-card"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="video-card__media">
        <img
          src={video?.thumbnailUrl || video?.thumbnail || FALLBACK_THUMBNAIL}
          alt={title}
          className="video-card__image"
          loading="lazy"
        />
        {video?.duration ? (
          <span className="video-card__duration">{formatDuration(video.duration)}</span>
        ) : null}
      </div>

      <div className="video-card__body">
        <h3 title={title}>{title}</h3>
        <p className="video-card__hub">{hubName}</p>
        <div className="video-card__stats" aria-label="Video stats">
          <span>👁 {formatCount(video?.viewsCount ?? video?.views)} views • {displayPrice}</span>
        </div>
      </div>
    </article>
  )
}

export default VideoCard
