import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchManagedHubCourses } from '../../utils/dashboardApi'
import { startUpload } from '../../utils/uploadManager'

const initialFormValues = {
  title: '',
  description: '',
  courseId: '',
  videoType: 'course',
}

function UploadVideo() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { token } = useAuth()
  const { hub } = useOutletContext()

  const routeCourse = location.state?.course || null
  const routeLesson = location.state?.lesson || null
  const routeBatch = location.state?.batch || null
  const selectedLessonId = searchParams.get('lessonId') || routeLesson?._id || ''
  const selectedBatchId = searchParams.get('batchId') || routeBatch?._id || ''
  const batchLabel = routeBatch?.title || 'Selected batch'

  const [courses, setCourses] = useState([])
  const [formValues, setFormValues] = useState(initialFormValues)
  const [videoFile, setVideoFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')

  const basePath = `/hub/${hub.slug}/dashboard`
  const backHref = selectedBatchId ? `${basePath}/batches/${selectedBatchId}` : `${basePath}/videos`
  const selectedCourse = courses.find((course) => course._id === formValues.courseId) || routeCourse
  const isStandalone = formValues.videoType === 'standalone'

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadCourses = async () => {
      try {
        setLoading(true)
        setSubmitError('')

        const nextCourses = await fetchManagedHubCourses(token, hub._id, controller.signal)

        if (controller.signal.aborted) {
          return
        }

        const selectedType =
          selectedLessonId || searchParams.get('type') !== 'standalone' ? 'course' : 'standalone'
        const selectedCourseId =
          searchParams.get('courseId') || routeCourse?._id || nextCourses[0]?._id || ''

        setCourses(nextCourses)
        setFormValues((currentValues) => ({
          ...currentValues,
          title: currentValues.title || routeLesson?.title || '',
          videoType: selectedType,
          courseId: currentValues.courseId || selectedCourseId,
        }))
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setSubmitError(loadError.message || 'Failed to load courses for upload.')
          setCourses([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadCourses()

    return () => controller.abort()
  }, [hub?._id, routeCourse, routeLesson, searchParams, selectedLessonId, token])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((currentValues) => ({ ...currentValues, [name]: value }))
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null

    if (file) {
      if (!file.type.startsWith('video/')) {
        setSubmitError('Please select a valid video file.')
        setVideoFile(null)
        return
      }

      const maxSizeBytes = 2 * 1024 * 1024 * 1024
      if (file.size > maxSizeBytes) {
        setSubmitError('File is too large. Maximum supported size is 2GB.')
        setVideoFile(null)
        return
      }
    }

    setVideoFile(file)
    setSubmitError('')
    setUploadMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting || !videoFile || (!isStandalone && !formValues.courseId)) {
      return
    }

    setSubmitError('')
    setUploadMessage('')

    try {
      setIsSubmitting(true)

      startUpload(
        videoFile,
        {
          title: formValues.title,
          description: formValues.description,
          courseId: isStandalone ? undefined : formValues.courseId,
          videoType: formValues.videoType,
          hubId: hub._id,
          lessonId: selectedLessonId || undefined,
          batchId: selectedBatchId || undefined,
        },
        token
      )

      setUploadMessage(
        'Upload started in the background. You can leave this page now and keep working while the upload panel tracks progress.'
      )
      setVideoFile(null)
      setFormValues((currentValues) => ({
        ...initialFormValues,
        videoType: currentValues.videoType,
        courseId: isStandalone ? '' : currentValues.courseId,
      }))

      window.setTimeout(() => {
        navigate(backHref)
      }, 1200)
    } catch (error) {
      console.error('Failed to queue upload:', error)
      setSubmitError(error.message || 'Failed to start upload. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Upload Video</p>
            <h2>Add a video to {hub.name}</h2>
            <p>Publish course lessons or standalone hub updates from the same creator workflow.</p>
            {selectedBatchId ? (
              <p>
                New uploads from this screen will also attach to <strong>{batchLabel}</strong>.
              </p>
            ) : null}
            {selectedLessonId ? (
              <p>
                This upload will attach directly to <strong>{routeLesson?.title || 'the selected lesson'}</strong>.
              </p>
            ) : null}
          </div>
          <div className="dashboard-page__actions">
            <Link to={backHref} className="dashboard-button--ghost">
              {selectedBatchId ? 'Back to Batch' : 'Back to Videos'}
            </Link>
          </div>
        </div>
      </section>

      {submitError && (
        <section className="dashboard-form-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: '#dc2626', fontWeight: '600', marginBottom: '0.5rem' }}>Error</p>
              <p style={{ color: '#991b1b', fontSize: '0.95rem' }}>{submitError}</p>
            </div>
          </div>
        </section>
      )}

      {uploadMessage && (
        <section className="dashboard-form-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div style={{ padding: '1.5rem' }}>
            <p style={{ color: '#047857', fontWeight: '600', marginBottom: '0.5rem' }}>Upload Queued</p>
            <p style={{ color: '#065f46', fontSize: '0.95rem' }}>{uploadMessage}</p>
            <p style={{ color: '#999', fontSize: '0.85rem', marginTop: '0.75rem' }}>
              Your upload is now being handled outside this page, so navigation will not interrupt it.
            </p>
          </div>
        </section>
      )}

      {loading ? (
        <section className="dashboard-panel">
          <p className="dashboard-muted">Loading hub content for upload...</p>
        </section>
      ) : !uploadMessage ? (
        <section className="dashboard-form-card">
          <form className="dashboard-form" onSubmit={handleSubmit}>
            <div className="dashboard-form__grid">
              <label className="dashboard-field">
                <span>Video Type</span>
                <select
                  name="videoType"
                  value={formValues.videoType}
                  onChange={handleChange}
                  disabled={Boolean(selectedLessonId) || isSubmitting}
                >
                  <option value="course">Course Video</option>
                  <option value="standalone">Standalone Hub Update</option>
                </select>
              </label>

              <label className="dashboard-field">
                <span>Video Title *</span>
                <input
                  type="text"
                  name="title"
                  value={formValues.title}
                  onChange={handleChange}
                  placeholder={isStandalone ? 'Weekly platform update' : 'Lesson 1: Introduction'}
                  required
                  disabled={isSubmitting}
                />
              </label>
            </div>

            {!isStandalone ? (
              courses.length === 0 ? (
                <div className="dashboard-empty">
                  <h3>No courses available yet</h3>
                  <p>Create a course first, or switch to a standalone hub update upload.</p>
                  <div className="dashboard-inline-actions">
                    <Link to={`${basePath}/courses/create`} className="dashboard-button">
                      Create a Course
                    </Link>
                  </div>
                </div>
              ) : (
                <label className="dashboard-field">
                  <span>Course *</span>
                  <select
                    name="courseId"
                    value={formValues.courseId}
                    onChange={handleChange}
                    required={!isStandalone}
                    disabled={Boolean(selectedLessonId) || isSubmitting}
                  >
                    <option value="" disabled>
                      Select a course
                    </option>
                    {courses.map((course) => (
                      <option key={course._id} value={course._id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </label>
              )
            ) : null}

            <label className="dashboard-field">
              <span>Description</span>
              <textarea
                name="description"
                value={formValues.description}
                onChange={handleChange}
                placeholder={
                  isStandalone
                    ? 'Describe the update, announcement, or free content.'
                    : 'Optional lesson summary for the course video.'
                }
                disabled={isSubmitting}
              />
            </label>

            <label className="dashboard-field">
              <span>Video File *</span>
              <input type="file" accept="video/*" onChange={handleFileChange} required disabled={isSubmitting} />
              <small className="dashboard-file-meta">
                Sparklass processes video files in HLS format with automatic thumbnail generation. Upload time
                depends on file size. You can close this page after starting the upload.
              </small>
            </label>

            <div className="dashboard-info">
              Upload target:{' '}
              <strong>
                {isStandalone
                  ? selectedBatchId
                    ? `${batchLabel} -> ${hub.name} standalone video`
                    : `${hub.name} public hub feed`
                  : selectedLessonId
                    ? `${selectedCourse?.title || 'Course'} -> ${routeLesson?.title || 'Selected lesson'}`
                    : selectedBatchId
                      ? `${batchLabel} -> ${selectedCourse?.title || 'Course'}`
                      : selectedCourse?.title || 'Course'}
              </strong>
            </div>

            <div className="dashboard-inline-actions">
              <button
                type="submit"
                className="dashboard-button"
                disabled={isSubmitting || !videoFile || (!isStandalone && !formValues.courseId)}
              >
                {isSubmitting ? 'Starting upload...' : isStandalone ? 'Upload Hub Video' : 'Upload Video'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {!uploadMessage && (
        <section className="dashboard-panel">
          <div
            style={{
              padding: '1.5rem',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
            }}
          >
            <p style={{ fontWeight: '600', color: '#0c4a6e', marginBottom: '0.5rem' }}>Background Processing</p>
            <p style={{ color: '#0c63e4', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
              Your upload will continue even if you leave this page. Watch the progress indicator in the bottom right
              corner to track upload and processing status.
            </p>
            <p style={{ color: '#075985', fontSize: '0.9rem' }}>
              Once processing finishes, the video will become available in your hub or course automatically.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}

export default UploadVideo
