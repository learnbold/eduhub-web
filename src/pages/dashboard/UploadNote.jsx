import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchManagedHubCourses, fetchManagedHubVideos } from '../../utils/dashboardApi'
import { startUpload } from '../../utils/uploadManager'

const initialFormValues = {
  title: '',
  description: '',
  attachmentType: 'standalone',
  courseId: '',
  videoId: '',
  accessType: 'free',
  price: '0',
  isPublished: false,
}

function UploadNote() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { token } = useAuth()
  const { hub } = useOutletContext()

  const routeCourse = location.state?.course || null
  const returnTo = location.state?.returnTo || `/hub/${hub.slug}/dashboard/notes`

  const [courses, setCourses] = useState([])
  const [videos, setVideos] = useState([])
  const [formValues, setFormValues] = useState(initialFormValues)
  const [noteFile, setNoteFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadContent = async () => {
      try {
        setLoading(true)
        setSubmitError('')

        const [nextCourses, nextVideos] = await Promise.all([
          fetchManagedHubCourses(token, hub._id, controller.signal),
          fetchManagedHubVideos(token, hub._id, controller.signal),
        ])

        if (controller.signal.aborted) {
          return
        }

        const selectedCourseId = searchParams.get('courseId') || routeCourse?._id || ''

        setCourses(nextCourses)
        setVideos(nextVideos)
        setFormValues((current) => ({
          ...current,
          title: current.title || (routeCourse?.title ? `${routeCourse.title} Notes` : ''),
          attachmentType: selectedCourseId ? 'course' : current.attachmentType,
          courseId: current.courseId || selectedCourseId,
        }))
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setSubmitError(loadError.message || 'Failed to load courses and videos for note upload.')
          setCourses([])
          setVideos([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadContent()
    return () => controller.abort()
  }, [hub?._id, routeCourse, searchParams, token])

  const isCourseAttached = formValues.attachmentType === 'course'
  const filteredVideos = useMemo(() => {
    if (isCourseAttached) {
      return videos.filter((video) => video.courseId === formValues.courseId)
    }

    return videos.filter((video) => video.videoType === 'standalone')
  }, [formValues.courseId, isCourseAttached, videos])

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormValues((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'attachmentType' && value === 'standalone'
        ? { courseId: '', videoId: '' }
        : name === 'courseId'
          ? { videoId: '' }
          : {}),
    }))
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null

    if (file && String(file.type || '').toLowerCase() !== 'application/pdf') {
      setSubmitError('Please select a valid PDF file.')
      setNoteFile(null)
      return
    }

    setNoteFile(file)
    setSubmitError('')
    setUploadMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting || !noteFile || (isCourseAttached && !formValues.courseId)) {
      return
    }

    setSubmitError('')
    setUploadMessage('')

    try {
      setIsSubmitting(true)

      startUpload(
        noteFile,
        {
          resourceType: 'note',
          title: formValues.title,
          description: formValues.description,
          hubId: hub._id,
          courseId: isCourseAttached ? formValues.courseId || undefined : undefined,
          videoId: formValues.videoId || undefined,
          isFree: formValues.accessType === 'free',
          price: formValues.accessType === 'free' ? 0 : Number(formValues.price || 0),
          isPublished: Boolean(formValues.isPublished),
        },
        token
      )

      setUploadMessage(
        'Upload started in the background. You can leave this page and keep working while the upload panel tracks progress.'
      )
      setNoteFile(null)
      setFormValues((current) => ({
        ...initialFormValues,
        attachmentType: current.attachmentType,
        courseId: current.courseId,
      }))

      window.setTimeout(() => {
        navigate(returnTo)
      }, 1200)
    } catch (uploadError) {
      setSubmitError(uploadError.message || 'Failed to start note upload. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Upload Note</p>
            <h2>Add a PDF note to {hub.name}</h2>
            <p>Create standalone downloads or attach notes directly to a course or video.</p>
          </div>
          <div className="dashboard-page__actions">
            <Link to={returnTo} className="dashboard-button--ghost">
              Back to Notes
            </Link>
          </div>
        </div>
      </section>

      {submitError ? <p className="dashboard-alert">{submitError}</p> : null}
      {uploadMessage ? <p className="dashboard-success">{uploadMessage}</p> : null}

      {loading ? (
        <section className="dashboard-panel">
          <p className="dashboard-muted">Loading hub content for note upload...</p>
        </section>
      ) : !uploadMessage ? (
        <section className="dashboard-form-card">
          <form className="dashboard-form" onSubmit={handleSubmit}>
            <div className="dashboard-form__grid">
              <label className="dashboard-field">
                <span>Attachment Type</span>
                <select name="attachmentType" value={formValues.attachmentType} onChange={handleChange}>
                  <option value="standalone">Standalone note</option>
                  <option value="course">Course note</option>
                </select>
              </label>

              <label className="dashboard-field">
                <span>Title *</span>
                <input
                  type="text"
                  name="title"
                  value={formValues.title}
                  onChange={handleChange}
                  placeholder={isCourseAttached ? 'Revision handout' : 'Weekly study sheet'}
                  required
                />
              </label>
            </div>

            {isCourseAttached ? (
              <label className="dashboard-field">
                <span>Course *</span>
                <select name="courseId" value={formValues.courseId} onChange={handleChange} required>
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
            ) : null}

            <label className="dashboard-field">
              <span>Attach to video (optional)</span>
              <select name="videoId" value={formValues.videoId} onChange={handleChange}>
                <option value="">No specific video</option>
                {filteredVideos.map((video) => (
                  <option key={video._id} value={video._id}>
                    {video.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="dashboard-field">
              <span>Description</span>
              <textarea
                name="description"
                value={formValues.description}
                onChange={handleChange}
                placeholder="Describe what learners will find in this PDF."
              />
            </label>

            <div className="dashboard-form__grid">
              <label className="dashboard-field">
                <span>Access</span>
                <select name="accessType" value={formValues.accessType} onChange={handleChange}>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </label>

              <label className="dashboard-field">
                <span>Price</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name="price"
                  value={formValues.price}
                  onChange={handleChange}
                  disabled={formValues.accessType === 'free'}
                />
              </label>
            </div>

            <label className="dashboard-field">
              <span>Publish immediately</span>
              <input
                type="checkbox"
                name="isPublished"
                checked={formValues.isPublished}
                onChange={handleChange}
              />
            </label>

            <label className="dashboard-field">
              <span>PDF File *</span>
              <input type="file" accept="application/pdf" onChange={handleFileChange} required />
              <small className="dashboard-file-meta">
                Notes upload directly to R2 and become available as soon as metadata is saved.
              </small>
            </label>

            <div className="dashboard-inline-actions">
              <button
                type="submit"
                className="dashboard-button"
                disabled={isSubmitting || !noteFile || (isCourseAttached && !formValues.courseId)}
              >
                {isSubmitting ? 'Starting upload...' : 'Upload Note'}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </div>
  )
}

export default UploadNote
