import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import VideoList from '../components/VideoList'
import VideoPlayer from '../components/VideoPlayer'
import { useAuth } from '../context/AuthContext'
import './Player.css'

const API_BASE_URL = 'http://localhost:5000'

const fakeVideos = [
  {
    title: 'Introduction',
    order: 1,
    hlsUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    title: 'Building Your Core Workflow',
    order: 2,
    hlsUrl: 'https://test-streams.mux.dev/test_001/stream.m3u8',
  },
  {
    title: 'Advanced Implementation Walkthrough',
    order: 3,
    hlsUrl: 'https://test-streams.mux.dev/dai-discontinuity-deltatre/manifest.m3u8',
  },
]

function PlayerSkeleton() {
  return (
    <main className="player-page" aria-label="Loading videos">
      <section className="player-overview player-overview--loading">
        <div className="player-skeleton player-skeleton--eyebrow" />
        <div className="player-skeleton player-skeleton--title" />
        <div className="player-skeleton player-skeleton--copy" />
      </section>

      <section className="player-layout">
        <div className="player-skeleton-card player-skeleton-card--video" />
        <div className="player-skeleton-card player-skeleton-card--playlist" />
      </section>
    </main>
  )
}

function Player() {
  const navigate = useNavigate()
  const { courseId = '' } = useParams()
  const { token } = useAuth()

  const [videos, setVideos] = useState([])
  const [currentVideo, setCurrentVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const fetchVideos = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`${API_BASE_URL}/videos/course/${courseId}/playback`, {
          signal: controller.signal,
          credentials: 'include',
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        })

        if (response.status === 404) {
          setVideos([])
          setCurrentVideo(null)
          setIsPreviewMode(false)
          return
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch playback videos: ${response.status}`)
        }

        const data = await response.json()
        const sortedVideos = Array.isArray(data)
          ? [...data].sort((first, second) => first.order - second.order)
          : []

        setVideos(sortedVideos)
        setCurrentVideo(sortedVideos[0] ?? null)
        setIsPreviewMode(false)
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          console.error('Error fetching playback videos:', fetchError)
          setVideos(fakeVideos)
          setCurrentVideo(fakeVideos[0])
          setIsPreviewMode(true)
          setError(
            'Live playback is unavailable right now, so a preview lesson playlist is loaded.'
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchVideos()

    return () => controller.abort()
  }, [courseId, token])

  useEffect(() => {
    if (!videos.length) {
      setCurrentVideo(null)
      return
    }

    setCurrentVideo((activeVideo) => {
      if (!activeVideo) {
        return videos[0]
      }

      const matchingVideo = videos.find(
        (video) => video.order === activeVideo.order && video.title === activeVideo.title
      )

      return matchingVideo || videos[0]
    })
  }, [videos])

  const totalLessonsLabel = useMemo(() => {
    if (!videos.length) {
      return 'No lessons yet'
    }

    return `${videos.length} lesson${videos.length > 1 ? 's' : ''} in this playlist`
  }, [videos.length])

  const hasVideos = videos.length > 0

  return (
    <div className="player-shell" id="top">
      <Navbar />

      {loading ? (
        <PlayerSkeleton />
      ) : (
        <main className="player-page">
          <section className="player-overview">
            <div>
              <p className="player-overview__eyebrow">
                {isPreviewMode ? 'Preview streaming experience' : 'Course playback'}
              </p>
              <h1>{currentVideo?.title || 'Your learning player is ready'}</h1>
              <p className="player-overview__text">
                Learn with a focused playback space, rapid lesson switching, and a clean
                playlist built for sustained momentum.
              </p>
            </div>

            <div className="player-overview__meta">
              <div>
                <span>Course ID</span>
                <strong>{courseId}</strong>
              </div>
              <div>
                <span>Playlist</span>
                <strong>{totalLessonsLabel}</strong>
              </div>
            </div>
          </section>

          {error ? <p className="player-alert">{error}</p> : null}

          {!hasVideos ? (
            <section className="player-empty">
              <h2>No videos available</h2>
              <p>
                There are no playable lessons for this course yet. Once videos are ready,
                they will appear here automatically.
              </p>
              <button
                type="button"
                className="player-empty__button"
                onClick={() => navigate('/')}
              >
                Back to Course Catalog
              </button>
            </section>
          ) : (
            <section className="player-layout">
              <div className="player-layout__video">
                <VideoPlayer video={currentVideo} isPreviewMode={isPreviewMode} />
              </div>

              <aside className="player-layout__playlist">
                <VideoList
                  videos={videos}
                  currentVideo={currentVideo}
                  onSelectVideo={setCurrentVideo}
                />
              </aside>
            </section>
          )}
        </main>
      )}

      <Footer />
    </div>
  )
}

export default Player
