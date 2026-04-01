import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <p>&copy; 2026 Sparklass</p>
        <nav className="footer__links" aria-label="Footer links">
          <a href="#top">About</a>
          <a href="#top">Contact</a>
          <a href="#top">Privacy</a>
        </nav>
      </div>
    </footer>
  )
}

export default Footer
