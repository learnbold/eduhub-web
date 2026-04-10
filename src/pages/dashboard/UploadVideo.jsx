import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  createVideo,
  fetchManagedHubCourses,
  getVideoFileType,
  requestVideoUploadUrl,
  uploadVideoFile,
} from '../../utils/dashboardApi'

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
  const [submitStage, setSubmitStage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadCourses = async () => {
      try {
        setLoading(true)
        setError('')

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
          setError(loadError.message || 'Failed to load courses for upload.')
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

  const basePath = `/hub/${hub.slug}/dashboard`
  const backHref = selectedBatchId ? `${basePath}/batches/${selectedBatchId}` : `${basePath}/videos`
  const selectedCourse = courses.find((course) => course._id === formValues.courseId) || routeCourse
  const isStandalone = formValues.videoType === 'standalone'

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((currentValues) => ({ ...currentValues, [name]: value }))
  }

  const handleFileChange = (event) => {
    setVideoFile(event.target.files?.[0] || null)
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting || !videoFile || (!isStandalone && !formValues.courseId)) {
      return
    }

    setError('')
    setSuccess('')

    try {
      setIsSubmitting(true)

      const fileType = getVideoFileType(videoFile)

      setSubmitStage('Preparing secure upload...')
      const uploadPayload = {
        courseId: isStandalone ? undefined : formValues.courseId,
        hubId: isStandalone ? hub._id : undefined,
        batchId: selectedBatchId || undefined,
        fileType,
        videoType: formValues.videoType,
      }
      const { uploadUrl, r2Key } = await requestVideoUploadUrl(token, uploadPayload)

      setSubmitStage('Uploading video file...')
      await uploadVideoFile(uploadUrl, videoFile, fileType)

      setSubmitStage('Saving video record...')
      const videoPayload = {
        title: formValues.title,
        description: formValues.description,
        courseId: isStandalone ? undefined : formValues.courseId,
        lessonId: isStandalone ? undefined : selectedLessonId || undefined,
        hubId: isStandalone ? hub._id : undefined,
        batchId: selectedBatchId || undefined,
        r2Key,
        videoType: formValues.videoType,
      }
      await createVideo(token, videoPayload)

      setSuccess(
        isStandalone
          ? selectedBatchId
            ? `Video uploaded and attached to ${batchLabel}. Processing has started.`
            : 'Standalone hub video uploaded. Processing has started and it will appear on the public hub once ready.'
          : selectedBatchId
            ? `Course video uploaded and attached to ${batchLabel}. Processing has started.`
            : 'Course video uploaded successfully. Processing has started and the lesson will appear once ready.'
      )

      setTimeout(() => {
        if (selectedBatchId && isStandalone) {
          navigate(`${basePath}/batches/${selectedBatchId}`, {
            state: { batch: routeBatch, activeTab: 'videos' },
          })
          return
        }

        if (isStandalone) {
          navigate(`${basePath}/videos`)
          return
        }

        navigate(`${basePath}/courses/${formValues.courseId}`, {
          state: { course: selectedCourse || null, batch: routeBatch },
        })
      }, 700)
    } catch (submitError) {
      setError(submitError.message || 'Failed to upload video.')
    } finally {
      setIsSubmitting(false)
      setSubmitStage('')
    }
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Upload Video</p>
            <h2>Add a video to {hub.name}</h2>
            <p>
              Publish course lessons or standalone hub updates from the same creator workflow.
            </p>
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

      {error ? <p className="dashboard-alert">{error}</p> : null}
      {success ? <p className="dashboard-success">{success}</p> : null}
      {submitStage ? (
        <p className="dashboard-info">{submitStage}</p>
      ) : null}

      {loading ? (
        <section className="dashboard-panel">
          <p className="dashboard-muted">Loading hub content for upload...</p>
        </section>
      ) : (
        <section className="dashboard-form-card">
          <form className="dashboard-form" onSubmit={handleSubmit}>
            <div className="dashboard-form__grid">
              <label className="dashboard-field">
                <span>Video Type</span>
                <select
                  name="videoType"
                  value={formValues.videoType}
                  onChange={handleChange}
                  disabled={Boolean(selectedLessonId)}
                >
                  <option value="course">Course Video</option>
                  <option value="standalone">Standalone Hub Update</option>
                </select>
              </label>

              <label className="dashboard-field">
                <span>Video Title</span>
                <input
                  type="text"
                  name="title"
                  value={formValues.title}
                  onChange={handleChange}
                  placeholder={isStandalone ? 'Weekly platform update' : 'Lesson 1: Introduction'}
                  required
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
                  <span>Course</span>
                  <select
                    name="courseId"
                    value={formValues.courseId}
                    onChange={handleChange}
                    required={!isStandalone}
                    disabled={Boolean(selectedLessonId)}
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
              />
            </label>

            <label className="dashboard-field">
              <span>Video File</span>
              <input type="file" accept="video/*" onChange={handleFileChange} required />
              <small className="dashboard-file-meta">
                Sparklass generates a signed upload URL first, stores the video, and then starts
                processing.
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
                {isSubmitting ? 'Uploading...' : isStandalone ? 'Upload Hub Video' : 'Upload Video'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}

export default UploadVideo
