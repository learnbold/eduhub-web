import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Footer from '../../components/Footer'
import Navbar from '../../components/Navbar'
import VideoPlayer from '../../components/VideoPlayer'
import { fetchPublicHubPage, formatBatchPrice, formatPrice } from '../../utils/dashboardApi'
import './HubPublic.css'

const TAB_IDS = ['home', 'batches', 'courses', 'videos', 'notes']
const SITE_NAV_OFFSET = 84

const getInitial = (value = '') => value.trim().charAt(0).toUpperCase() || 'H'

const formatCount = (value) => Number(value || 0).toLocaleString()

const formatVideoDate = (value) => {
  if (!value) {
    return 'Recently added'
  }

  const dateValue = new Date(value)

  if (Number.isNaN(dateValue.getTime())) {
    return 'Recently added'
  }

  return dateValue.toLocaleDateString()
}

const matchesQuery = (items, query, fields) => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return items
  }

  return items.filter((item) =>
    fields.some((field) => String(item?.[field] || '').toLowerCase().includes(normalizedQuery))
  )
}

const getPreviewDescription = (item, fallback) => item?.description || fallback

function HubPublic() {
  const navigate = useNavigate()
  const { slug = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const identityRef = useRef(null)

  const [hubPage, setHubPage] = useState({
    hub: null,
    batches: [],
    courses: [],
    videos: [],
  })
  const [selectedVideoId, setSelectedVideoId] = useState('')
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCompactNavPinned, setIsCompactNavPinned] = useState(false)

  const activeTab = TAB_IDS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'home'

  useEffect(() => {
    const controller = new AbortController()

    const loadHubPage = async () => {
      try {
        setLoading(true)
        setError('')

        const payload = await fetchPublicHubPage(slug, controller.signal)

        if (controller.signal.aborted) {
          return
        }

        setHubPage({
          hub: payload?.hub || null,
          batches: Array.isArray(payload?.batches) ? payload.batches : [],
          courses: Array.isArray(payload?.courses) ? payload.courses : [],
          videos: Array.isArray(payload?.videos) ? payload.videos : [],
        })
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setHubPage({
            hub: null,
            batches: [],
            courses: [],
            videos: [],
          })
          setError(loadError.message || 'Failed to load this public hub.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadHubPage()

    return () => controller.abort()
  }, [slug])

  useEffect(() => {
    setSearchValue(searchParams.get('q') || '')
  }, [searchParams])

  useEffect(() => {
    const handleScroll = () => {
      const identityBottom = identityRef.current?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY
      setIsCompactNavPinned(identityBottom <= SITE_NAV_OFFSET + 12)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const hub = hubPage.hub
  const batches = useMemo(
    () => hubPage.batches.filter((batch) => batch.isPublished && !batch.isPlanArchived),
    [hubPage.batches]
  )
  const courses = useMemo(
    () => hubPage.courses.filter((course) => course.isPublished || course.status === 'published'),
    [hubPage.courses]
  )
  const videos = useMemo(
    () => hubPage.videos.filter((video) => video.status === 'ready' && !video.isPaid),
    [hubPage.videos]
  )

  const filteredBatches = useMemo(
    () => matchesQuery(batches, searchValue, ['title', 'description']),
    [batches, searchValue]
  )
  const filteredCourses = useMemo(
    () => matchesQuery(courses, searchValue, ['title', 'description', 'category']),
    [courses, searchValue]
  )
  const filteredVideos = useMemo(
    () => matchesQuery(videos, searchValue, ['title', 'description', 'courseTitle', 'lessonTitle']),
    [videos, searchValue]
  )

  const selectedVideo = useMemo(
    () => filteredVideos.find((video) => video._id === selectedVideoId) || videos.find((video) => video._id === selectedVideoId) || null,
    [filteredVideos, selectedVideoId, videos]
  )

  useEffect(() => {
    if (selectedVideoId && !selectedVideo) {
      setSelectedVideoId('')
    }
  }, [selectedVideo, selectedVideoId])

  const relatedVideos = useMemo(() => {
    if (!selectedVideo) {
      return []
    }

    return filteredVideos
      .filter((video) => video._id !== selectedVideo._id)
      .sort((left, right) => {
        const leftScore = left.courseSlug === selectedVideo.courseSlug ? 0 : 1
        const rightScore = right.courseSlug === selectedVideo.courseSlug ? 0 : 1
        return leftScore - rightScore
      })
      .slice(0, 8)
  }, [filteredVideos, selectedVideo])

  const ownerName = hub?.ownerProfile?.displayName || hub?.name || 'Hub owner'
  const bioText = hub?.description || 'Teaching with clarity. Learning with purpose.'
  const noteCount = batches.reduce((total, batch) => total + Number(batch.noteCount || 0), 0)
  const studentCount = batches.reduce((total, batch) => total + Number(batch.studentCount || 0), 0)
  const contentCount = batches.length + courses.length + videos.length

  const pageStyle = hub
    ? {
        '--hub-primary': hub.primaryColor || '#6C63FF',
        '--hub-secondary': hub.secondaryColor || '#38BDF8',
      }
    : undefined
  const bannerStyle = hub?.banner
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(15, 17, 23, 0) 35%, rgba(15, 17, 23, 0.84) 100%), url(${hub.banner})`,
      }
    : undefined

  const heroVideo = selectedVideo
    ? {
        ...selectedVideo,
        eyebrow:
          selectedVideo.sourceType === 'course'
            ? `${selectedVideo.courseTitle || 'Course'} preview`
            : 'Free hub video',
        statusLabel: selectedVideo.sourceType === 'course' ? 'Preview ready' : 'Watch now',
      }
    : null

  const updateParams = (updates) => {
    const nextParams = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        nextParams.delete(key)
        return
      }

      nextParams.set(key, value)
    })

    setSearchParams(nextParams, { replace: true })
  }

  const handleTabChange = (tabId) => {
    updateParams({
      tab: tabId === 'home' ? '' : tabId,
      q: searchValue.trim() || '',
    })
  }

  const handleSearchChange = (event) => {
    const nextValue = event.target.value
    setSearchValue(nextValue)
    updateParams({
      tab: activeTab === 'home' ? '' : activeTab,
      q: nextValue.trim() || '',
    })
  }

  const renderCard = (item, type, variant = 'grid') => {
    const title = item.title
    const description =
      type === 'batches'
        ? getPreviewDescription(item, 'A focused batch for learners joining this hub.')
        : type === 'courses'
          ? getPreviewDescription(item, 'A published learning program from this hub.')
          : getPreviewDescription(item, 'Ready to watch.')
    const thumbnail = item.thumbnail || item.courseThumbnail || ''
    const priceLabel =
      type === 'courses'
        ? Number(item.price || 0) > 0
          ? formatPrice(item)
          : ''
        : type === 'batches'
          ? Number(item.price || 0) > 0
            ? formatBatchPrice(item)
            : ''
          : ''
    const cardClass =
      variant === 'rail' ? 'hub-public-content-card hub-public-content-card--rail' : 'hub-public-content-card'

    const thumbnailNode = thumbnail ? (
      <img src={thumbnail} alt={`${title} thumbnail`} />
    ) : (
      <div className="hub-public-card-media__fallback">
        <span>{getInitial(title)}</span>
      </div>
    )

    if (type === 'videos') {
      return (
        <button
          key={item._id}
          type="button"
          className={`${cardClass} ${selectedVideoId === item._id ? 'is-active' : ''}`}
          onClick={() => setSelectedVideoId(item._id)}
        >
          <div className="hub-public-card-media">
            {thumbnailNode}
            <span className="hub-public-card-media__action">Play</span>
          </div>
          <div className="hub-public-content-card__copy">
            <h3>{title}</h3>
            <p>{description}</p>
            <span className="hub-public-content-card__meta">
              {item.courseTitle || formatVideoDate(item.publishedAt || item.createdAt)}
            </span>
          </div>
        </button>
      )
    }

    if (type === 'courses') {
      return (
        <button
          key={item._id || item.slug}
          type="button"
          className={cardClass}
          onClick={() => {
            if (!item.slug) {
              return
            }

            navigate(`/course/${item.slug}`, { state: { course: item } })
          }}
        >
          <div className="hub-public-card-media">
            {thumbnailNode}
            {priceLabel ? <span className="hub-public-price-badge">{priceLabel}</span> : null}
          </div>
          <div className="hub-public-content-card__copy">
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        </button>
      )
    }

    return (
      <article key={item._id} className={cardClass}>
        <div className="hub-public-card-media">
          {thumbnailNode}
          {priceLabel ? <span className="hub-public-price-badge">{priceLabel}</span> : null}
        </div>
        <div className="hub-public-content-card__copy">
          <h3>{title}</h3>
          <p>{description}</p>
          <span className="hub-public-content-card__meta">
            {formatCount(item.studentCount || 0)} students
          </span>
        </div>
      </article>
    )
  }

  const renderSection = (tabId, label, title, items, type) => (
    <section className="hub-public-section">
      <div className="hub-public-section__header">
        <div>
          <h2 className="hub-public-section__title">{label}</h2>
        </div>
        <button
          type="button"
          className="hub-public-section__link"
          onClick={() => handleTabChange(tabId)}
        >
          See All &rarr;
        </button>
      </div>

      {items.length === 0 ? (
        <div className="hub-public-empty-state">
          <p>No content available yet.</p>
        </div>
      ) : (
        <div className="hub-public-rail">{items.map((item) => renderCard(item, type, 'rail'))}</div>
      )}
    </section>
  )

  const renderGridTab = (items, type, emptyMessage) => {
    if (items.length === 0) {
      return (
        <div className="hub-public-empty-state hub-public-empty-state--panel">
          <p>{emptyMessage}</p>
        </div>
      )
    }

    return <div className="hub-public-grid">{items.map((item) => renderCard(item, type))}</div>
  }

  const contentByTab = {
    home: (
      <>
        {renderSection('batches', 'Batches', 'Structured learning paths', filteredBatches, 'batches')}
        {renderSection('courses', 'Courses', 'Published programs', filteredCourses, 'courses')}
        {renderSection('videos', 'Videos', 'Free videos to watch now', filteredVideos, 'videos')}
        <section className="hub-public-section">
          <div className="hub-public-section__header">
            <div>
              <h2 className="hub-public-section__title">Notes</h2>
            </div>
            <button type="button" className="hub-public-section__link" onClick={() => handleTabChange('notes')}>
              See All &rarr;
            </button>
          </div>

          <div className="hub-public-empty-state">
            <p>Notes will appear here as soon as this hub publishes them.</p>
          </div>
        </section>
      </>
    ),
    batches: renderGridTab(filteredBatches, 'batches', 'No batches available yet.'),
    courses: renderGridTab(filteredCourses, 'courses', 'No courses available yet.'),
    videos: renderGridTab(filteredVideos, 'videos', 'No videos available yet.'),
    notes: (
      <div className="hub-public-empty-state hub-public-empty-state--panel">
        <p>Notes are not published on this hub yet.</p>
      </div>
    ),
  }

  return (
    <div className="hub-public-shell" style={pageStyle}>
      <Navbar />

      <main className="hub-public-page">
        {loading ? (
          <section className="hub-public-state-card">
            <h1>Loading hub channel...</h1>
            <p>Gathering batches, courses, and free videos.</p>
          </section>
        ) : error || !hub ? (
          <section className="hub-public-state-card">
            <h1>Hub unavailable</h1>
            <p>{error || 'This hub could not be found.'}</p>
          </section>
        ) : (
          <>
            <section className="hub-public-banner" style={bannerStyle} />

            <section ref={identityRef} className="hub-public-identity-block">
              <div className="hub-public-identity-block__avatar-wrap">
                {hub.logo ? (
                  <img src={hub.logo} alt={`${hub.name} avatar`} className="hub-public-identity-block__avatar" />
                ) : (
                  <div className="hub-public-identity-block__avatar hub-public-identity-block__avatar--fallback">
                    {getInitial(hub.name)}
                  </div>
                )}
              </div>

              <div className="hub-public-identity-block__body">
                <h1>{hub.name}</h1>
                <p className="hub-public-identity-block__bio">{bioText}</p>
                <div className="hub-public-identity-block__meta">
                  <span>{formatCount(batches.length)} Batches</span>
                  <span>{formatCount(videos.length)} Videos</span>
                  <span>{formatCount(studentCount)} Students</span>
                  <span>{formatCount(contentCount)} Content Items</span>
                  {noteCount > 0 ? <span>{formatCount(noteCount)} Notes</span> : null}
                </div>
              </div>
            </section>

            <nav
              className={
                isCompactNavPinned
                  ? 'hub-public-tabs hub-public-tabs--pinned'
                  : 'hub-public-tabs'
              }
            >
              <div className="hub-public-tabs__inner">
                <div className="hub-public-tabs__items">
                  {TAB_IDS.map((tabId) => (
                    <button
                      key={tabId}
                      type="button"
                      className={activeTab === tabId ? 'hub-public-tab is-active' : 'hub-public-tab'}
                      onClick={() => handleTabChange(tabId)}
                    >
                      {tabId.charAt(0).toUpperCase() + tabId.slice(1)}
                    </button>
                  ))}
                </div>

                <label className="hub-public-search" aria-label="Search content">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M10.5 4a6.5 6.5 0 1 0 4.06 11.58l4.43 4.43 1.41-1.41-4.43-4.43A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"
                      fill="currentColor"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search content..."
                    value={searchValue}
                    onChange={handleSearchChange}
                  />
                </label>
              </div>
            </nav>

            {selectedVideo ? (
              <section className="hub-public-player-zone">
                <div className="hub-public-player-zone__panel">
                  <VideoPlayer video={heroVideo} />
                </div>

                <div className="hub-public-player-zone__details">
                  <div className="hub-public-player-zone__copy">
                    <p className="hub-public-section__label" style={{ margin: 0, marginBottom: '6px' }}>Now Playing</p>
                    <h2 className="hub-public-section__title" style={{ fontSize: '18px' }}>{selectedVideo.title}</h2>
                    <p>
                      {selectedVideo.courseTitle
                        ? `${selectedVideo.courseTitle} - ${formatVideoDate(selectedVideo.publishedAt || selectedVideo.createdAt)}`
                        : formatVideoDate(selectedVideo.publishedAt || selectedVideo.createdAt)}
                    </p>
                  </div>

                  <div className="hub-public-player-zone__actions">
                    {selectedVideo.courseSlug ? (
                      <button
                        type="button"
                        className="hub-public-cta"
                        onClick={() => navigate(`/course/${selectedVideo.courseSlug}`)}
                      >
                        View Full Course
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="hub-public-cta hub-public-cta--ghost"
                      onClick={() => setSelectedVideoId('')}
                    >
                      Close Player
                    </button>
                  </div>
                </div>

                <div className="hub-public-related">
                  <div className="hub-public-section__header">
                    <div>
                      <h2 className="hub-public-section__title">Related Videos</h2>
                    </div>
                  </div>

                  {relatedVideos.length === 0 ? (
                    <div className="hub-public-empty-state">
                      <p>No related videos available yet.</p>
                    </div>
                  ) : (
                    <div className="hub-public-grid hub-public-grid--related">
                      {relatedVideos.map((video) => renderCard(video, 'videos'))}
                    </div>
                  )}
                </div>
              </section>
            ) : null}

            <section key={`${activeTab}-${searchValue}`} className="hub-public-content-stage">
              {contentByTab[activeTab]}
            </section>
          </>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default HubPublic
