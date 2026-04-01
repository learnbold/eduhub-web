import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Footer from '../../components/Footer'
import Navbar from '../../components/Navbar'
import VideoPlayer from '../../components/VideoPlayer'
import { useAuth } from '../../context/AuthContext'
import {
  fetchLessonsByModule,
  fetchModulesByCourse,
  fetchPublicCourseBySlug,
} from '../../utils/dashboardApi'
import './CoursePlayer.css'

const getLessonVideoUrl = (lesson) => lesson?.video?.url || lesson?.videoUrl || ''

function CoursePlayer() {
  const navigate = useNavigate()
  const { slug = '' } = useParams()
  const { token } = useAuth()

  const [course, setCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [currentLessonId, setCurrentLessonId] = useState('')
  const [currentModuleId, setCurrentModuleId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const lessonRefs = useRef({})

  useEffect(() => {
    const controller = new AbortController()

    const loadCoursePlayer = async () => {
      try {
        setLoading(true)
        setError('')

        const nextCourse = await fetchPublicCourseBySlug(slug, controller.signal)

        if (controller.signal.aborted) {
          return
        }

        const nextModules = await fetchModulesByCourse(token, nextCourse._id, controller.signal)

        if (controller.signal.aborted) {
          return
        }

        const modulesWithLessons = await Promise.all(
          nextModules.map(async (moduleDoc) => ({
            ...moduleDoc,
            lessons: await fetchLessonsByModule(token, moduleDoc._id, controller.signal),
          }))
        )

        if (controller.signal.aborted) {
          return
        }

        const orderedLessons = modulesWithLessons.flatMap((moduleDoc) =>
          (moduleDoc.lessons || []).map((lesson) => ({
            ...lesson,
            moduleTitle: moduleDoc.title,
          }))
        )

        const firstLessonWithVideo = orderedLessons.find((lesson) => Boolean(getLessonVideoUrl(lesson)))
        const initialLesson = firstLessonWithVideo || orderedLessons[0] || null

        setCourse(nextCourse)
        setModules(modulesWithLessons)
        setCurrentLessonId(initialLesson?._id || '')
        setCurrentModuleId(initialLesson?.moduleId || modulesWithLessons[0]?._id || '')
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setCourse(null)
          setModules([])
          setCurrentLessonId('')
          setCurrentModuleId('')
          setError(loadError.message || 'Failed to load this course player.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadCoursePlayer()

    return () => controller.abort()
  }, [slug, token])

  const flattenedLessons = useMemo(
    () =>
      modules.flatMap((moduleDoc) =>
        (moduleDoc.lessons || []).map((lesson) => ({
          ...lesson,
          moduleTitle: moduleDoc.title,
        }))
      ),
    [modules]
  )

  const currentLesson =
    flattenedLessons.find((lesson) => lesson._id === currentLessonId) || flattenedLessons[0] || null

  const currentLessonIndex = flattenedLessons.findIndex((lesson) => lesson._id === currentLesson?._id)
  const currentPlaybackVideo = currentLesson
    ? {
        ...currentLesson.video,
        title: currentLesson.title,
        order: currentLessonIndex + 1,
        url: getLessonVideoUrl(currentLesson),
        videoUrl: currentLesson.videoUrl,
      }
    : null
  const previousLesson = currentLessonIndex > 0 ? flattenedLessons[currentLessonIndex - 1] : null
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < flattenedLessons.length - 1
      ? flattenedLessons[currentLessonIndex + 1]
      : null

  useEffect(() => {
    if (!currentLesson?.moduleId) {
      return
    }

    setCurrentModuleId(currentLesson.moduleId)
  }, [currentLesson?.moduleId])

  useEffect(() => {
    if (!currentLessonId) {
      return
    }

    lessonRefs.current[currentLessonId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }, [currentLessonId])

  const handleSelectLesson = (lesson) => {
    setCurrentLessonId(lesson._id)
    setCurrentModuleId(lesson.moduleId)
  }

  const handleMoveLesson = (direction) => {
    const targetLesson = direction === 'next' ? nextLesson : previousLesson

    if (targetLesson) {
      handleSelectLesson(targetLesson)
    }
  }

  if (loading) {
    return (
      <div className="course-player-shell">
        <Navbar />
        <main className="course-player course-player--loading">
          <section className="course-player__hero course-player__hero--loading" />
          <section className="course-player__layout">
            <div className="course-player__sidebar course-player__panel" />
            <div className="course-player__content course-player__panel" />
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="course-player-shell">
        <Navbar />
        <main className="course-player">
          <section className="course-player__empty">
            <h1>Course unavailable</h1>
            <p>{error || 'This course player could not be loaded right now.'}</p>
            <button type="button" className="course-player__button" onClick={() => navigate('/')}>
              Back to Courses
            </button>
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="course-player-shell">
      <Navbar />

      <main className="course-player">
        <section className="course-player__hero">
          <div>
            <p className="course-player__eyebrow">Learning mode</p>
            <h1>{course.title}</h1>
            <p className="course-player__summary">
              Move lesson by lesson with a clear module outline and focused playback.
            </p>
          </div>

          <div className="course-player__hero-meta">
            <div>
              <span>Modules</span>
              <strong>{modules.length}</strong>
            </div>
            <div>
              <span>Lessons</span>
              <strong>{flattenedLessons.length}</strong>
            </div>
            <div>
              <span>Current Module</span>
              <strong>
                {modules.find((moduleDoc) => moduleDoc._id === currentModuleId)?.title || 'Not selected'}
              </strong>
            </div>
          </div>
        </section>

        {error ? <p className="course-player__alert">{error}</p> : null}

        <section className="course-player__layout">
          <aside className="course-player__sidebar course-player__panel">
            <div className="course-player__sidebar-header">
              <p className="course-player__eyebrow">Course Outline</p>
              <h2>Modules</h2>
            </div>

            <div className="course-player__module-list">
              {modules.map((moduleDoc) => (
                <section
                  key={moduleDoc._id}
                  className={
                    currentModuleId === moduleDoc._id
                      ? 'course-player__module course-player__module--active'
                      : 'course-player__module'
                  }
                >
                  <header className="course-player__module-header">
                    <span>{`Module ${moduleDoc.position + 1}`}</span>
                    <h3>{moduleDoc.title || 'Untitled module'}</h3>
                  </header>

                  <div className="course-player__lesson-list">
                    {(moduleDoc.lessons || []).map((lesson) => {
                      const isActive = currentLessonId === lesson._id
                      const lessonVideoUrl = getLessonVideoUrl(lesson)

                      return (
                        <button
                          key={lesson._id}
                          ref={(node) => {
                            if (node) {
                              lessonRefs.current[lesson._id] = node
                            } else {
                              delete lessonRefs.current[lesson._id]
                            }
                          }}
                          type="button"
                          className={
                            isActive
                              ? 'course-player__lesson course-player__lesson--active'
                              : 'course-player__lesson'
                          }
                          onClick={() => handleSelectLesson(lesson)}
                        >
                          <span className="course-player__lesson-index">
                            {String(lesson.position + 1).padStart(2, '0')}
                          </span>
                          <span className="course-player__lesson-copy">
                            <strong>{lesson.title || 'Untitled lesson'}</strong>
                            <small>
                              {lessonVideoUrl
                                ? lesson.video?.status === 'ready'
                                  ? 'Ready to watch'
                                  : lesson.video?.status || 'Video attached'
                                : 'No video yet'}
                            </small>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          </aside>

          <section className="course-player__content">
            <div className="course-player__panel">
              <VideoPlayer
                video={currentPlaybackVideo}
                onEnded={() => {
                  if (nextLesson) {
                    handleSelectLesson(nextLesson)
                  }
                }}
              />

              <div className="course-player__lesson-meta">
                <div>
                  <p className="course-player__eyebrow">Current Lesson</p>
                  <h2>{currentLesson?.title || 'Select a lesson'}</h2>
                  <p>
                    {currentLesson?.moduleTitle
                      ? `Inside ${currentLesson.moduleTitle}`
                      : 'Choose a lesson from the sidebar to begin.'}
                  </p>
                </div>

                <div className="course-player__navigation">
                  <button
                    type="button"
                    className="course-player__button course-player__button--ghost"
                    disabled={!previousLesson}
                    onClick={() => handleMoveLesson('previous')}
                  >
                    Previous Lesson
                  </button>
                  <button
                    type="button"
                    className="course-player__button"
                    disabled={!nextLesson}
                    onClick={() => handleMoveLesson('next')}
                  >
                    Next Lesson
                  </button>
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default CoursePlayer
