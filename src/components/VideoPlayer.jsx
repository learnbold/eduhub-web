import { useEffect, useRef } from 'react'
import './VideoPlayer.css'

function VideoPlayer({ video, isPreviewMode }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const element = videoRef.current

    if (!element || !video?.hlsUrl) {
      return undefined
    }

    let hls
    let isDisposed = false

    const loadStream = async () => {
      const { default: Hls } = await import('hls.js/light')

      if (isDisposed) {
        return
      }

      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        })
        hls.loadSource(video.hlsUrl)
        hls.attachMedia(element)
      } else if (element.canPlayType('application/vnd.apple.mpegurl')) {
        element.src = video.hlsUrl
      }
    }

    loadStream().catch((error) => {
      console.error('Error loading HLS player:', error)
    })

    return () => {
      isDisposed = true

      if (hls) {
        hls.destroy()
      }

      element.pause()
      element.removeAttribute('src')
      element.load()
    }
  }, [video])

  if (!video) {
    return (
      <section className="video-player">
        <div className="video-player__empty">
          <h2>Select a lesson to begin</h2>
          <p>Your video player will appear here as soon as a lesson is ready.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="video-player">
      <div className="video-player__header">
        <div>
          <p className="video-player__eyebrow">
            {isPreviewMode ? 'Preview playback' : `Lesson ${video.order}`}
          </p>
          <h2>{video.title}</h2>
        </div>
        <span className="video-player__status">Streaming ready</span>
      </div>

      <div className="video-player__surface" key={`${video.order}-${video.title}`}>
        <video
          ref={videoRef}
          className="video-player__element"
          controls
          playsInline
          autoPlay
        />
      </div>
    </section>
  )
}

export default VideoPlayer
