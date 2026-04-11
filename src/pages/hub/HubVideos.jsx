import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { deleteVideo, fetchManagedHubVideos } from '../../utils/dashboardApi'

const cardImageStyle = {
  width: '100%',
  height: '160px',
  objectFit: 'cover',
  backgroundColor: '#334155',
}

const cardThumbnailContainerStyle = {
  margin: '-24px -24px 18px -24px',
  borderRadius: '28px 28px 0 0',
  overflow: 'hidden',
  position: 'relative'
}

const actionIconsStyle = {
  position: 'absolute',
  top: '12px',
  right: '12px',
  display: 'flex',
  gap: '8px',
  opacity: 0,
  transition: 'opacity 0.2s ease',
}

const cardHoverStyle = {
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
}

const cardHoverClass = 'dashboard-video-card group'

function HubVideos() {
  const { token } = useAuth()
  const { hub } = useOutletContext()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadVideos = async () => {
      try {
        setLoading(true)
        setError('')
        const nextVideos = await fetchManagedHubVideos(token, hub._id, controller.signal)

        if (!controller.signal.aborted) {
          setVideos(nextVideos)
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Failed to load hub videos.')
          setVideos([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadVideos()

    return () => controller.abort()
  }, [hub?._id, token])

  const basePath = `/hub/${hub.slug}/dashboard`
  const standaloneVideos = videos.filter((video) => video.videoType === 'standalone')
  const courseVideos = videos.filter((video) => video.videoType !== 'standalone')

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    try {
      await deleteVideo(token, id);
      setVideos(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      alert("Failed to delete video");
    }
  }

  const handleEdit = (id) => {
    // Placeholder edit behavior
    alert(`Edit functionality for video ${id} is coming soon!`);
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Videos</p>
            <h2>Manage all hub videos</h2>
            <p>
              Course lessons and standalone hub updates live together here so the content team can
              assign them into batches without losing the original course structure.
            </p>
          </div>
          <div className="dashboard-page__actions">
            <Link to={`${basePath}/videos/upload?type=course`} className="dashboard-button">
              Upload Course Video
            </Link>
            <Link to={`${basePath}/videos/upload?type=standalone`} className="dashboard-button--ghost">
              Upload Standalone Video
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}

      {loading ? (
        <section className="dashboard-panel">
          <p className="dashboard-muted">Loading hub videos...</p>
        </section>
      ) : videos.length === 0 ? (
        <section className="dashboard-empty">
          <h2>No videos yet</h2>
          <p>Start with a lesson upload or a standalone hub update.</p>
        </section>
      ) : (
        <>
          <section className="dashboard-panel">
            <div className="dashboard-page__header">
              <div>
                <p className="dashboard-section-kicker">Standalone Feed</p>
                <h3>Public hub updates</h3>
              </div>
            </div>

            {standaloneVideos.length === 0 ? (
              <div className="dashboard-empty">
                <h3>No standalone updates yet</h3>
                <p>Standalone videos are ideal for announcements, free lessons, and creator updates.</p>
              </div>
            ) : (
              <div className="dashboard-grid dashboard-grid--videos" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {standaloneVideos.map((video) => (
                  <article key={video._id} className="dashboard-video-card" style={cardHoverStyle} 
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 24px 70px rgba(15, 23, 42, 0.12)'; e.currentTarget.querySelector('.action-icons').style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 24px 70px rgba(15, 23, 42, 0.08)'; e.currentTarget.querySelector('.action-icons').style.opacity = '0'; }}>
                    
                    <div style={cardThumbnailContainerStyle}>
                      <img src={video.thumbnailUrl || 'https://via.placeholder.com/600x400?text=Video'} alt={video.title} style={cardImageStyle} />
                      <div className="action-icons" style={actionIconsStyle}>
                        <button onClick={() => handleEdit(video._id)} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#475569', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} title="Edit">✏️</button>
                        <button onClick={() => handleDelete(video._id)} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#f87171', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} title="Delete">🗑️</button>
                      </div>
                    </div>

                    <div className="dashboard-video-card__header">
                      <div>
                        <h3>{video.title}</h3>
                        <p className="dashboard-muted">{video.description || 'Hub update video.'}</p>
                      </div>
                    </div>
                    <div className="dashboard-video-card__meta">
                      <div>
                        <span>Status</span>
                        <strong>{video.status}</strong>
                      </div>
                      <div>
                        <span>Views</span>
                        <strong>{video.viewsCount || 0}</strong>
                      </div>
                      <div>
                        <span>Comments</span>
                        <strong>{video.commentsCount || 0}</strong>
                      </div>
                    </div>
                    {video.batchSummaries?.length ? (
                      <div className="dashboard-pill-row">
                        {video.batchSummaries.map((batch) => (
                          <span key={batch._id} className="dashboard-pill dashboard-pill--neutral">
                            {batch.title}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-page__header">
              <div>
                <p className="dashboard-section-kicker">Course Library</p>
                <h3>Course-attached videos</h3>
              </div>
            </div>

            {courseVideos.length === 0 ? (
              <div className="dashboard-empty">
                <h3>No course videos yet</h3>
                <p>Course lessons will appear here once your team starts uploading them.</p>
              </div>
            ) : (
              <div className="dashboard-grid dashboard-grid--videos" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                {courseVideos.map((video) => (
                  <article key={video._id} className="dashboard-video-card" style={cardHoverStyle} 
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 24px 70px rgba(15, 23, 42, 0.12)'; e.currentTarget.querySelector('.action-icons').style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 24px 70px rgba(15, 23, 42, 0.08)'; e.currentTarget.querySelector('.action-icons').style.opacity = '0'; }}>
                    
                    <div style={cardThumbnailContainerStyle}>
                      <img src={video.thumbnailUrl || 'https://via.placeholder.com/600x400?text=Video'} alt={video.title} style={cardImageStyle} />
                      <div className="action-icons" style={actionIconsStyle}>
                        <button onClick={() => handleEdit(video._id)} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#475569', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} title="Edit">✏️</button>
                        <button onClick={() => handleDelete(video._id)} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#f87171', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} title="Delete">🗑️</button>
                      </div>
                    </div>

                    <div className="dashboard-video-card__header">
                      <div>
                        <h3>{video.title}</h3>
                        <p className="dashboard-muted">{video.description || 'Course lesson video.'}</p>
                      </div>
                    </div>
                    <div className="dashboard-video-card__meta">
                      <div>
                        <span>Status</span>
                        <strong>{video.status}</strong>
                      </div>
                      <div>
                        <span>Views</span>
                        <strong>{video.viewsCount || 0}</strong>
                      </div>
                      <div>
                        <span>Comments</span>
                        <strong>{video.commentsCount || 0}</strong>
                      </div>
                    </div>
                    {video.batchSummaries?.length ? (
                      <div className="dashboard-pill-row">
                        {video.batchSummaries.map((batch) => (
                          <span key={batch._id} className="dashboard-pill dashboard-pill--neutral">
                            {batch.title}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default HubVideos
