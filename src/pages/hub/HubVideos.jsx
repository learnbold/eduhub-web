import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchManagedHubVideos } from '../../utils/dashboardApi'

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

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Videos</p>
            <h2>Manage all hub videos</h2>
            <p>
              Course lessons and standalone hub updates live together here so the content team can
              manage the full video surface of the hub.
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
              <div className="dashboard-grid dashboard-grid--videos">
                {standaloneVideos.map((video) => (
                  <article key={video._id} className="dashboard-video-card">
                    <div className="dashboard-video-card__header">
                      <div>
                        <h3>{video.title}</h3>
                        <p className="dashboard-muted">{video.description || 'Hub update video.'}</p>
                      </div>
                      <span className="dashboard-pill dashboard-pill--neutral">Standalone</span>
                    </div>
                    <div className="dashboard-video-card__meta">
                      <div>
                        <span>Status</span>
                        <strong>{video.status}</strong>
                      </div>
                      <div>
                        <span>Published To</span>
                        <strong>Public Hub Feed</strong>
                      </div>
                      <div>
                        <span>Created</span>
                        <strong>
                          {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Recently'}
                        </strong>
                      </div>
                    </div>
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
              <div className="dashboard-grid dashboard-grid--videos">
                {courseVideos.map((video) => (
                  <article key={video._id} className="dashboard-video-card">
                    <div className="dashboard-video-card__header">
                      <div>
                        <h3>{video.title}</h3>
                        <p className="dashboard-muted">{video.description || 'Course lesson video.'}</p>
                      </div>
                      <span className="dashboard-pill dashboard-pill--warning">Course</span>
                    </div>
                    <div className="dashboard-video-card__meta">
                      <div>
                        <span>Course</span>
                        <strong>{video.courseId?.title || 'Attached course'}</strong>
                      </div>
                      <div>
                        <span>Status</span>
                        <strong>{video.status}</strong>
                      </div>
                      <div>
                        <span>Lesson Order</span>
                        <strong>{video.order || 'Pending'}</strong>
                      </div>
                    </div>
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
