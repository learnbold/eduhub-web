import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  addCourseToBatch,
  addVideoToBatch,
  fetchManagedBatchById,
  fetchManagedHubCourses,
  fetchManagedHubVideos,
  formatBatchPrice,
  updateBatch,
} from '../../utils/dashboardApi'

const BATCH_TABS = [
  { id: 'courses', label: 'Courses' },
  { id: 'videos', label: 'Videos' },
  { id: 'students', label: 'Students' },
  { id: 'notes', label: 'Notes' },
]

function BatchDetail() {
  const { id = '' } = useParams()
  const { token } = useAuth()
  const { hub } = useOutletContext()
  const [batch, setBatch] = useState(null)
  const [hubCourses, setHubCourses] = useState([])
  const [hubVideos, setHubVideos] = useState([])
  const [activeTab, setActiveTab] = useState('courses')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingCourseId, setAddingCourseId] = useState('')
  const [addingVideoId, setAddingVideoId] = useState('')
  const [editValues, setEditValues] = useState({
    title: '',
    description: '',
    price: '0',
    thumbnail: '',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    if (!hub?._id || !id) {
      return undefined
    }

    const controller = new AbortController()

    const loadBatchWorkspace = async () => {
      try {
        setLoading(true)
        setError('')
        const [nextBatch, nextCourses, nextVideos] = await Promise.all([
          fetchManagedBatchById(token, id, controller.signal),
          fetchManagedHubCourses(token, hub._id, controller.signal),
          fetchManagedHubVideos(token, hub._id, controller.signal),
        ])

        if (controller.signal.aborted) {
          return
        }

        setBatch(nextBatch)
        setHubCourses(nextCourses)
        setHubVideos(nextVideos)
        setEditValues({
          title: nextBatch.title || '',
          description: nextBatch.description || '',
          price: String(nextBatch.price ?? 0),
          thumbnail: nextBatch.thumbnail || '',
          startDate: nextBatch.startDate ? new Date(nextBatch.startDate).toISOString().slice(0, 10) : '',
          endDate: nextBatch.endDate ? new Date(nextBatch.endDate).toISOString().slice(0, 10) : '',
        })
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setBatch(null)
          setError(loadError.message || 'Failed to load batch details.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadBatchWorkspace()

    return () => controller.abort()
  }, [hub?._id, id, token])

  const basePath = `/hub/${hub.slug}/dashboard`
  const attachedCourseIds = useMemo(() => new Set(batch?.courses?.map((course) => course._id) || []), [batch?.courses])
  const attachedVideoIds = useMemo(() => new Set(batch?.videos?.map((video) => video._id) || []), [batch?.videos])
  const availableCourses = hubCourses.filter((course) => !attachedCourseIds.has(course._id))
  const availableVideos = hubVideos.filter((video) => !attachedVideoIds.has(video._id))

  if (loading && !batch) {
    return (
      <section className="dashboard-panel">
        <p className="dashboard-muted">Loading batch workspace...</p>
      </section>
    )
  }

  if (!batch) {
    return (
      <section className="dashboard-empty">
        <h2>Batch unavailable</h2>
        <p>{error || 'This batch could not be loaded from your hub.'}</p>
        <div className="dashboard-access__actions">
          <Link to={`${basePath}/batches`} className="dashboard-button">
            Back to Batches
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
            <p className="dashboard-section-kicker">Batch Detail</p>
            <h2>{batch.title}</h2>
            <p>
              {batch.description ||
                'This batch combines courses, standalone videos, future notes, and enrolled students.'}
            </p>
          </div>

          <div className="dashboard-page__actions">
            <button
              type="button"
              className="dashboard-button"
              onClick={() => {
                setEditing((current) => !current)
                setError('')
                setSuccess('')
              }}
            >
              {editing ? 'Cancel Edit' : 'Edit Batch'}
            </button>
            <Link to={`${basePath}/batches`} className="dashboard-button--ghost">
              Back to Batches
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}
      {success ? <p className="dashboard-success">{success}</p> : null}

      <section className="dashboard-hero">
        <article className="dashboard-panel">
          <div className="dashboard-detail-grid">
            <div>
              <span>Price</span>
              <strong>{formatBatchPrice(batch)}</strong>
            </div>
            <div>
              <span>Courses</span>
              <strong>{batch.courseCount}</strong>
            </div>
            <div>
              <span>Videos</span>
              <strong>{batch.videoCount}</strong>
            </div>
            <div>
              <span>Students</span>
              <strong>{batch.studentCount}</strong>
            </div>
            <div>
              <span>Start</span>
              <strong>{batch.startDate ? new Date(batch.startDate).toLocaleDateString() : 'Flexible'}</strong>
            </div>
            <div>
              <span>End</span>
              <strong>{batch.endDate ? new Date(batch.endDate).toLocaleDateString() : 'Open-ended'}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-panel dashboard-hero__panel">
          {editing ? (
            <form
              className="dashboard-form"
              onSubmit={async (event) => {
                event.preventDefault()
                if (saving) return

                try {
                  setSaving(true)
                  setError('')
                  setSuccess('')

                  const updatedBatch = await updateBatch(token, batch._id, {
                    title: editValues.title,
                    description: editValues.description,
                    price: Number(editValues.price || 0),
                    thumbnail: editValues.thumbnail,
                    startDate: editValues.startDate || null,
                    endDate: editValues.endDate || null,
                  })

                  setBatch((current) => ({
                    ...current,
                    ...updatedBatch,
                    courses: current?.courses || [],
                    videos: current?.videos || [],
                    students: current?.students || [],
                  }))
                  setEditing(false)
                  setSuccess('Batch details updated successfully.')
                } catch (updateError) {
                  setError(updateError.message || 'Failed to update batch.')
                } finally {
                  setSaving(false)
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

              <div className="dashboard-form__grid">
                <label className="dashboard-field">
                  <span>Price</span>
                  <input
                    type="number"
                    min="0"
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
                  />
                </label>
              </div>

              <div className="dashboard-form__grid">
                <label className="dashboard-field">
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={editValues.startDate}
                    onChange={(event) =>
                      setEditValues((current) => ({ ...current, startDate: event.target.value }))
                    }
                  />
                </label>

                <label className="dashboard-field">
                  <span>End Date</span>
                  <input
                    type="date"
                    value={editValues.endDate}
                    onChange={(event) =>
                      setEditValues((current) => ({ ...current, endDate: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="dashboard-inline-actions">
                <button type="submit" className="dashboard-button" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Batch'}
                </button>
              </div>
            </form>
          ) : batch.thumbnail ? (
            <div className="dashboard-cover">
              <img src={batch.thumbnail} alt={`${batch.title} thumbnail`} />
            </div>
          ) : (
            <div className="dashboard-cover" />
          )}
        </article>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-tab-row" role="tablist" aria-label="Batch content tabs">
          {BATCH_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'dashboard-tab active' : 'dashboard-tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'courses' ? (
        <section className="dashboard-panel">
          <div className="dashboard-page__header">
            <div>
              <p className="dashboard-section-kicker">Batch Courses</p>
              <h3>Reusable courses inside this batch</h3>
            </div>

            <div className="dashboard-selector-row">
              <select value={addingCourseId} onChange={(event) => setAddingCourseId(event.target.value)}>
                <option value="">Add a course to this batch</option>
                {availableCourses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="dashboard-button"
                disabled={!addingCourseId}
                onClick={async () => {
                  try {
                    setError('')
                    setSuccess('')
                    await addCourseToBatch(token, batch._id, addingCourseId)
                    const nextBatch = await fetchManagedBatchById(token, batch._id)
                    setBatch(nextBatch)
                    setAddingCourseId('')
                    setSuccess('Course added to batch.')
                  } catch (addError) {
                    setError(addError.message || 'Failed to add course to batch.')
                  }
                }}
              >
                Add Course
              </button>
            </div>
          </div>

          {batch.courses.length === 0 ? (
            <div className="dashboard-empty">
              <h3>No courses in this batch yet</h3>
              <p>Attach reusable courses so students unlock them through the batch purchase.</p>
            </div>
          ) : (
            <div className="dashboard-grid dashboard-grid--courses">
              {batch.courses.map((course) => (
                <article key={course._id} className="dashboard-course-card">
                  <div className="dashboard-course-card__header">
                    <div>
                      <h3>{course.title}</h3>
                      <p className="dashboard-muted">{course.description || 'No description yet.'}</p>
                    </div>
                    <div className="dashboard-pill-row">
                      <span className="dashboard-pill dashboard-pill--neutral">{course.category}</span>
                      <span className="dashboard-pill dashboard-pill--success">
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </div>
                  <div className="dashboard-inline-actions">
                    <Link to={`${basePath}/courses/${course._id}`} className="dashboard-link-button">
                      Open Course
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'videos' ? (
        <section className="dashboard-panel">
          <div className="dashboard-page__header">
            <div>
              <p className="dashboard-section-kicker">Batch Videos</p>
              <h3>Standalone or lesson-linked videos bundled in this batch</h3>
            </div>

            <div className="dashboard-selector-row">
              <select value={addingVideoId} onChange={(event) => setAddingVideoId(event.target.value)}>
                <option value="">Add a video to this batch</option>
                {availableVideos.map((video) => (
                  <option key={video._id} value={video._id}>
                    {video.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="dashboard-button"
                disabled={!addingVideoId}
                onClick={async () => {
                  try {
                    setError('')
                    setSuccess('')
                    await addVideoToBatch(token, batch._id, addingVideoId)
                    const nextBatch = await fetchManagedBatchById(token, batch._id)
                    setBatch(nextBatch)
                    setAddingVideoId('')
                    setSuccess('Video added to batch.')
                  } catch (addError) {
                    setError(addError.message || 'Failed to add video to batch.')
                  }
                }}
              >
                Add Video
              </button>
            </div>
          </div>

          {batch.videos.length === 0 ? (
            <div className="dashboard-empty">
              <h3>No videos in this batch yet</h3>
              <p>Add standalone videos or lesson-linked uploads that should unlock with this batch.</p>
            </div>
          ) : (
            <div className="dashboard-grid dashboard-grid--videos">
              {batch.videos.map((video) => (
                <article key={video._id} className="dashboard-video-card">
                  <div className="dashboard-video-card__header">
                    <div>
                      <h3>{video.title}</h3>
                      <p className="dashboard-muted">{video.description || 'No description yet.'}</p>
                    </div>
                    <div className="dashboard-pill-row">
                      <span className="dashboard-pill dashboard-pill--warning">{video.videoType}</span>
                      <span
                        className={
                          video.status === 'ready'
                            ? 'dashboard-pill dashboard-pill--success'
                            : 'dashboard-pill dashboard-pill--neutral'
                        }
                      >
                        {video.status}
                      </span>
                    </div>
                  </div>
                  <div className="dashboard-video-card__meta">
                    <div>
                      <span>Course</span>
                      <strong>{video.courseId?.title || 'Standalone'}</strong>
                    </div>
                    <div>
                      <span>Duration</span>
                      <strong>{video.duration ? `${video.duration}s` : 'Pending'}</strong>
                    </div>
                    <div>
                      <span>Order</span>
                      <strong>{video.order || 'N/A'}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'students' ? (
        <section className="dashboard-panel">
          <div className="dashboard-page__header">
            <div>
              <p className="dashboard-section-kicker">Batch Students</p>
              <h3>Students enrolled into this access bundle</h3>
              <p>Anyone enrolled here unlocks the batch’s courses, videos, and future notes together.</p>
            </div>
          </div>

          {batch.students.length === 0 ? (
            <div className="dashboard-empty">
              <h3>No students enrolled yet</h3>
              <p>New enrollments will populate here once learners join this batch.</p>
            </div>
          ) : (
            <div className="dashboard-list">
              {batch.students.map((student) => (
                <article key={student._id} className="dashboard-member-card">
                  <strong>{student.displayName}</strong>
                  <p className="dashboard-muted">{student.email || 'No email available'}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'notes' ? (
        <section className="dashboard-empty">
          <h3>Notes are staged for the next iteration</h3>
          <p>
            The batch model is already ready for notes, subscriptions, live classes, and cohort-based
            delivery. This tab is reserved so the UX does not need another structural change later.
          </p>
        </section>
      ) : null}
    </div>
  )
}

export default BatchDetail
