import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useGlobalVideos } from '../hooks/useQueries'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import VideoCard from '../components/VideoCard'
import './Home.css'

const skeletonCards = Array.from({ length: 8 }, (_, index) => index)

const CATEGORIES = ['All', 'Development', 'Design', 'Business', 'Marketing', 'Data Science', 'Programming', 'Medical']

function Home() {
  const navigate = useNavigate()
  
  const [page, setPage] = React.useState(1)
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(false)
  const toggleSidebar = () => setIsSidebarExpanded((prev) => !prev)

  const { data: videos = [], isLoading: videosLoading, isFetching: videosFetching, error: videosFetchError } = useGlobalVideos(page)
  const videosError = videosFetchError?.message || ''

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
                Build skills with structured courses from top educators. Discover the tools you need to move your career forward on Sparklass.
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
                    document.getElementById('global-videos')?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  Explore
                </button>
              </div>
            </div>
            
            <div className="hero-visual" aria-hidden="true">
              <div className="hero-glow"></div>
              <div className="brand-ecosystem">
                {/* Center Brand Logo/Text */}
                <div className="brand-center">
                  <span className="brand-mark">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#ffffff" stroke="none" />
                    </svg>
                  </span>
                </div>
                
                {/* Floating Elements Around */}
                <div className="float-element float-element--1 glass-panel">
                  <div className="mock-video-player">
                    <div className="mock-video-play-button"></div>
                    <div className="mock-video-progress"></div>
                  </div>
                </div>
                
                <div className="float-element float-element--2 glass-panel">
                  <div className="mock-lesson-list">
                    <div className="mock-lesson-item active"></div>
                    <div className="mock-lesson-item"></div>
                    <div className="mock-lesson-item"></div>
                    <div className="mock-lesson-item"></div>
                  </div>
                </div>
                
                <div className="float-element float-element--3 glass-panel">
                  <div className="mock-course-card">
                    <div className="mock-course-img"></div>
                    <div className="mock-course-text"></div>
                    <div className="mock-course-text short"></div>
                  </div>
                </div>
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

        {/* MAIN LAYOUT: SIDEBAR + FEED */}
        <div className="home-main-layout">
          <aside className={`home-sidebar ${isSidebarExpanded ? 'expanded' : 'collapsed'}`}>
            <button className="sidebar-toggle-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
              <svg viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            <div className="sidebar-menu">
              <div className="sidebar-item active">
                <svg viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                <span className="sidebar-text">Home</span>
              </div>
              <div className="sidebar-item">
                <svg viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
                  <polyline points="17 2 12 7 7 2"></polyline>
                </svg>
                <span className="sidebar-text">Subscriptions</span>
              </div>
              <div className="sidebar-item">
                <svg viewBox="0 0 24 24" fill="none" width="24" height="24" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span className="sidebar-text">You</span>
              </div>
            </div>
          </aside>

          <section className="courses-section" id="global-videos">
            <div className="courses-section__header">
            <h2>Latest Videos</h2>
            <div className="courses-section__status">
              <span className="courses-pill">
                {videos.length ? `${videos.length} videos` : 'Global feed'}
              </span>
            </div>
          </div>

          {videosError ? <p className="courses-alert">{videosError}</p> : null}

          {videosLoading ? (
            <div className="yt-grid" aria-label="Loading videos">
              {skeletonCards.map((card) => (
                <div key={card} className="course-skeleton">
                  <div className="course-skeleton__media" />
                  <div className="course-skeleton__line course-skeleton__line--short" />
                  <div className="course-skeleton__line" />
                  <div className="course-skeleton__line course-skeleton__line--tiny" />
                </div>
              ))}
            </div>
          ) : videos.length === 0 ? (
            <section className="courses-empty">
              <svg viewBox="0 0 24 24" className="courses-empty-icon" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M5 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
              </svg>
              <h3>No videos available yet</h3>
              <p>Published videos from hubs will appear here once they are ready.</p>
            </section>
          ) : (
            <>
              <div className="yt-grid" style={{ opacity: videosFetching ? 0.5 : 1 }}>
                {videos.map((video) => (
                  <VideoCard
                    key={video._id || video.id}
                    video={video}
                    onClick={() => navigate(`/watch/${video._id || video.id}`)}
                  />
                ))}
              </div>
              <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                <button 
                  className="btn-secondary" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span style={{ alignSelf: 'center' }}>Page {page}</span>
                <button 
                  className="btn-secondary"
                  onClick={() => setPage(p => p + 1)}
                  disabled={videos.length < 12}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>

        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Home
