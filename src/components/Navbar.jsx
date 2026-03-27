import './Navbar.css'

function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <a className="navbar__brand" href="#top" aria-label="EduHub home">
          <span className="navbar__brand-mark">E</span>
          <span>EduHub</span>
        </a>

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
          <a href="#top">Home</a>
          <a href="#popular-courses">Explore</a>
          <a href="#popular-courses">My Courses</a>
        </nav>

        <button type="button" className="navbar__login">
          Login
        </button>
      </div>
    </header>
  )
}

export default Navbar
