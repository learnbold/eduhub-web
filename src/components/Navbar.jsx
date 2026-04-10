import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { fetchCourses } from '../hooks/useQueries'
import './Navbar.css'

const CATEGORIES = ['Development', 'Design', 'Business', 'Marketing', 'Data Science', 'Programming', 'Medical']

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hub, isAuthenticated, isHubLoading, logout, user } = useAuth()
  const [isExploreOpen, setIsExploreOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const handleNavigateHome = async (e) => {
    if (e) e.preventDefault()
    await queryClient.prefetchQuery({
      queryKey: ['courses'],
      queryFn: fetchCourses,
    })
    navigate('/')
  }
  
  const displayName = user?.preferredName || user?.firstName || user?.name || user?.username
  const isTeacher = user?.role === 'teacher'
  const hubDashboardPath = hub?.slug ? `/hub/${hub.slug}/dashboard` : ''

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__left">
          <a className="navbar__brand" href="/" onClick={handleNavigateHome} aria-label="Sparklass home">
            <span className="navbar__brand-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#ffffff" stroke="none"/>
              </svg>
            </span>
            <span>Sparklass</span>
          </a>

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
                  <Link
                    to="/become-teacher"
                    className="navbar__cta"
                    state={{ from: location }}
                  >
                    Become a Teacher
                  </Link>
                )}
                <button type="button" className="navbar__logout" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <Link to="/login" className="navbar__login">Login</Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar
