import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { createCourse, fileToDataUrl } from '../../utils/dashboardApi'

const initialCourseValues = {
  title: '',
  description: '',
  category: '',
  price: '',
}

function CreateCourse() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { hub } = useOutletContext()
  const [courseValues, setCourseValues] = useState(initialCourseValues)
  const [thumbnailFile, setThumbnailFile] = useState(null)
  const [thumbnailPreview, setThumbnailPreview] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview('')
      return undefined
    }

    const objectUrl = URL.createObjectURL(thumbnailFile)
    setThumbnailPreview(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [thumbnailFile])

  const handleCourseChange = (event) => {
    const { name, value } = event.target
    setCourseValues((currentValues) => ({ ...currentValues, [name]: value }))
  }

  const handleThumbnailChange = (event) => {
    const nextFile = event.target.files?.[0] || null
    setThumbnailFile(nextFile)
    setSuccess('')
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting || !hub?._id) {
      return
    }

    setError('')
    setSuccess('')

    try {
      setIsSubmitting(true)

      const thumbnail = thumbnailFile ? await fileToDataUrl(thumbnailFile) : ''
      const priceValue = Number(courseValues.price || 0)

      const course = await createCourse(token, {
        title: courseValues.title,
        description: courseValues.description,
        category: courseValues.category,
        hubId: hub._id,
        price: priceValue,
        isFree: priceValue === 0,
        thumbnail,
        level: 'beginner',
        tags: [],
      })

      setSuccess('Course created successfully. Opening the course workspace...')

      setTimeout(() => {
        navigate(`/hub/${hub.slug}/dashboard/courses/${course._id}`, {
          state: { course },
        })
      }, 500)
    } catch (submitError) {
      setError(submitError.message || 'Failed to create course.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Create Course</p>
            <h2>Create a course for {hub.name}</h2>
            <p>New courses created here automatically belong to this hub and its governance model.</p>
          </div>

          <div className="dashboard-page__actions">
            <Link to={`/hub/${hub.slug}/dashboard/courses`} className="dashboard-button--ghost">
              Back to Courses
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}
      {success ? <p className="dashboard-success">{success}</p> : null}

      <section className="dashboard-form-card">
        <div>
          <p className="dashboard-section-kicker">Hub Assignment</p>
          <h2>{hub.name}</h2>
          <p className="dashboard-muted">{`Public route: /hub/${hub.slug}`}</p>
        </div>

        <form className="dashboard-form" onSubmit={handleSubmit}>
          <div className="dashboard-form__grid">
            <label className="dashboard-field">
              <span>Title</span>
              <input
                type="text"
                name="title"
                value={courseValues.title}
                onChange={handleCourseChange}
                placeholder="Build a React Product UI"
                required
              />
            </label>

            <label className="dashboard-field">
              <span>Category</span>
              <input
                type="text"
                name="category"
                value={courseValues.category}
                onChange={handleCourseChange}
                placeholder="Frontend Development"
              />
            </label>
          </div>

          <label className="dashboard-field">
            <span>Description</span>
            <textarea
              name="description"
              value={courseValues.description}
              onChange={handleCourseChange}
              placeholder="Explain the outcome, target student, and key lessons in this course."
            />
          </label>

          <div className="dashboard-form__grid">
            <label className="dashboard-field">
              <span>Price</span>
              <input
                type="number"
                name="price"
                min="0"
                step="1"
                value={courseValues.price}
                onChange={handleCourseChange}
                placeholder="0 for free"
              />
            </label>

            <label className="dashboard-field">
              <span>Hub</span>
              <input type="text" value={hub.name} disabled readOnly />
            </label>
          </div>

          <label className="dashboard-field">
            <span>Thumbnail</span>
            <input type="file" accept="image/*" onChange={handleThumbnailChange} />
            <small className="dashboard-file-meta">
              The current API accepts a string payload, so the selected image is converted before
              submit.
            </small>
          </label>

          {thumbnailPreview ? (
            <div className="dashboard-thumbnail-preview">
              <img src={thumbnailPreview} alt="Selected course thumbnail preview" />
            </div>
          ) : null}

          <div className="dashboard-inline-actions">
            <button type="submit" className="dashboard-button" disabled={isSubmitting}>
              {isSubmitting ? 'Creating course...' : 'Create Course'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default CreateCourse
