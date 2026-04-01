import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  createVideo,
  fetchManagedCourseById,
  fetchManagedCourseVideos,
  formatPrice,
  publishCourse,
  processVideo,
  requestVideoUploadUrl,
  getVideoFileType,
  uploadVideoFile,
  updateCourse,
  archiveCourse,
  fetchModulesByCourse,
  fetchLessonsByModule,
  createModule,
  createLesson,
} from '../../utils/dashboardApi'

function CourseDetail() {
  const { id = '' } = useParams()
  const location = useLocation()
  const { token } = useAuth()
  const { hub } = useOutletContext()
  const routeCourse = location.state?.course || null

  const [course, setCourse] = useState(routeCourse)
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState({
    title: routeCourse?.title || '',
    description: routeCourse?.description || '',
    price: routeCourse?.price ?? 0,
    thumbnail: routeCourse?.thumbnail || '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const [outlineLoading, setOutlineLoading] = useState(false)
  const [outlineError, setOutlineError] = useState('')
  const [modulesOutline, setModulesOutline] = useState([])
  const [expandedModuleId, setExpandedModuleId] = useState(null)
  const [showAddModuleForm, setShowAddModuleForm] = useState(false)
  const [moduleFormValues, setModuleFormValues] = useState({
    title: '',
    description: '',
  })
  const [creatingModule, setCreatingModule] = useState(false)
  const [openLessonFormFor, setOpenLessonFormFor] = useState(null)
  const [lessonFormValues, setLessonFormValues] = useState({
    title: '',
    videoUrl: '',
    duration: '',
    isPreview: false,
  })
  const [creatingLesson, setCreatingLesson] = useState(false)
  const [uploadingLessonId, setUploadingLessonId] = useState('')
  const [lessonUploadStage, setLessonUploadStage] = useState('')
  const lessonFileInputRefs = useRef({})

  const refreshCourseOutline = useCallback(async (signal) => {
    if (!token || !id) {
      setModulesOutline([])
      return
    }

    setOutlineLoading(true)
    setOutlineError('')

    try {
      const nextModules = await fetchModulesByCourse(token, id, signal)
      if (signal?.aborted) return

      const nextModulesWithLessons = await Promise.all(
        (nextModules || []).map(async (moduleDoc) => {
          const lessons = await fetchLessonsByModule(token, moduleDoc._id, signal)
          return {
            ...moduleDoc,
            lessons,
          }
        })
      )

      if (signal?.aborted) return
      setModulesOutline(nextModulesWithLessons)
      if (nextModulesWithLessons?.length) {
        setExpandedModuleId((currentId) => (currentId ? currentId : nextModulesWithLessons[0]._id))
      }
    } catch (outlineLoadError) {
      if (!signal?.aborted) {
        setModulesOutline([])
        setOutlineError(outlineLoadError.message || 'Failed to load course outline.')
      }
    } finally {
      if (!signal?.aborted) {
        setOutlineLoading(false)
      }
    }
  }, [id, token])

  const refreshManagedVideos = useCallback(
    async (signal) => {
      if (!token || !id) {
        setVideos([])
        return []
      }

      const nextVideos = await fetchManagedCourseVideos(token, id, signal)

      if (!signal?.aborted) {
        setVideos(nextVideos)
      }

      return nextVideos
    },
    [id, token]
  )

  const handleLessonVideoUpload = useCallback(
    async (lesson, file) => {
      if (!file || !course?._id || uploadingLessonId) {
        return
      }

      setError('')
      setSuccess('')

      try {
        setUploadingLessonId(lesson._id)

        const fileType = getVideoFileType(file)

        setLessonUploadStage('Preparing secure upload...')
        const { uploadUrl, fileUrl } = await requestVideoUploadUrl(token, {
          courseId: course._id,
          hubId: hub._id,
          fileType,
          videoType: 'course',
        })

        setLessonUploadStage('Uploading video file...')
        await uploadVideoFile(uploadUrl, file, fileType)

        setLessonUploadStage('Saving video record...')
        const createdVideo = await createVideo(token, {
          title: lesson.title || file.name.replace(/\.[^.]+$/, ''),
          description: '',
          courseId: course._id,
          lessonId: lesson._id,
          hubId: hub._id,
          videoUrl: fileUrl,
          videoType: 'course',
        })

        setLessonUploadStage('Starting video processing...')
        await processVideo(token, createdVideo._id)

        await Promise.all([refreshCourseOutline(), refreshManagedVideos()])

        setSuccess(`Video attached to "${lesson.title || 'Untitled lesson'}". Processing has started.`)
      } catch (uploadError) {
        setError(uploadError.message || 'Failed to upload lesson video.')
      } finally {
        setUploadingLessonId('')
        setLessonUploadStage('')
        const input = lessonFileInputRefs.current[lesson._id]
        if (input) {
          input.value = ''
        }
      }
    },
    [course?._id, hub?._id, refreshCourseOutline, refreshManagedVideos, token, uploadingLessonId]
  )

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadPage = async () => {
      try {
        setLoading(true)
        setError('')

        const [nextCourse, nextVideos] = await Promise.all([
          fetchManagedCourseById(token, id, controller.signal),
          refreshManagedVideos(controller.signal),
        ])

        if (controller.signal.aborted) {
          return
        }

        setCourse(nextCourse)
        setVideos(nextVideos || [])
        setEditValues({
          title: nextCourse.title || '',
          description: nextCourse.description || '',
          price: nextCourse.price ?? 0,
          thumbnail: nextCourse.thumbnail || '',
        })

        await refreshCourseOutline(controller.signal)
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setCourse(null)
          setVideos([])
          setError(loadError.message || 'Failed to load course details.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadPage()

    return () => controller.abort()
  }, [hub?._id, id, refreshCourseOutline, refreshManagedVideos, token])

  const basePath = `/hub/${hub.slug}/dashboard`
  const isPublished = course?.status === 'published' || course?.isPublished
  const hasLessonVideo = modulesOutline.some((moduleDoc) =>
    moduleDoc.lessons?.some((lesson) => lesson.hasAttachedVideo)
  )
  const canPublish = !publishing && !isPublished && (videos.length > 0 || hasLessonVideo)
  const isArchived = course?.status === 'archived'

  if (loading && !course) {
    return (
      <section className="dashboard-panel">
        <p className="dashboard-muted">Loading course workspace...</p>
      </section>
    )
  }

  if (!course) {
    return (
      <section className="dashboard-empty">
        <h2>Course unavailable</h2>
        <p>{error || 'This course could not be loaded from your hub.'}</p>
        <div className="dashboard-access__actions">
          <Link to={`${basePath}/courses`} className="dashboard-button">
            Back to Courses
          </Link>
        </div>
      </section>
    )
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Course Detail</p>
            <h2>{course.title}</h2>
            <p>{course.description || 'Add a richer description as you continue shaping this course.'}</p>
          </div>

          <div className="dashboard-page__actions">
            <Link
              to={`${basePath}/videos/upload?courseId=${course._id}&type=course`}
              state={{ course }}
              className="dashboard-button"
            >
              Add Video
            </Link>
            <button
              type="button"
              className="dashboard-button--ghost"
              onClick={() => {
                setEditing((value) => !value)
                setSuccess('')
                setError('')
              }}
            >
              {editing ? 'Cancel Edit' : 'Edit Course'}
            </button>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}
      {success ? <p className="dashboard-success">{success}</p> : null}
      {uploadingLessonId ? <p className="dashboard-info">{lessonUploadStage}</p> : null}

      <section className="dashboard-hero">
        <article className="dashboard-panel">
          <div className="dashboard-detail-grid">
            <div>
              <span>Hub</span>
              <strong>{hub.name}</strong>
            </div>
            <div>
              <span>Category</span>
              <strong>{course.category || 'Uncategorized'}</strong>
            </div>
            <div>
              <span>Price</span>
              <strong>{formatPrice(course)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>{isArchived ? 'Archived' : isPublished ? 'Published' : 'Draft'}</strong>
            </div>
            {course.publishedAt ? (
              <div>
                <span>Published</span>
                <strong>{new Date(course.publishedAt).toLocaleDateString()}</strong>
              </div>
            ) : null}
          </div>

          <div className="dashboard-inline-actions">
            <Link to={`${basePath}/courses`} className="dashboard-link-button">
              Back to Courses
            </Link>
            <Link
              to={`${basePath}/videos/upload?courseId=${course._id}&type=course`}
              state={{ course }}
              className="dashboard-link-button"
            >
              Upload Another Video
            </Link>
            <button
              type="button"
              className="dashboard-button"
              disabled={!canPublish}
              title={
                isPublished
                  ? 'This course is already published.'
                  : !hasLessonVideo && videos.length === 0
                    ? 'Attach at least one lesson video before publishing.'
                    : undefined
              }
              onClick={async () => {
                if (!course?._id || !canPublish) return
                setError('')
                setSuccess('')
                try {
                  setPublishing(true)
                  const nextCourse = await publishCourse(token, course._id)
                  setCourse(nextCourse)
                  setSuccess('Course published successfully. It is now publicly visible.')
                } catch (publishError) {
                  setError(publishError.message || 'Failed to publish course.')
                } finally {
                  setPublishing(false)
                }
              }}
            >
              {publishing ? 'Publishing...' : isPublished ? 'Published' : 'Publish Course'}
            </button>
            <button
              type="button"
              className="dashboard-button--ghost"
              disabled={archiving || isArchived}
              onClick={async () => {
                if (!course?._id || isArchived) return
                setError('')
                setSuccess('')
                try {
                  setArchiving(true)
                  const nextCourse = await archiveCourse(token, course._id)
                  setCourse(nextCourse)
                  setSuccess('Course archived. It is no longer publicly visible.')
                } catch (archiveError) {
                  setError(archiveError.message || 'Failed to archive course.')
                } finally {
                  setArchiving(false)
                }
              }}
            >
              {archiving ? 'Archiving...' : isArchived ? 'Archived' : 'Archive Course'}
            </button>
          </div>
        </article>

        <article className="dashboard-panel dashboard-hero__panel">
          {editing ? (
            <form
              className="dashboard-form"
              onSubmit={async (event) => {
                event.preventDefault()
                if (!course?._id || savingEdit) return
                setError('')
                setSuccess('')
                try {
                  setSavingEdit(true)
                  const payload = {
                    title: editValues.title,
                    description: editValues.description,
                    price: Number(editValues.price ?? 0),
                    thumbnail: editValues.thumbnail,
                  }
                  const nextCourse = await updateCourse(token, course._id, payload)
                  setCourse(nextCourse)
                  setEditValues({
                    title: nextCourse.title || '',
                    description: nextCourse.description || '',
                    price: nextCourse.price ?? 0,
                    thumbnail: nextCourse.thumbnail || '',
                  })
                  setEditing(false)
                  setSuccess('Course details updated successfully.')
                } catch (updateError) {
                  setError(updateError.message || 'Failed to update course.')
                } finally {
                  setSavingEdit(false)
                }
              }}
            >
              <label className="dashboard-field">
                <span>Title</span>
                <input
                  type="text"
                  value={editValues.title}
                  onChange={(event) =>
                    setEditValues((current) => ({ ...current, title: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="dashboard-field">
                <span>Description</span>
                <textarea
                  value={editValues.description}
                  onChange={(event) =>
                    setEditValues((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="dashboard-field">
                <span>Price</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={editValues.price}
                  onChange={(event) =>
                    setEditValues((current) => ({ ...current, price: event.target.value }))
                  }
                />
              </label>
              <label className="dashboard-field">
                <span>Thumbnail URL</span>
                <input
                  type="text"
                  value={editValues.thumbnail}
                  onChange={(event) =>
                    setEditValues((current) => ({ ...current, thumbnail: event.target.value }))
                  }
                  placeholder="https://..."
                />
              </label>
              <div className="dashboard-inline-actions">
                <button type="submit" className="dashboard-button" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : course.thumbnail ? (
            <div className="dashboard-cover">
              <img src={course.thumbnail} alt={`${course.title} thumbnail`} />
            </div>
          ) : (
            <div className="dashboard-cover" />
          )}
        </article>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Course Videos</p>
            <h2>Videos attached to this course</h2>
            <p>Every lesson here belongs to both the course and the parent hub.</p>
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="dashboard-empty">
            <h3>No videos yet</h3>
            <p>Upload the first lesson to begin filling out this hub course.</p>
          </div>
        ) : (
          <div className="dashboard-grid dashboard-grid--videos">
            {videos.map((video) => (
              <article key={video._id || `${video.order}-${video.title}`} className="dashboard-video-card">
                <div className="dashboard-video-card__header">
                  <div>
                    <h3>{video.title}</h3>
                    <p className="dashboard-muted">
                      {video.description || 'Lesson attached to this course.'}
                    </p>
                  </div>
                  <span
                    className={
                      video.status === 'ready'
                        ? 'dashboard-pill dashboard-pill--success'
                        : 'dashboard-pill dashboard-pill--warning'
                    }
                  >
                    {video.status}
                  </span>
                </div>

                <div className="dashboard-video-card__meta">
                  <div>
                    <span>Lesson Order</span>
                    <strong>{video.order}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>{video.status}</strong>
                  </div>
                  <div>
                    <span>Duration</span>
                    <strong>{video.duration ? `${video.duration}s` : 'Pending'}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Course Outline</p>
            <h2>Modules and lessons</h2>
            <p>Organize your course into modules, then add lessons inside each module.</p>
          </div>
          <div className="dashboard-page__actions">
            <button
              type="button"
              className="dashboard-button--ghost"
              onClick={() => {
                setShowAddModuleForm((value) => !value)
                setModuleFormValues({ title: '', description: '' })
              }}
            >
              {showAddModuleForm ? 'Cancel Module Form' : 'Add Module'}
            </button>
          </div>
        </div>

        {outlineError ? <p className="dashboard-alert">{outlineError}</p> : null}

        {outlineLoading ? (
          <div className="dashboard-empty">
            <p className="dashboard-muted">Loading course outline...</p>
          </div>
        ) : modulesOutline.length === 0 ? (
          <div className="dashboard-empty">
            <h3>No modules yet</h3>
            <p>Create your first module to start building the course outline.</p>
          </div>
        ) : (
          <>
            {showAddModuleForm ? (
              <form
                className="dashboard-form"
                onSubmit={async (event) => {
                  event.preventDefault()
                  if (!course?._id || creatingModule) return

                  setError('')
                  setSuccess('')
                  try {
                    setCreatingModule(true)
                    const created = await createModule(token, {
                      courseId: course._id,
                      title: moduleFormValues.title,
                      description: moduleFormValues.description,
                    })

                    setSuccess(`Module "${created.title || 'Untitled'}" created successfully.`)
                    setShowAddModuleForm(false)
                    setModuleFormValues({ title: '', description: '' })
                    setExpandedModuleId(created._id || null)
                    await refreshCourseOutline()
                  } catch (createError) {
                    setError(createError.message || 'Failed to create module.')
                  } finally {
                    setCreatingModule(false)
                  }
                }}
              >
                <div className="dashboard-form__grid">
                  <label className="dashboard-field">
                    <span>Title</span>
                    <input
                      type="text"
                      value={moduleFormValues.title}
                      onChange={(event) =>
                        setModuleFormValues((current) => ({ ...current, title: event.target.value }))
                      }
                      required
                    />
                  </label>
                </div>
                <label className="dashboard-field">
                  <span>Description</span>
                  <textarea
                    value={moduleFormValues.description}
                    onChange={(event) =>
                      setModuleFormValues((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </label>
                <div className="dashboard-inline-actions">
                  <button type="submit" className="dashboard-button" disabled={creatingModule}>
                    {creatingModule ? 'Creating...' : 'Create Module'}
                  </button>
                </div>
              </form>
            ) : null}

            <div className="dashboard-grid dashboard-grid--modules">
              {modulesOutline.map((moduleDoc) => {
                const expanded = expandedModuleId === moduleDoc._id
                return (
                  <article key={moduleDoc._id} className="dashboard-panel">
                    <div className="dashboard-page__header">
                      <div>
                        <p className="dashboard-section-kicker">
                          Module {moduleDoc.position !== undefined ? moduleDoc.position + 1 : ''}
                        </p>
                        <h3>{moduleDoc.title || 'Untitled module'}</h3>
                      </div>
                      <div className="dashboard-page__actions">
                        <button
                          type="button"
                          className="dashboard-button--ghost"
                          onClick={() => {
                            setExpandedModuleId(expanded ? null : moduleDoc._id)
                          }}
                        >
                          {expanded ? 'Collapse' : 'Expand'}
                        </button>
                      </div>
                    </div>

                    {expanded ? (
                      <>
                        {moduleDoc.description ? (
                          <p className="dashboard-muted" style={{ marginTop: '-8px' }}>
                            {moduleDoc.description}
                          </p>
                        ) : null}

                        <div className="dashboard-inline-actions" style={{ marginTop: '12px' }}>
                          <button
                            type="button"
                            className="dashboard-button--ghost"
                            disabled={creatingLesson}
                            onClick={() => {
                              setOpenLessonFormFor((current) =>
                                current === moduleDoc._id ? null : moduleDoc._id
                              )
                              setLessonFormValues({
                                title: '',
                                videoUrl: '',
                                duration: '',
                                isPreview: false,
                              })
                            }}
                          >
                            {openLessonFormFor === moduleDoc._id ? 'Cancel Lesson Form' : 'Add Lesson'}
                          </button>
                        </div>

                        {openLessonFormFor === moduleDoc._id ? (
                          <form
                            className="dashboard-form"
                            onSubmit={async (event) => {
                              event.preventDefault()
                              if (!course?._id || creatingLesson) return

                              setError('')
                              setSuccess('')
                              try {
                                setCreatingLesson(true)
                                const durationNumber =
                                  lessonFormValues.duration === ''
                                    ? undefined
                                    : Number(lessonFormValues.duration)

                                const createdLesson = await createLesson(token, {
                                  moduleId: moduleDoc._id,
                                  courseId: course._id,
                                  title: lessonFormValues.title,
                                  videoUrl: lessonFormValues.videoUrl || '',
                                  duration: durationNumber,
                                  isPreview: Boolean(lessonFormValues.isPreview),
                                })

                                setSuccess(
                                  `Lesson "${createdLesson.title || 'Untitled'}" added to "${moduleDoc.title || 'module'}".`
                                )
                                setOpenLessonFormFor(null)
                                setLessonFormValues({
                                  title: '',
                                  videoUrl: '',
                                  duration: '',
                                  isPreview: false,
                                })
                                await refreshCourseOutline()
                              } catch (createError) {
                                setError(createError.message || 'Failed to create lesson.')
                              } finally {
                                setCreatingLesson(false)
                              }
                            }}
                          >
                            <label className="dashboard-field">
                              <span>Title</span>
                              <input
                                type="text"
                                value={lessonFormValues.title}
                                onChange={(event) =>
                                  setLessonFormValues((current) => ({
                                    ...current,
                                    title: event.target.value,
                                  }))
                                }
                                required
                              />
                            </label>

                            <label className="dashboard-field">
                              <span>Video URL (legacy)</span>
                              <input
                                type="text"
                                value={lessonFormValues.videoUrl}
                                onChange={(event) =>
                                  setLessonFormValues((current) => ({
                                    ...current,
                                    videoUrl: event.target.value,
                                  }))
                                }
                                placeholder="https://..."
                              />
                              <small className="dashboard-file-meta">
                                Deprecated fallback. Prefer creating the lesson first and uploading a managed video.
                              </small>
                            </label>

                            <div className="dashboard-form__grid">
                              <label className="dashboard-field">
                                <span>Duration (seconds)</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={lessonFormValues.duration}
                                  onChange={(event) =>
                                    setLessonFormValues((current) => ({
                                      ...current,
                                      duration: event.target.value,
                                    }))
                                  }
                                />
                              </label>

                              <label className="dashboard-field">
                                <span>Preview</span>
                                <input
                                  type="checkbox"
                                  checked={lessonFormValues.isPreview}
                                  onChange={(event) =>
                                    setLessonFormValues((current) => ({
                                      ...current,
                                      isPreview: event.target.checked,
                                    }))
                                  }
                                />
                              </label>
                            </div>

                            <div className="dashboard-inline-actions">
                              <button type="submit" className="dashboard-button" disabled={creatingLesson}>
                                {creatingLesson ? 'Adding...' : 'Add Lesson'}
                              </button>
                            </div>
                          </form>
                        ) : null}

                        <div className="dashboard-grid dashboard-grid--lessons" style={{ marginTop: '14px' }}>
                          {moduleDoc.lessons?.length ? (
                            moduleDoc.lessons.map((lesson) => {
                              const lessonVideoUrl = lesson.video?.url || lesson.videoUrl
                              const hasManagedVideo = Boolean(lesson.video)
                              const hasLegacyVideo = !hasManagedVideo && Boolean(lesson.videoUrl)

                              return (
                              <article key={lesson._id} className="dashboard-panel">
                                <div className="dashboard-page__header">
                                  <div>
                                    <h3>{lesson.title || 'Untitled lesson'}</h3>
                                  </div>
                                  <div className="dashboard-page__actions">
                                    {hasManagedVideo ? (
                                      <span
                                        className={
                                          lesson.video?.status === 'ready'
                                            ? 'dashboard-pill dashboard-pill--success'
                                            : 'dashboard-pill dashboard-pill--warning'
                                        }
                                      >
                                        {lesson.video?.status === 'ready'
                                          ? 'Video Ready'
                                          : lesson.video?.status || 'Video Linked'}
                                      </span>
                                    ) : hasLegacyVideo ? (
                                      <span className="dashboard-pill dashboard-pill--warning">Legacy Video URL</span>
                                    ) : (
                                      <button
                                        type="button"
                                        className="dashboard-link-button"
                                        disabled={Boolean(uploadingLessonId)}
                                        onClick={() => lessonFileInputRefs.current[lesson._id]?.click()}
                                      >
                                        {uploadingLessonId === lesson._id ? 'Uploading...' : 'Upload Video'}
                                      </button>
                                    )}
                                    {lesson.isPreview ? (
                                      <span className="dashboard-pill dashboard-pill--neutral">Preview</span>
                                    ) : null}
                                  </div>
                                </div>
                                <p className="dashboard-muted">
                                  Duration:{' '}
                                  <strong>
                                    {lesson.duration !== null && lesson.duration !== undefined
                                      ? `${lesson.duration}s`
                                      : '—'}
                                  </strong>
                                </p>
                                <p className="dashboard-muted">
                                  Video:{' '}
                                  <strong>
                                    {hasManagedVideo
                                      ? lesson.video?.title || 'Managed lesson video'
                                      : lessonVideoUrl
                                        ? 'Legacy lesson URL attached'
                                        : 'Not attached yet'}
                                  </strong>
                                </p>
                                <input
                                  ref={(node) => {
                                    if (node) {
                                      lessonFileInputRefs.current[lesson._id] = node
                                    } else {
                                      delete lessonFileInputRefs.current[lesson._id]
                                    }
                                  }}
                                  type="file"
                                  accept="video/*"
                                  hidden
                                  onChange={(event) => {
                                    const file = event.target.files?.[0]
                                    if (file) {
                                      handleLessonVideoUpload(lesson, file)
                                    }
                                  }}
                                />
                                {hasLegacyVideo ? (
                                  <div className="dashboard-inline-actions" style={{ marginTop: '12px' }}>
                                    <button
                                      type="button"
                                      className="dashboard-link-button"
                                      disabled={Boolean(uploadingLessonId)}
                                      onClick={() => lessonFileInputRefs.current[lesson._id]?.click()}
                                    >
                                      {uploadingLessonId === lesson._id
                                        ? 'Uploading...'
                                        : 'Replace With Managed Upload'}
                                    </button>
                                  </div>
                                ) : null}
                              </article>
                              )
                            })
                          ) : (
                            <div className="dashboard-empty">
                              <h3>No lessons yet</h3>
                              <p>Add your first lesson to this module.</p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default CourseDetail
