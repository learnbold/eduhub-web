import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { DashboardCard, DashboardModal, EditPlaceholderModal } from '../../components/dashboard/DashboardCards'
import { useAuth } from '../../context/AuthContext'
import {
  addCourseToBatch,
  deleteCourse,
  fetchManagedHubBatches,
  fetchManagedHubCourses,
  formatPrice,
} from '../../utils/dashboardApi'

function CoursesList() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { hub } = useOutletContext()
  const [courses, setCourses] = useState([])
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [addingCourseId, setAddingCourseId] = useState('')
  const [batchSelections, setBatchSelections] = useState({})
  const [courseToDelete, setCourseToDelete] = useState(null)
  const [deletingCourseId, setDeletingCourseId] = useState('')
  const [courseToEdit, setCourseToEdit] = useState(null)

  const loadCoursesWorkspace = useCallback(
    async (signal) => {
      if (!hub?._id) {
        setCourses([])
        setBatches([])
        return
      }

      const [nextCourses, nextBatches] = await Promise.all([
        fetchManagedHubCourses(token, hub._id, signal),
        fetchManagedHubBatches(token, hub._id, signal),
      ])

      if (signal?.aborted) {
        return
      }

      setCourses(nextCourses)
      setBatches(nextBatches)
      setBatchSelections((current) => {
        const nextSelections = { ...current }

        for (const course of nextCourses) {
          if (nextSelections[course._id]) {
            continue
          }

          const availableBatches = nextBatches.filter(
            (batch) => !(course.batchSummaries || []).some((summary) => summary._id === batch._id)
          )

          nextSelections[course._id] = availableBatches[0]?._id || ''
        }

        return nextSelections
      })
    },
    [hub?._id, token]
  )

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadCourses = async () => {
      try {
        setLoading(true)
        setError('')
        await loadCoursesWorkspace(controller.signal)
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Failed to load your hub courses.')
          setCourses([])
          setBatches([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadCourses()

    return () => controller.abort()
  }, [hub?._id, loadCoursesWorkspace])

  const basePath = `/hub/${hub.slug}/dashboard`
  const batchOptionsByCourse = useMemo(
    () =>
      Object.fromEntries(
        courses.map((course) => [
          course._id,
          batches.filter((batch) => !(course.batchSummaries || []).some((summary) => summary._id === batch._id)),
        ])
      ),
    [batches, courses]
  )

  const handleDeleteCourse = async () => {
    if (!courseToDelete?._id) {
      return
    }

    try {
      setDeletingCourseId(courseToDelete._id)
      setError('')
      setSuccess('')
      await deleteCourse(token, courseToDelete._id)
      setCourses((current) => current.filter((course) => course._id !== courseToDelete._id))
      setCourseToDelete(null)
      setSuccess(`"${courseToDelete.title}" was deleted.`)
    } catch {
      setError('Failed to delete')
    } finally {
      setDeletingCourseId('')
    }
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Reusable Courses</p>
            <h2>Secondary course products inside {hub.name}</h2>
            <p>
              Courses still support modules and lessons, but they now act as reusable content blocks
              that can be packaged into one or more batches.
            </p>
          </div>

          <div className="dashboard-page__actions">
            <Link to={`${basePath}/courses/create`} className="dashboard-button">
              Create Course
            </Link>
            <Link to={`${basePath}/batches`} className="dashboard-button--ghost">
              Manage Batches
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}
      {success ? <p className="dashboard-success">{success}</p> : null}

      {loading ? (
        <section className="dashboard-panel">
          <p className="dashboard-muted">Loading hub courses...</p>
        </section>
      ) : courses.length === 0 ? (
        <section className="dashboard-empty">
          <h2>No courses yet</h2>
          <p>Create the first course for this hub to begin building its catalog.</p>
          <div className="dashboard-access__actions">
            <Link to={`${basePath}/courses/create`} className="dashboard-button">
              Create First Course
            </Link>
          </div>
        </section>
      ) : (
        <section className="dashboard-grid dashboard-grid--cards">
          {courses.map((course) => {
            const availableBatches = batchOptionsByCourse[course._id] || []
            const selectedBatchId = batchSelections[course._id] || ''

            return (
              <DashboardCard
                key={course._id}
                title={course.title}
                description={course.description || 'No description yet.'}
                thumbnail={course.thumbnailUrl || course.thumbnail}
                eyebrow={course.category}
                onOpen={() => navigate(`${basePath}/courses/${course._id}`, { state: { course } })}
                onEdit={() => setCourseToEdit(course)}
                onDelete={() => setCourseToDelete(course)}
                badges={[
                  <span key="status" className={course.isPublished ? 'dashboard-pill dashboard-pill--success' : 'dashboard-pill dashboard-pill--warning'}>
                    {course.isPublished ? 'Published' : 'Draft'}
                  </span>,
                ]}
                meta={[
                  { label: 'Price', value: formatPrice(course) },
                  { label: 'Videos', value: course.videoCount || 0 },
                  { label: 'Level', value: course.level },
                  {
                    label: 'Created',
                    value: course.createdAt ? new Date(course.createdAt).toLocaleDateString() : 'Recently',
                  },
                  { label: 'Used in', value: `${course.batchCount || 0} batches` },
                ]}
              >
                <div className="dashboard-pill-row">
                    <span className="dashboard-pill dashboard-pill--neutral">{course.category}</span>
                </div>

                {course.batchSummaries?.length ? (
                  <div className="dashboard-pill-row">
                    {course.batchSummaries.map((batch) => (
                      <Link
                        key={batch._id}
                        to={`${basePath}/batches/${batch._id}`}
                        className="dashboard-pill dashboard-pill--neutral"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {batch.title}
                      </Link>
                    ))}
                  </div>
                ) : null}

                <div className="dashboard-inline-actions" onClick={(event) => event.stopPropagation()}>
                  <Link to={`${basePath}/courses/${course._id}`} state={{ course }} className="dashboard-button">
                    Open Course
                  </Link>
                  <Link
                    to={`${basePath}/videos/upload?courseId=${course._id}&type=course`}
                    state={{ course }}
                    className="dashboard-button--ghost"
                  >
                    Add Video
                  </Link>
                </div>

                <div className="dashboard-selector-row" onClick={(event) => event.stopPropagation()}>
                  <select
                    value={selectedBatchId}
                    onChange={(event) =>
                      setBatchSelections((current) => ({
                        ...current,
                        [course._id]: event.target.value,
                      }))
                    }
                    disabled={availableBatches.length === 0}
                  >
                    <option value="">
                      {availableBatches.length === 0 ? 'Already in all batches' : 'Choose a batch'}
                    </option>
                    {availableBatches.map((batch) => (
                      <option key={batch._id} value={batch._id}>
                        {batch.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="dashboard-button"
                    disabled={!selectedBatchId || addingCourseId === course._id}
                    onClick={async () => {
                      if (!selectedBatchId) {
                        return
                      }

                      try {
                        setAddingCourseId(course._id)
                        setError('')
                        setSuccess('')
                        await addCourseToBatch(token, selectedBatchId, course._id)
                        await loadCoursesWorkspace()
                        setSuccess(`"${course.title}" was added to the selected batch.`)
                      } catch (addError) {
                        setError(addError.message || 'Failed to add course to batch.')
                      } finally {
                        setAddingCourseId('')
                      }
                    }}
                  >
                    {addingCourseId === course._id ? 'Adding...' : 'Add to Batch'}
                  </button>
                </div>
              </DashboardCard>
            )
          })}
        </section>
      )}

      {courseToDelete ? (
        <DashboardModal
          title="Delete course"
          confirmLabel="Delete"
          variant="danger"
          busy={deletingCourseId === courseToDelete._id}
          onCancel={() => setCourseToDelete(null)}
          onConfirm={handleDeleteCourse}
        >
          <p>Are you sure you want to delete this?</p>
        </DashboardModal>
      ) : null}

      {courseToEdit ? (
        <EditPlaceholderModal
          itemType="course"
          itemName={courseToEdit.title}
          openTo={`${basePath}/courses/${courseToEdit._id}`}
          onClose={() => setCourseToEdit(null)}
        />
      ) : null}
    </div>
  )
}

export default CoursesList
