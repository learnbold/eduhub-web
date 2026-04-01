import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

const CATEGORIES = ['Development', 'Design', 'Business', 'Marketing', 'Data Science', 'Programming', 'Medical']

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { becomeTeacher, hub, isAuthenticated, isHubLoading, logout, user } = useAuth()
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isExploreOpen, setIsExploreOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const [feedback, setFeedback] = useState({
    type: '',
    message: '',
  })
  
  const displayName = user?.preferredName || user?.firstName || user?.name || user?.username
  const isTeacher = user?.role === 'teacher'
  const hubDashboardPath = hub?.slug ? `/hub/${hub.slug}/dashboard` : ''

  const handleLogout = () => {
    setFeedback({ type: '', message: '' })
    logout()
    navigate('/')
  }

  const handleBecomeTeacher = async () => {
    if (isUpgrading) return
    setFeedback({ type: '', message: '' })

    try {
      setIsUpgrading(true)
      const response = await becomeTeacher()
      const nextHubSlug = response?.hub?.slug

      setFeedback({ type: 'success', message: response.message || 'You are now a teacher.' })

      if (nextHubSlug) {
        setTimeout(() => navigate(`/hub/${nextHubSlug}/dashboard`), 450)
      }
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Failed to become a teacher.' })
    } finally {
      setIsUpgrading(false)
    }
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__left">
          <Link className="navbar__brand" to="/" aria-label="Sparklass home">
            <span className="navbar__brand-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#ffffff" stroke="none"/>
              </svg>
            </span>
            <span>Sparklass</span>
          </Link>

          <div className="navbar__explore desktop-only" onMouseLeave={() => setIsExploreOpen(false)}>
            <button 
              className="navbar__explore-btn"
              onMouseEnter={() => setIsExploreOpen(true)}
              onClick={() => setIsExploreOpen(!isExploreOpen)}
            >
              Explore
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {isExploreOpen && (
              <div className="explore-dropdown">
                <div className="explore-dropdown__section">
                  <strong>Top Categories</strong>
                  <ul>
                    {CATEGORIES.map(cat => (
                      <li key={cat}>
                        <a href="#popular-courses" onClick={() => setIsExploreOpen(false)}>{cat}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        <button 
          className="navbar__mobile-toggle mobile-only" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isMobileMenuOpen ? (
              <><path d="M18 6L6 18"/><path d="M6 6l12 12"/></>
            ) : (
              <><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></>
            )}
          </svg>
        </button>

        <div className={`navbar__collapse ${isMobileMenuOpen ? 'is-open' : ''}`}>
          <label className="navbar__search desktop-only" aria-label="Search courses">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10.5 4a6.5 6.5 0 1 0 4.06 11.58l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" fill="currentColor"/>
            </svg>
            <input type="text" placeholder="Search for design, code, marketing..." />
          </label>

          <div className="navbar__auth">
            {isAuthenticated ? (
              <>
                <span className="navbar__auth-text">
                  {displayName ? `Hi, ${displayName}` : 'Signed in'}
                </span>
                {isTeacher ? (
                  hubDashboardPath ? (
                    <Link to={hubDashboardPath} className="navbar__cta">Your Hub</Link>
                  ) : (
                    <button type="button" className="navbar__cta" disabled>
                      {isHubLoading ? 'Loading Hub...' : 'Your Hub'}
                    </button>
                  )
                ) : (
                  <button type="button" className="navbar__cta" onClick={handleBecomeTeacher} disabled={isUpgrading}>
                    {isUpgrading ? 'Upgrading...' : 'Become a Teacher'}
                  </button>
                )}
                <button type="button" className="navbar__logout" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <Link to="/login" className="navbar__login">Login</Link>
            )}
          </div>
        </div>
      </div>

      {feedback.message && (
        <div className={`navbar__feedback ${feedback.type === 'error' ? 'navbar__feedback--error' : ''}`} role="status" aria-live="polite">
          {feedback.message}
        </div>
      )}
    </header>
  )
}

export default Navbar
