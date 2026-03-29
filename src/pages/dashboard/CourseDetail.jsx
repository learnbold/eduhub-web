import { useEffect, useState } from 'react'
import { Link, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  fetchManagedCourseById,
  fetchManagedCourseVideos,
  formatPrice,
} from '../../utils/dashboardApi'

function CourseDetail() {
  const { id = '' } = useParams()
  const location = useLocation()
  const { token } = useAuth()
  const { hub } = useOutletContext()
  const routeCourse = location.state?.course || null

  const [course, setCourse] = useState(routeCourse)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadPage = async () => {
      try {
        setLoading(true)
        setError('')

        const [nextCourse, nextVideos] = await Promise.all([
          fetchManagedCourseById(token, id, controller.signal),
          fetchManagedCourseVideos(token, id, controller.signal),
        ])

        if (controller.signal.aborted) {
          return
        }

        setCourse(nextCourse)
        setVideos(nextVideos)
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setCourse(null)
          setVideos([])
          setError(loadError.message || 'Failed to load course details.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadPage()

    return () => controller.abort()
  }, [hub?._id, id, token])

  const basePath = `/hub/${hub.slug}/dashboard`

  if (loading && !course) {
    return (
      <section className="dashboard-panel">
        <p className="dashboard-muted">Loading course workspace...</p>
      </section>
    )
  }

  if (!course) {
    return (
      <section className="dashboard-empty">
        <h2>Course unavailable</h2>
        <p>{error || 'This course could not be loaded from your hub.'}</p>
        <div className="dashboard-access__actions">
          <Link to={`${basePath}/courses`} className="dashboard-button">
            Back to Courses
          </Link>
        </div>
      </section>
    )
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Course Detail</p>
            <h2>{course.title}</h2>
            <p>{course.description || 'Add a richer description as you continue shaping this course.'}</p>
          </div>

          <div className="dashboard-page__actions">
            <Link
              to={`${basePath}/videos/upload?courseId=${course._id}&type=course`}
              state={{ course }}
              className="dashboard-button"
            >
              Add Video
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}

      <section className="dashboard-hero">
        <article className="dashboard-panel">
          <div className="dashboard-detail-grid">
            <div>
              <span>Hub</span>
              <strong>{hub.name}</strong>
            </div>
            <div>
              <span>Category</span>
              <strong>{course.category || 'Uncategorized'}</strong>
            </div>
            <div>
              <span>Price</span>
              <strong>{formatPrice(course)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{course.isPublished ? 'Published' : 'Draft'}</strong>
            </div>
          </div>

          <div className="dashboard-inline-actions">
            <Link to={`${basePath}/courses`} className="dashboard-link-button">
              Back to Courses
            </Link>
            <Link
              to={`${basePath}/videos/upload?courseId=${course._id}&type=course`}
              state={{ course }}
              className="dashboard-link-button"
            >
              Upload Another Video
            </Link>
          </div>
        </article>

        <article className="dashboard-panel dashboard-hero__panel">
          {course.thumbnail ? (
            <div className="dashboard-cover">
              <img src={course.thumbnail} alt={`${course.title} thumbnail`} />
            </div>
          ) : (
            <div className="dashboard-cover" />
          )}
        </article>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Course Videos</p>
            <h2>Videos attached to this course</h2>
            <p>Every lesson here belongs to both the course and the parent hub.</p>
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="dashboard-empty">
            <h3>No videos yet</h3>
            <p>Upload the first lesson to begin filling out this hub course.</p>
          </div>
        ) : (
          <div className="dashboard-grid dashboard-grid--videos">
            {videos.map((video) => (
              <article key={video._id || `${video.order}-${video.title}`} className="dashboard-video-card">
                <div className="dashboard-video-card__header">
                  <div>
                    <h3>{video.title}</h3>
                    <p className="dashboard-muted">
                      {video.description || 'Lesson attached to this course.'}
                    </p>
                  </div>
                  <span
                    className={
                      video.status === 'ready'
                        ? 'dashboard-pill dashboard-pill--success'
                        : 'dashboard-pill dashboard-pill--warning'
                    }
                  >
                    {video.status}
                  </span>
                </div>

                <div className="dashboard-video-card__meta">
                  <div>
                    <span>Lesson Order</span>
                    <strong>{video.order}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{video.status}</strong>
                  </div>
                  <div>
                    <span>Duration</span>
                    <strong>{video.duration ? `${video.duration}s` : 'Pending'}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default CourseDetail
