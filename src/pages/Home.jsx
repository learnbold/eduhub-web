import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CourseCard from '../components/CourseCard'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import './Home.css'

const API_BASE_URL = 'http://localhost:5000'

const fakeCourses = [
  {
    title: 'Mastering React for Modern Web Apps',
    slug: 'mastering-react-for-modern-web-apps',
    courseId: 'preview-react-modern-apps',
    category: 'Development',
    price: 59.99,
    isFree: false,
    thumbnail:
      'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'UI Design Systems from Scratch',
    slug: 'ui-design-systems-from-scratch',
    courseId: 'preview-design-systems',
    category: 'Design',
    price: 0,
    isFree: true,
    thumbnail:
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Digital Marketing Growth Playbook',
    slug: 'digital-marketing-growth-playbook',
    courseId: 'preview-marketing-growth',
    category: 'Marketing',
    price: 44.99,
    isFree: false,
    thumbnail:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Python for Data Analysis Bootcamp',
    slug: 'python-for-data-analysis-bootcamp',
    courseId: 'preview-python-data',
    category: 'Data',
    price: 69.99,
    isFree: false,
    thumbnail:
      'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Foundations of Product Management',
    slug: 'foundations-of-product-management',
    courseId: 'preview-product-foundations',
    category: 'Business',
    price: 0,
    isFree: true,
    thumbnail:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Motion Graphics for Storytelling',
    slug: 'motion-graphics-for-storytelling',
    courseId: 'preview-motion-storytelling',
    category: 'Creative',
    price: 39.99,
    isFree: false,
    thumbnail:
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=900&q=80',
  },
]

const skeletonCards = Array.from({ length: 6 }, (_, index) => index)

function Home() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    const fetchCourses = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_BASE_URL}/courses`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch courses: ${response.status}`)
        }

        const data = await response.json()
        setCourses(Array.isArray(data.courses) ? data.courses : [])
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.log('Error fetching courses:', error)
          setCourses([])
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

  const displayCourses = courses.length ? courses : fakeCourses
  const showingPreviewCourses = !loading && courses.length === 0

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
              {showingPreviewCourses ? (
                <span className="courses-pill">Previewing sample courses</span>
              ) : (
                <span className="courses-pill">{courses.length} live courses</span>
              )}
            </div>
          </div>

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
          ) : (
            <div className="courses-grid">
              {displayCourses.map((course) => (
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
