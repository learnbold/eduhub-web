import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CourseCard from '../components/CourseCard'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import HubCard from '../components/HubCard'
import { mockContinueLearning, mockFeaturedCourses, mockHubs } from '../utils/mockCourses'
import './Home.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const skeletonCards = Array.from({ length: 8 }, (_, index) => index)

const CATEGORIES = ['All', 'Development', 'Design', 'Business', 'Marketing', 'Data Science', 'Programming', 'Medical']

function Home() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
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

  // If we have API courses, use them for featured (first 4). Otherwise fallback to mockFeaturedCourses.
  const featuredCourses = useMemo(() => {
    if (courses.length > 0) {
      return courses.slice(0, 4)
    }
    return mockFeaturedCourses.slice(0, 4) 
  }, [courses])

  return (
    <div className="home-dark-theme" id="top">
      <Navbar />

      <main className="home-page">
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="hero-section__inner">
            <div className="hero-copy">
              <h1 className="hero-title">Learn Without Limits</h1>
              <p className="hero-subtitle">
                Build skills with structured courses from top educators. Discover the tools you need to move your career forward.
              </p>
              
              <div className="hero-search-container">
                <input 
                  type="text" 
                  className="hero-search-input" 
                  placeholder="What do you want to learn today?" 
                />
                <button
                  type="button"
                  className="hero-btn btn-primary"
                  onClick={() =>
                    document.getElementById('popular-courses')?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  Explore
                </button>
              </div>
            </div>
            
            <div className="hero-visual" aria-hidden="true">
              <div className="hero-glow"></div>
              <div className="hero-floating-cards">
                {featuredCourses.slice(0, 2).map((course, idx) => (
                  <div key={course.id || idx} className={`hero-float-card hero-float-card--${idx + 1}`}>
                    <img src={course.thumbnail} alt="" className="hero-float-img" />
                    <div className="hero-float-info">
                      <strong>{course.title}</strong>
                      <span>{course.instructor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORY / TAGS STRIP */}
        <div className="categories-strip">
          <div className="categories-strip__inner">
            {CATEGORIES.map((cat, idx) => (
              <button 
                key={cat} 
                className={`category-chip ${idx === 0 ? 'active' : ''}`}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* CONTINUE LEARNING (IF LOGGED IN) */}
        {isAuthenticated && mockContinueLearning.length > 0 && (
          <section className="courses-section continue-learning-section">
            <div className="courses-section__header">
              <h2>Continue Learning</h2>
            </div>
            <div className="courses-grid__horizontal">
              {mockContinueLearning.map((course) => (
                <div key={course.id} className="course-card-wrapper horizontal">
                  <CourseCard
                    course={course}
                    isContinueLearning={true}
                    onClick={() => navigate(`/course/${course.slug || course.id}`, { state: { course } })}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FEATURED COURSES */}
        <section className="courses-section" id="featured-courses">
          <div className="courses-section__header">
            <h2>Featured Courses</h2>
          </div>
          <div className="courses-grid featured-grid">
            {featuredCourses.map((course) => (
              <CourseCard
                key={course.slug || course.id}
                course={course}
                onClick={() => navigate(`/course/${course.slug || course.id}`, { state: { course } })}
              />
            ))}
          </div>
        </section>

        {/* DISCOVER HUBS */}
        <section className="courses-section hubs-section" id="discover-hubs">
          <div className="courses-section__header">
            <h2>Discover Hubs</h2>
          </div>
          <div className="courses-grid__horizontal hubs-grid">
            {mockHubs.map((hub) => (
              <div key={hub.id} className="hub-card-wrapper">
                <HubCard hub={hub} />
              </div>
            ))}
          </div>
        </section>

        {/* ALL COURSES GRID */}
        <section className="courses-section" id="popular-courses">
          <div className="courses-section__header">
            <h2>All Courses</h2>
            <div className="courses-section__status">
              <span className="courses-pill">
                {courses.length ? `${courses.length} courses` : 'Browsing'}
              </span>
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
          ) : courses.length === 0 && featuredCourses.length === 0 ? (
            <section className="courses-empty">
              <svg viewBox="0 0 24 24" className="courses-empty-icon" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3>No courses available yet</h3>
              <p>Check back soon to explore new structured learning content.</p>
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
