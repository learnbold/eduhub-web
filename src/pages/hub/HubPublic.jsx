import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Footer from '../../components/Footer'
import Navbar from '../../components/Navbar'
import {
  fetchPublicHub,
  fetchPublicHubCourses,
  fetchPublicHubStandaloneVideos,
  formatPrice,
} from '../../utils/dashboardApi'
import './HubPublic.css'

function HubPublic() {
  const navigate = useNavigate()
  const { slug = '' } = useParams()
  const [hub, setHub] = useState(null)
  const [courses, setCourses] = useState([])
  const [standaloneVideos, setStandaloneVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const loadHubPage = async () => {
      try {
        setLoading(true)
        setError('')

        const nextHub = await fetchPublicHub(slug, controller.signal)
        const [nextCourses, nextStandaloneVideos] = nextHub?._id
          ? await Promise.all([
              fetchPublicHubCourses(nextHub._id, controller.signal),
              fetchPublicHubStandaloneVideos(nextHub._id, controller.signal),
            ])
          : [[], []]

        if (controller.signal.aborted) {
          return
        }

        setHub(nextHub)
        setCourses(nextCourses)
        setStandaloneVideos(nextStandaloneVideos)
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setHub(null)
          setCourses([])
          setStandaloneVideos([])
          setError(loadError.message || 'Failed to load this public hub.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadHubPage()

    return () => controller.abort()
  }, [slug])

  const teacherRoster = useMemo(() => {
    if (!hub) {
      return []
    }

    const seen = new Set()
    const roster = [hub.ownerProfile, ...(hub.teachers || [])].filter(Boolean)

    return roster.filter((member) => {
      if (!member?._id || seen.has(member._id)) {
        return false
      }

      seen.add(member._id)
      return true
    })
  }, [hub])

  const pageStyle = hub
    ? {
        '--hub-primary': hub.primaryColor || '#0f172a',
        '--hub-secondary': hub.secondaryColor || '#f59e0b',
      }
    : undefined

  const ownerName = hub?.ownerProfile?.displayName || hub?.name || 'Teacher'

  return (
    <div className="hub-public-shell" style={pageStyle}>
      <Navbar />

      <main className="hub-public-page">
        {loading ? (
          <section className="hub-public-card">
            <p>Loading public hub...</p>
          </section>
        ) : error || !hub ? (
          <section className="hub-public-card hub-public-empty">
            <h1>Hub unavailable</h1>
            <p>{error || 'This hub could not be found.'}</p>
          </section>
        ) : (
          <>
            <section className="hub-public-hero">
              <div className="hub-public-hero__backdrop">
                {hub.banner ? <img src={hub.banner} alt={`${hub.name} banner`} /> : null}
              </div>

              <div className="hub-public-hero__content">
                <div className="hub-public-brand">
                  {hub.logo ? (
                    <img src={hub.logo} alt={`${hub.name} logo`} className="hub-public-brand__logo" />
                  ) : (
                    <div className="hub-public-brand__fallback">{hub.name?.slice(0, 1) || 'H'}</div>
                  )}

                  <div>
                    <p className="hub-public-kicker">Teacher Hub</p>
                    <h1>{hub.name}</h1>
                    <p>{hub.description || `${ownerName}'s personal teaching hub on EduHub.`}</p>
                  </div>
                </div>

                <div className="hub-public-actions">
                  <Link to="/" className="hub-public-link">
                    Explore All Courses
                  </Link>
                </div>
              </div>

              <div className="hub-public-meta">
                <div>
                  <span>Owner</span>
                  <strong>{ownerName}</strong>
                </div>
                <div>
                  <span>Courses</span>
                  <strong>{courses.length}</strong>
                </div>
                <div>
                  <span>Hub Updates</span>
                  <strong>{standaloneVideos.length}</strong>
                </div>
                <div>
                  <span>Teachers</span>
                  <strong>{teacherRoster.length}</strong>
                </div>
              </div>
            </section>

            <section className="hub-public-card">
              <div className="hub-public-section-head">
                <div>
                  <p className="hub-public-kicker">Courses</p>
                  <h2>Courses from this hub</h2>
                </div>
              </div>
            </section>

            {courses.length === 0 ? (
              <section className="hub-public-card hub-public-empty">
                <h3>No public courses yet</h3>
                <p>Courses from this hub will appear here once they are published.</p>
              </section>
            ) : (
              <section className="hub-public-grid">
                {courses.map((course) => (
                  <article key={course._id || course.slug} className="hub-public-course">
                    <div className="hub-public-course__header">
                      <div>
                        <h3>{course.title}</h3>
                        <p>{course.description || 'No description yet.'}</p>
                      </div>
                      <span className="hub-public-pill">{course.category}</span>
                    </div>

                    <p>{formatPrice(course)}</p>

                    <div className="hub-public-actions">
                      <button
                        type="button"
                        className="hub-public-link"
                        onClick={() =>
                          navigate(`/course/${course.slug}`, {
                            state: { course },
                          })
                        }
                      >
                        View Course
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <section className="hub-public-card">
              <div className="hub-public-section-head">
                <div>
                  <p className="hub-public-kicker">Free Content</p>
                  <h2>Hub updates and standalone videos</h2>
                </div>
              </div>
            </section>

            {standaloneVideos.length === 0 ? (
              <section className="hub-public-card hub-public-empty">
                <h3>No hub updates yet</h3>
                <p>Standalone free videos and announcements will appear here.</p>
              </section>
            ) : (
              <section className="hub-public-grid">
                {standaloneVideos.map((video) => (
                  <article key={video._id} className="hub-public-course">
                    <div className="hub-public-course__header">
                      <div>
                        <h3>{video.title}</h3>
                        <p>{video.description || 'Standalone hub update.'}</p>
                      </div>
                      <span className="hub-public-pill">Update</span>
                    </div>

                    <p>
                      {video.createdAt
                        ? new Date(video.createdAt).toLocaleDateString()
                        : 'Recently published'}
                    </p>
                  </article>
                ))}
              </section>
            )}

            <section className="hub-public-card">
              <div className="hub-public-section-head">
                <div>
                  <p className="hub-public-kicker">Teachers</p>
                  <h2>Meet the team behind this hub</h2>
                </div>
              </div>

              {teacherRoster.length === 0 ? (
                <div className="hub-public-empty">
                  <p>No teachers have been listed for this hub yet.</p>
                </div>
              ) : (
                <div className="hub-public-team">
                  {teacherRoster.map((member) => (
                    <article key={member._id} className="hub-public-member">
                      <strong>{member.displayName}</strong>
                      <p>{member.email || member.username || 'EduHub teacher'}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default HubPublic
