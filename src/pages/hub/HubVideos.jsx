import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { DashboardCard, DashboardModal, EditPlaceholderModal } from '../../components/dashboard/DashboardCards'
import { useAuth } from '../../context/AuthContext'
import { deleteVideo, fetchManagedHubVideos } from '../../utils/dashboardApi'

function HubVideos() {
  const navigate = useNavigate()
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

  const renderVideoGrid = (items, emptyTitle, emptyBody) => {
    if (items.length === 0) {
      return (
        <div className="dashboard-empty">
          <h3>{emptyTitle}</h3>
          <p>{emptyBody}</p>
        </div>
      )
    }

    return (
      <div className="dashboard-grid dashboard-grid--cards">
        {items.map((video) => (
          <DashboardCard
            key={video._id}
            title={video.title}
            description={video.description || (video.videoType === 'standalone' ? 'Hub update video.' : 'Course lesson video.')}
            thumbnail={video.thumbnailUrl || video.thumbnail}
            eyebrow={video.videoType === 'standalone' ? 'Standalone' : 'Course video'}
            onOpen={() => navigate(`/watch/${video._id}`)}
            onEdit={() => setVideoToEdit(video)}
            onDelete={() => setVideoToDelete(video)}
            badges={[
              <span
                key="status"
                className={
                  video.status === 'ready'
                    ? 'dashboard-pill dashboard-pill--success'
                    : 'dashboard-pill dashboard-pill--warning'
                }
              >
                {video.status}
              </span>,
            ]}
            meta={[
              { label: 'Views', value: video.viewsCount || 0 },
              { label: 'Comments', value: video.commentsCount || 0 },
              { label: 'Status', value: video.status },
            ]}
          >
            {video.course?.title ? (
              <p className="dashboard-muted">Course: {video.course.title}</p>
            ) : null}

            {video.batchSummaries?.length ? (
              <div className="dashboard-pill-row">
                {video.batchSummaries.map((batch) => (
                  <span key={batch._id} className="dashboard-pill dashboard-pill--neutral">
                    {batch.title}
                  </span>
                ))}
              </div>
            ) : null}
          </DashboardCard>
        ))}
      </div>
    )
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

            {renderVideoGrid(
              standaloneVideos,
              'No standalone updates yet',
              'Standalone videos are ideal for announcements, free lessons, and creator updates.'
            )}
          </section>

          <section className="dashboard-card-section">
            <div className="dashboard-page__header">
              <div>
                <p className="dashboard-section-kicker">Course Library</p>
                <h3>Course-attached videos</h3>
              </div>
            </div>

            {renderVideoGrid(
              courseVideos,
              'No course videos yet',
              'Course lessons will appear here once your team starts uploading them.'
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
