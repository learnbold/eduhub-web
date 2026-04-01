import { useEffect, useRef } from 'react'
import './VideoPlayer.css'

function VideoPlayer({ video, onEnded }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const element = videoRef.current
    const sourceUrl = video?.url || video?.hlsUrl || video?.videoUrl

    if (!element || !sourceUrl) {
      return undefined
    }

    let hls
    let isDisposed = false
    const shouldUseHls = Boolean(video?.hlsUrl || sourceUrl?.includes('.m3u8'))

    const loadStream = async () => {
      if (!shouldUseHls) {
        element.src = sourceUrl
        return
      }

      const { default: Hls } = await import('hls.js/light')

      if (isDisposed) {
        return
      }

      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        })
        hls.loadSource(sourceUrl)
        hls.attachMedia(element)
      } else if (element.canPlayType('application/vnd.apple.mpegurl')) {
        element.src = sourceUrl
      }
    }

    loadStream().catch(() => {})

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
          <p className="video-player__eyebrow">{`Lesson ${video.order}`}</p>
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
          onEnded={onEnded}
        />
      </div>
    </section>
  )
}

export default VideoPlayer
