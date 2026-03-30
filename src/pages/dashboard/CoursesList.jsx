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
  const [showArchived, setShowArchived] = useState(false)

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
            <p className="dashboard-section-kicker">Hub Courses</p>
            <h2>Courses published and drafted in {hub.name}</h2>
            <p>
              Every course is attached to this hub, which keeps ownership, activity, and branding
              aligned.
            </p>
          </div>

          <div className="dashboard-page__actions">
            <Link to={`${basePath}/courses/create`} className="dashboard-button">
              Create Course
            </Link>
            <button
              type="button"
              className="dashboard-button--ghost"
              onClick={() => setShowArchived((value) => !value)}
            >
              {showArchived ? 'Hide Archived' : 'Show Archived'}
            </button>
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
          {courses
            .filter((course) => (showArchived ? true : course.status !== 'archived'))
            .map((course) => (
            <article key={course._id} className="dashboard-course-card">
              <div className="dashboard-course-card__header">
                <div>
                  <h3>{course.title}</h3>
                  <p className="dashboard-muted">{course.description || 'No description yet.'}</p>
                </div>

                <div className="dashboard-pill-row">
                  <span className="dashboard-pill dashboard-pill--neutral">{course.category}</span>
                  {course.status === 'archived' ? (
                    <span className="dashboard-pill dashboard-pill--neutral">Archived</span>
                  ) : (
                    <span
                      className={
                        course.status === 'published' || course.isPublished
                          ? 'dashboard-pill dashboard-pill--success'
                          : 'dashboard-pill dashboard-pill--warning'
                      }
                    >
                      {course.status === 'published' || course.isPublished ? 'Published' : 'Draft'}
                    </span>
                  )}
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
                {course.publishedAt ? (
                  <div>
                    <span>Published</span>
                    <strong>{new Date(course.publishedAt).toLocaleDateString()}</strong>
                  </div>
                ) : null}
              </div>

              <div className="dashboard-inline-actions">
                <Link to={`${basePath}/courses/${course._id}`} state={{ course }} className="dashboard-button">
                  Open Course
                </Link>
                <Link
                  to={`${basePath}/videos/upload?courseId=${course._id}&type=course`}
                  state={{ course }}
                  className="dashboard-button--ghost"
                >
                  Add Lesson
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
