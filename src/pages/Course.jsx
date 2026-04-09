import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import CourseInfo from '../components/CourseInfo'
import EnrollCard from '../components/EnrollCard'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { fetchPublicCourseBySlug } from '../utils/dashboardApi'
import './Course.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const courseBadges = ['Self-paced access', 'Practical lessons', 'Premium learning path']

const getShortDescription = (description) => {
  if (!description) {
    return ''
  }

  const [firstSentence] = description.split(/(?<=[.!?])\s+/)
  return firstSentence || description
}

function CourseSkeleton() {
  return (
    <main className="course-page" aria-label="Loading course details">
      <section className="course-hero course-hero--loading">
        <div className="course-skeleton course-skeleton--badge" />
        <div className="course-skeleton course-skeleton--title" />
        <div className="course-skeleton course-skeleton--text" />
        <div className="course-skeleton course-skeleton--text course-skeleton--short" />
      </section>

      <section className="course-content">
        <div className="course-layout">
          <div className="course-main">
            <div className="course-skeleton-card course-skeleton-card--media" />
            <div className="course-skeleton-card course-skeleton-card--copy" />
            <div className="course-skeleton-card course-skeleton-card--copy" />
          </div>

          <aside className="course-sidebar">
            <div className="course-skeleton-card course-skeleton-card--sidebar" />
          </aside>
        </div>
      </section>
    </main>
  )
}

function Course() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = useAuth()
  const routeCourse = location.state?.course ?? null

  const [course, setCourse] = useState(() => routeCourse)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setCourse(routeCourse)

    const fetchCourse = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await fetchPublicCourseBySlug(slug, controller.signal)
        setCourse(data)
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setCourse(null)
          setError(fetchError.message || 'Failed to load course details. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchCourse()

    return () => controller.abort()
  }, [routeCourse, slug])

  const handleEnroll = async () => {
    if (!course || isEnrolling) {
      return
    }

    setEnrollError('')

    if (!course._id) {
      setEnrollError('Course ID is missing from the course details response.')
      return
    }

    if (!token) {
      setEnrollError('Login required to enroll in this course.')
      return
    }

    try {
      setIsEnrolling(true)

      const response = await fetch(`${API_BASE_URL}/enroll/${course._id}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 409) {
        navigate(`/course/${slug}/learn`)
        return
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Login required to enroll in this course.')
      }

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null)

        throw new Error(responseBody?.message || `Failed to enroll: ${response.status}`)
      }

      navigate(`/course/${slug}/learn`)
    } catch (enrollFailure) {
      setEnrollError(
        enrollFailure.message || 'Something went wrong while starting this course.'
      )
    } finally {
      setIsEnrolling(false)
    }
  }

  return (
    <div className="course-shell" id="top">
      <Navbar />

      {loading && !course ? (
        <CourseSkeleton />
      ) : !course ? (
        <main className="course-page">
          <section className="course-error-state">
            <h1>{error || 'Course unavailable'}</h1>
            <p>
              We could not load this course from the backend right now. Please go back and try
              again.
            </p>
            <button
              type="button"
              className="course-error-state__button"
              onClick={() => navigate('/')}
            >
              Back to Courses
            </button>
          </section>
        </main>
      ) : (
        <main className="course-page">
          <section className="course-hero">
            <div className="course-hero__content">
              <div className="course-hero__copy">
                <span className="course-hero__badge">{course.category}</span>
                <h1>{course.title}</h1>
                <p className="course-hero__summary">{getShortDescription(course.description)}</p>

                <div className="course-hero__chips" aria-label="Course highlights">
                  {courseBadges.map((badge) => (
                    <span key={badge} className="course-hero__chip">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>

              <div className="course-hero__panel" aria-hidden="true">
                <div className="course-hero__panel-card">
                  <span>Premium path</span>
                  <strong>{course.isFree ? 'Zero-cost access' : 'Structured paid cohort'}</strong>
                </div>
                <div className="course-hero__panel-card course-hero__panel-card--accent">
                  <span>Focused outcome</span>
                  <strong>Turn theory into deliberate, job-ready execution</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="course-content">
            {error ? <p className="course-alert">{error}</p> : null}

            <div className="course-layout">
              <div className="course-main">
                <CourseInfo course={course} />
              </div>

              <aside className="course-sidebar">
                <EnrollCard
                  course={course}
                  isEnrolling={isEnrolling}
                  enrollError={enrollError}
                  onEnroll={handleEnroll}
                />
              </aside>
            </div>
          </section>
        </main>
      )}

      <Footer />
    </div>
  )
}

export default Course
