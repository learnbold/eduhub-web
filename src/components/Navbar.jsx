import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, logout, user } = useAuth()
  const exploreHref = location.pathname === '/' ? '#popular-courses' : '/#popular-courses'

  const handleLogout = () => {
    logout()
    navigate('/')
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
                {user?.name ? `Hi, ${user.name}` : 'Signed in'}
              </span>
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
    </header>
  )
}

export default Navbar
