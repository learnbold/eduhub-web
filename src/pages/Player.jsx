import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import VideoList from '../components/VideoList'
import VideoPlayer from '../components/VideoPlayer'
import { useAuth } from '../context/AuthContext'
import './Player.css'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
const VIDEO_API_ROOT = `${API_BASE_URL}/videos`

const emptyStates = {
  auth: {
    title: 'Login required',
    message: 'Please sign in again to access this course player.',
    actionLabel: 'Go to Login',
    actionPath: '/login',
  },
  videos: {
    title: 'No videos available',
    message:
      'There are no playable lessons for this course yet. Once videos are ready, they will appear here automatically.',
    actionLabel: 'Back to Course Catalog',
    actionPath: '/',
  },
  error: {
    title: 'Player unavailable',
    message: 'We could not load the lesson playlist from the backend. Please try again.',
    actionLabel: 'Back to Course Catalog',
    actionPath: '/',
  },
}

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
  const [emptyStateKey, setEmptyStateKey] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    const fetchVideos = async () => {
      try {
        setLoading(true)
        setError('')
        setEmptyStateKey('')

        const response = await fetch(`${VIDEO_API_ROOT}/course/${courseId}/playback`, {
          signal: controller.signal,
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.status === 401 || response.status === 403) {
          setVideos([])
          setCurrentVideo(null)
          setError('Login required')
          setEmptyStateKey('auth')
          return
        }

        if (response.status === 404) {
          setVideos([])
          setCurrentVideo(null)
          setEmptyStateKey('videos')
          return
        }

        if (!response.ok) {
          throw new Error('Failed to load course videos.')
        }

        const data = await response.json()
        const videoList = Array.isArray(data) ? data : Array.isArray(data.videos) ? data.videos : []
        const sortedVideos = [...videoList].sort((first, second) => first.order - second.order)

        setVideos(sortedVideos)
        setCurrentVideo(sortedVideos[0] ?? null)
      } catch (fetchError) {
        if (fetchError.name !== 'AbortError') {
          setVideos([])
          setCurrentVideo(null)
          setError('Failed to load course videos.')
          setEmptyStateKey('error')
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
  const emptyState = emptyStates[emptyStateKey] || emptyStates.videos

  return (
    <div className="player-shell" id="top">
      <Navbar />

      {loading ? (
        <PlayerSkeleton />
      ) : (
        <main className="player-page">
          <section className="player-overview">
            <div>
              <p className="player-overview__eyebrow">Course playback</p>
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
              <h2>{emptyState.title}</h2>
              <p>{emptyState.message}</p>
              <button
                type="button"
                className="player-empty__button"
                onClick={() => navigate(emptyState.actionPath)}
              >
                {emptyState.actionLabel}
              </button>
            </section>
          ) : (
            <section className="player-layout">
              <div className="player-layout__video">
                <VideoPlayer video={currentVideo} />
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
