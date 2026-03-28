import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import CourseInfo from '../components/CourseInfo'
import EnrollCard from '../components/EnrollCard'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import './Course.css'

const API_BASE_URL = 'http://localhost:5000'

const fakeCourse = {
  title: 'Designing Premium Learning Experiences',
  description:
    'Build a polished learning product with a clear content structure, thoughtful design decisions, and a learner journey that feels motivating from the first click. This preview course is here so the page still feels complete even when your live API is unavailable.',
  thumbnail:
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
  category: 'Product Design',
  price: 999,
  isFree: false,
  courseId: 'preview-premium-learning',
}

const courseBadges = ['Self-paced access', 'Practical lessons', 'Premium learning path']

const createTitleFromSlug = (slug) =>
  slug
    ?.split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')

const createPreviewCourse = (slug, seed = {}) => ({
  ...fakeCourse,
  ...seed,
  slug,
  title: seed.title || createTitleFromSlug(slug) || fakeCourse.title,
  description: seed.description || fakeCourse.description,
  thumbnail: seed.thumbnail || fakeCourse.thumbnail,
  category: seed.category || fakeCourse.category,
  price: seed.price ?? fakeCourse.price,
  isFree: seed.isFree ?? fakeCourse.isFree,
  courseId:
    seed.courseId ||
    seed.id ||
    seed._id ||
    `preview-${slug || fakeCourse.courseId}`,
})

const normalizeCourse = (data, slug) => {
  if (!data) {
    return null
  }

  return {
    ...createPreviewCourse(slug, data),
    courseId: data.courseId || data.id || data._id || null,
  }
}

const getShortDescription = (description) => {
  if (!description) {
    return fakeCourse.description
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

  const [course, setCourse] = useState(() => normalizeCourse(routeCourse, slug))
  const [loading, setLoading] = useState(() => !normalizeCourse(routeCourse, slug))
  const [error, setError] = useState('')
  const [isPreviewCourse, setIsPreviewCourse] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const seededCourse = normalizeCourse(routeCourse, slug)

    const fetchCourse = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${API_BASE_URL}/courses/${slug}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch course: ${response.status}`)
        }

        const data = await response.json()
        setCourse(normalizeCourse(data, slug))
        setIsPreviewCourse(false)
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          console.error('Error fetching course details:', fetchError)
          setCourse(seededCourse || createPreviewCourse(slug))
          setIsPreviewCourse(true)
          setError('Live details are unavailable right now, so you are seeing a preview version.')
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

    if (isPreviewCourse) {
      navigate(`/player/${course.courseId || `preview-${slug}`}`)
      return
    }

    const courseId = course.courseId

    if (!courseId) {
      const message =
        'Enrollment is waiting on a course ID from the course details API response.'

      console.error(message)
      setEnrollError(message)
      return
    }

    try {
      setIsEnrolling(true)

      const headers = token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined

      const response = await fetch(`${API_BASE_URL}/enroll/${courseId}`, {
        method: 'POST',
        credentials: 'include',
        headers,
      })

      if (response.status === 409) {
        navigate(`/player/${courseId}`)
        return
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Enrollment requires authentication on the current backend.')
      }

      if (!response.ok) {
        const responseBody = await response.json().catch(() => null)

        throw new Error(responseBody?.message || `Failed to enroll: ${response.status}`)
      }

      navigate(`/player/${courseId}`)
    } catch (enrollFailure) {
      console.error('Error enrolling in course:', enrollFailure)
      setEnrollError(
        enrollFailure.message || 'Something went wrong while starting this course.'
      )
    } finally {
      setIsEnrolling(false)
    }
  }

  const activeCourse = course || createPreviewCourse(slug)

  return (
    <div className="course-shell" id="top">
      <Navbar />

      {loading && !course ? (
        <CourseSkeleton />
      ) : (
        <main className="course-page">
          <section className="course-hero">
            <div className="course-hero__content">
              <div className="course-hero__copy">
                <span className="course-hero__badge">{activeCourse.category}</span>
                <h1>{activeCourse.title}</h1>
                <p className="course-hero__summary">
                  {getShortDescription(activeCourse.description)}
                </p>

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
                  <strong>{activeCourse.isFree ? 'Zero-cost access' : 'Structured paid cohort'}</strong>
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
                <CourseInfo course={activeCourse} isPreviewCourse={isPreviewCourse} />
              </div>

              <aside className="course-sidebar">
                <EnrollCard
                  course={activeCourse}
                  isPreviewCourse={isPreviewCourse}
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
