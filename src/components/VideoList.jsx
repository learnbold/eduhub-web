import './VideoList.css'

function VideoList({ videos, currentVideo, onSelectVideo }) {
  return (
    <section className="video-list">
      <div className="video-list__header">
        <div>
          <p className="video-list__eyebrow">Playlist</p>
          <h2>Course Lessons</h2>
        </div>
        <span className="video-list__count">{videos.length}</span>
      </div>

      <div className="video-list__items" role="list" aria-label="Course playlist">
        {videos.map((video) => {
          const isActive =
            currentVideo?.order === video.order && currentVideo?.title === video.title

          return (
            <button
              key={`${video.order}-${video.title}`}
              type="button"
              className={isActive ? 'video-list__item active' : 'video-list__item'}
              onClick={() => onSelectVideo(video)}
            >
              <span className="video-list__order">{String(video.order).padStart(2, '0')}</span>
              <span className="video-list__copy">
                <strong>{video.title}</strong>
                <small>{isActive ? 'Now playing' : 'Ready to watch'}</small>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default VideoList
