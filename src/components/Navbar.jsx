import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { becomeTeacher, hub, isAuthenticated, isHubLoading, logout, user } = useAuth()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [feedback, setFeedback] = useState({
    type: '',
    message: '',
  })
  const exploreHref = location.pathname === '/' ? '#popular-courses' : '/#popular-courses'
  const displayName = user?.preferredName || user?.firstName || user?.name || user?.username
  const isTeacher = user?.role === 'teacher'
  const hubDashboardPath = hub?.slug ? `/hub/${hub.slug}/dashboard` : ''

  const handleLogout = () => {
    setFeedback({
      type: '',
      message: '',
    })
    logout()
    navigate('/')
  }

  const handleBecomeTeacher = async () => {
    if (isUpgrading) {
      return
    }

    setFeedback({
      type: '',
      message: '',
    })

    try {
      setIsUpgrading(true)
      const response = await becomeTeacher()
      const nextHubSlug = response?.hub?.slug

      setFeedback({
        type: 'success',
        message: response.message || 'You are now a teacher.',
      })

      if (nextHubSlug) {
        setTimeout(() => {
          navigate(`/hub/${nextHubSlug}/dashboard`)
        }, 450)
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Failed to become a teacher.',
      })
    } finally {
      setIsUpgrading(false)
    }
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link className="navbar__brand" to="/" aria-label="EduHub home">
          <span className="navbar__brand-mark">E</span>
          <span>EduHub</span>
        </Link>

        <label className="navbar__search" aria-label="Search courses">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M10.5 4a6.5 6.5 0 1 0 4.06 11.58l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
              fill="currentColor"
            />
          </svg>
          <input type="text" placeholder="Search for design, code, marketing..." />
        </label>

        <nav className="navbar__links" aria-label="Primary navigation">
          <Link to="/">Home</Link>
          <a href={exploreHref}>Explore</a>
          <Link to="/">My Courses</Link>
        </nav>

        <div className="navbar__auth">
          {isAuthenticated ? (
            <>
              <span className="navbar__auth-text">
                {displayName ? `Hi, ${displayName}` : 'Signed in'}
              </span>
              {isTeacher ? (
                hubDashboardPath ? (
                  <Link to={hubDashboardPath} className="navbar__cta">
                    Your Hub
                  </Link>
                ) : (
                  <button type="button" className="navbar__cta" disabled>
                    {isHubLoading ? 'Loading Hub...' : 'Your Hub'}
                  </button>
                )
              ) : (
                <button
                  type="button"
                  className="navbar__cta"
                  onClick={handleBecomeTeacher}
                  disabled={isUpgrading}
                >
                  {isUpgrading ? 'Upgrading...' : 'Become a Teacher'}
                </button>
              )}
              <button type="button" className="navbar__logout" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="navbar__login">
              Login
            </Link>
          )}
        </div>
      </div>

      {feedback.message ? (
        <div
          className={
            feedback.type === 'error' ? 'navbar__feedback navbar__feedback--error' : 'navbar__feedback'
          }
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </div>
      ) : null}
    </header>
  )
}

export default Navbar
