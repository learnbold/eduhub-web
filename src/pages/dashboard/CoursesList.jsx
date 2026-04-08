import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchManagedHubCourses, formatPrice } from '../../utils/dashboardApi'

function CoursesList() {
  const { token } = useAuth()
  const { hub } = useOutletContext()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadCourses = async () => {
      try {
        setLoading(true)
        setError('')
        const nextCourses = await fetchManagedHubCourses(token, hub._id, controller.signal)

        if (!controller.signal.aborted) {
          setCourses(nextCourses)
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Failed to load your hub courses.')
          setCourses([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadCourses()

    return () => controller.abort()
  }, [hub?._id, token])

  const basePath = `/hub/${hub.slug}/dashboard`

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Reusable Courses</p>
            <h2>Secondary course products inside {hub.name}</h2>
            <p>
              Courses still support modules and lessons, but they now act as reusable content blocks
              that can be packaged into one or more batches.
            </p>
          </div>

          <div className="dashboard-page__actions">
            <Link to={`${basePath}/courses/create`} className="dashboard-button">
              Create Course
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}

      {loading ? (
        <section className="dashboard-panel">
          <p className="dashboard-muted">Loading hub courses...</p>
        </section>
      ) : courses.length === 0 ? (
        <section className="dashboard-empty">
          <h2>No courses yet</h2>
          <p>Create the first course for this hub to begin building its catalog.</p>
          <div className="dashboard-access__actions">
            <Link to={`${basePath}/courses/create`} className="dashboard-button">
              Create First Course
            </Link>
          </div>
        </section>
      ) : (
        <section className="dashboard-grid dashboard-grid--courses">
          {courses.map((course) => (
            <article key={course._id} className="dashboard-course-card">
              <div className="dashboard-course-card__header">
                <div>
                  <h3>{course.title}</h3>
                  <p className="dashboard-muted">{course.description || 'No description yet.'}</p>
                </div>

                <div className="dashboard-pill-row">
                  <span className="dashboard-pill dashboard-pill--neutral">{course.category}</span>
                  <span
                    className={
                      course.isPublished
                        ? 'dashboard-pill dashboard-pill--success'
                        : 'dashboard-pill dashboard-pill--warning'
                    }
                  >
                    {course.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>

              <div className="dashboard-course-card__meta">
                <div>
                  <span>Price</span>
                  <strong>{formatPrice(course)}</strong>
                </div>
                <div>
                  <span>Level</span>
                  <strong>{course.level}</strong>
                </div>
                <div>
                  <span>Created</span>
                  <strong>
                    {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'Recently'}
                  </strong>
                </div>
                <div>
                  <span>Batches</span>
                  <strong>{course.batchCount || 0}</strong>
                </div>
              </div>

              {course.batchSummaries?.length ? (
                <div className="dashboard-pill-row">
                  {course.batchSummaries.map((batch) => (
                    <span key={batch._id} className="dashboard-pill dashboard-pill--neutral">
                      {batch.title}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="dashboard-inline-actions">
                <Link to={`${basePath}/courses/${course._id}`} state={{ course }} className="dashboard-button">
                  Open Course
                </Link>
                <Link
                  to={`${basePath}/videos/upload?courseId=${course._id}&type=course`}
                  state={{ course }}
                  className="dashboard-button--ghost"
                >
                  Add Video
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

export default CoursesList
