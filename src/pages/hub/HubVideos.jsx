import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { DashboardModal, EditPlaceholderModal } from '../../components/dashboard/DashboardCards'
import { useAuth } from '../../context/AuthContext'
import { deleteVideo, fetchManagedHubVideos } from '../../utils/dashboardApi'
import { applyThumbnailFallback, getVideoThumbnailUrl } from '../../utils/media'

function HubVideos() {
  const { token } = useAuth()
  const { hub } = useOutletContext()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [videoToDelete, setVideoToDelete] = useState(null)
  const [deletingVideoId, setDeletingVideoId] = useState('')
  const [videoToEdit, setVideoToEdit] = useState(null)

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

  const handleDeleteVideo = async () => {
    if (!videoToDelete?._id) {
      return
    }

    try {
      setDeletingVideoId(videoToDelete._id)
      setError('')
      setSuccess('')
      await deleteVideo(token, videoToDelete._id)
      setVideos((current) => current.filter((video) => video._id !== videoToDelete._id))
      setVideoToDelete(null)
      setSuccess(`"${videoToDelete.title}" was deleted.`)
    } catch {
      setError('Failed to delete')
    } finally {
      setDeletingVideoId('')
    }
  }

  const cardHoverStyle = {
    transition: 'all 0.2s ease',
    borderRadius: '16px',
    overflow: 'hidden',
    cursor: 'pointer',
    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.08)',
  };

  const cardThumbnailContainerStyle = {
    width: '100%',
    height: '160px',
    overflow: 'hidden',
    borderRadius: '12px',
    position: 'relative',
  };

  const cardImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const actionIconsStyle = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    display: 'flex',
    gap: '8px',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  };

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
      {success ? <p className="dashboard-success">{success}</p> : null}

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
          <section className="dashboard-card-section">
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
                      <img src={getVideoThumbnailUrl(video)} alt={video.title} style={cardImageStyle} onError={applyThumbnailFallback} />
                      <div className="action-icons" style={actionIconsStyle}>
                        <button onClick={() => setVideoToEdit(video)} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#475569', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} title="Edit">✏️</button>
                        <button onClick={() => setVideoToDelete(video)} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#f87171', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} title="Delete">🗑️</button>
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

          <section className="dashboard-card-section">
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
                      <img src={getVideoThumbnailUrl(video)} alt={video.title} style={cardImageStyle} onError={applyThumbnailFallback} />
                      <div className="action-icons" style={actionIconsStyle}>
                        <button onClick={() => setVideoToEdit(video)} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#475569', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} title="Edit">✏️</button>
                        <button onClick={() => setVideoToDelete(video)} style={{ background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#f87171', fontSize: '1.1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} title="Delete">🗑️</button>
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

      {videoToDelete ? (
        <DashboardModal
          title="Delete video"
          confirmLabel="Delete"
          variant="danger"
          busy={deletingVideoId === videoToDelete._id}
          onCancel={() => setVideoToDelete(null)}
          onConfirm={handleDeleteVideo}
        >
          <p>Are you sure you want to delete this?</p>
        </DashboardModal>
      ) : null}

      {videoToEdit ? (
        <EditPlaceholderModal
          itemType="video"
          itemName={videoToEdit.title}
          openTo={`/watch/${videoToEdit._id}`}
          onClose={() => setVideoToEdit(null)}
        />
      ) : null}
    </div>
  )
}

export default HubVideos
