import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BatchCard from '../components/BatchCard'
import CourseCard from '../components/CourseCard'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import VideoCard from '../components/VideoCard'
import VideoPlayer from '../components/VideoPlayer'
import { useExploreContent, useGlobalVideo } from '../hooks/useQueries'
import './WatchPage.css'

const formatCount = (value) => Number(value || 0).toLocaleString()

function WatchPage() {
  const { videoId = '' } = useParams()
  const navigate = useNavigate()
  const [showFullDesc, setShowFullDesc] = useState(false)
  const { data: video, isLoading: videoLoading, error: videoError } = useGlobalVideo(videoId)
  const {
    data: explore = { videos: [], courses: [], batches: [] },
    isLoading: exploreLoading,
    error: exploreError,
  } = useExploreContent()

  const hub = video?.hub || null

  return (
    <div className="watch-shell">
      <Navbar />

      <main className="watch-page">
        {videoLoading ? (
          <section className="watch-state-card">
            <h1>Loading video...</h1>
            <p>Opening the player and gathering the latest details.</p>
          </section>
        ) : videoError || !video ? (
          <section className="watch-state-card">
            <h1>Video unavailable</h1>
            <p>{videoError?.message || 'This video could not be found.'}</p>
            <button type="button" className="watch-button" onClick={() => navigate('/')}>
              Back to Home
            </button>
          </section>
        ) : (
          <>
            <section className="watch-player-section">
              <VideoPlayer video={video} showHeader={false} showComments={false} autoPlay={false} />

              <div className="watch-video-details">
                <div>
                  <h1>{video.title}</h1>
                  {hub?.slug ? (
                    <Link to={`/hub/${hub.slug}`} className="watch-hub-link">
                      {hub.name}
                    </Link>
                  ) : (
                    <p className="watch-hub-name">{hub?.name || 'Sparklass Hub'}</p>
                  )}
                </div>

                <div className="watch-stats">
                  <span>👁 {formatCount(video.viewsCount ?? video.views)}</span>
                  <span>👍 {formatCount(video.likesCount)}</span>
                  <span>💬 {formatCount(video.commentsCount)}</span>
                  <span>{video.price || 'Free'}</span>
                </div>

                <div className="watch-description-container">
                  <p className={`watch-description ${!showFullDesc ? 'collapsed' : ''}`}>
                    {video.description || 'No description has been added yet.'}
                  </p>
                  {video.description && video.description.length > 100 && (
                    <button 
                      className="watch-desc-toggle" 
                      onClick={() => setShowFullDesc(!showFullDesc)}
                    >
                      {showFullDesc ? 'Show Less' : 'Show More'}
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="watch-recommendations">
              <div className="watch-section-header">
                <h2>More Videos</h2>
                <span>{explore.videos.length} items</span>
              </div>
              {exploreError ? <p className="watch-alert">{exploreError.message}</p> : null}
              {exploreLoading ? (
                <div className="watch-grid watch-grid--loading">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="watch-skeleton" />
                  ))}
                </div>
              ) : explore.videos.length === 0 ? (
                <p className="watch-empty">No videos available yet.</p>
              ) : (
                <div className="watch-grid">
                  {explore.videos.map((item) => (
                    <VideoCard
                      key={item._id || item.id}
                      video={item}
                      onClick={() => navigate(`/watch/${item._id || item.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="watch-recommendations">
              <div className="watch-section-header">
                <h2>Courses</h2>
                <span>{explore.courses.length} items</span>
              </div>
              {exploreLoading ? (
                <div className="watch-grid watch-grid--loading">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="watch-skeleton" />
                  ))}
                </div>
              ) : explore.courses.length === 0 ? (
                <p className="watch-empty">No courses available yet.</p>
              ) : (
                <div className="watch-grid">
                  {explore.courses.map((course) => (
                    <CourseCard
                      key={course._id || course.slug}
                      course={course}
                      onClick={() => navigate(`/course/${course.slug || course._id}`, { state: { course } })}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="watch-recommendations">
              <div className="watch-section-header">
                <h2>Batches</h2>
                <span>{explore.batches.length} items</span>
              </div>
              {exploreLoading ? (
                <div className="watch-grid watch-grid--loading">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="watch-skeleton" />
                  ))}
                </div>
              ) : explore.batches.length === 0 ? (
                <p className="watch-empty">No batches available yet.</p>
              ) : (
                <div className="watch-grid">
                  {explore.batches.map((batch) => (
                    <BatchCard key={batch._id || batch.id} batch={batch} />
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

export default WatchPage
