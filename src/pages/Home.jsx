import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CourseCard from '../components/CourseCard'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import './Home.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const skeletonCards = Array.from({ length: 6 }, (_, index) => index)

function Home() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const fetchCourses = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${API_BASE_URL}/courses`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to load courses.')
        }

        const data = await response.json()
        const nextCourses = Array.isArray(data) ? data : Array.isArray(data.courses) ? data.courses : []

        setCourses(nextCourses)
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setCourses([])
          setError('Failed to load courses. Please try again.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchCourses()

    return () => controller.abort()
  }, [])

  return (
    <div className="home-shell" id="top">
      <Navbar />

      <main className="home-page">
        <section className="hero-section">
          <div className="hero-section__content">
            <div className="hero-copy">
              <p className="section-kicker">Premium Learning Platform</p>
              <h1>Learn Without Limits</h1>
              <p className="hero-copy__text">
                Explore high-quality courses from top educators and build skills
                that move your career, business, and creativity forward.
              </p>

              <div className="hero-copy__actions">
                <button
                  type="button"
                  className="hero-button hero-button--primary"
                  onClick={() =>
                    document.getElementById('popular-courses')?.scrollIntoView({
                      behavior: 'smooth',
                    })
                  }
                >
                  Explore Courses
                </button>
                <span className="hero-copy__meta">20k+ learners this month</span>
              </div>
            </div>

            <div className="hero-panel" aria-hidden="true">
              <div className="hero-panel__card hero-panel__card--featured">
                <p>Top Rated</p>
                <strong>Front-end Engineering</strong>
                <span>4.9 average score</span>
              </div>
              <div className="hero-panel__card">
                <p>Trending</p>
                <strong>AI Productivity</strong>
                <span>New cohort starting soon</span>
              </div>
              <div className="hero-panel__stats">
                <div>
                  <strong>120+</strong>
                  <span>Expert instructors</span>
                </div>
                <div>
                  <strong>350+</strong>
                  <span>Curated lessons</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="courses-section" id="popular-courses">
          <div className="courses-section__header">
            <div>
              <p className="section-kicker">Discover</p>
              <h2>Popular Courses</h2>
            </div>

            <div className="courses-section__status">
              <span className="courses-pill">{courses.length} live courses</span>
            </div>
          </div>

          {error ? <p className="courses-alert">{error}</p> : null}

          {loading ? (
            <div className="courses-grid" aria-label="Loading courses">
              {skeletonCards.map((card) => (
                <div key={card} className="course-skeleton">
                  <div className="course-skeleton__media" />
                  <div className="course-skeleton__line course-skeleton__line--short" />
                  <div className="course-skeleton__line" />
                  <div className="course-skeleton__line course-skeleton__line--tiny" />
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <section className="courses-empty">
              <h3>No courses available</h3>
              <p>Courses will appear here once they are published by the backend.</p>
            </section>
          ) : (
            <div className="courses-grid">
              {courses.map((course) => (
                <CourseCard
                  key={course.slug}
                  course={course}
                  onClick={() => navigate(`/course/${course.slug}`, { state: { course } })}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Home
