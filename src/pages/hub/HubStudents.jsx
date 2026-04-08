import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchManagedHubBatches } from '../../utils/dashboardApi'

function HubStudents() {
  const { token } = useAuth()
  const { hub } = useOutletContext()
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadBatchStudents = async () => {
      try {
        setLoading(true)
        setError('')
        const nextBatches = await fetchManagedHubBatches(token, hub._id, controller.signal)

        if (!controller.signal.aborted) {
          setBatches(nextBatches)
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Failed to load batch students.')
          setBatches([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadBatchStudents()

    return () => controller.abort()
  }, [hub?._id, token])

  const uniqueStudentCount = useMemo(() => {
    return batches.reduce((count, batch) => count + Number(batch.studentCount || 0), 0)
  }, [batches])

  const basePath = `/hub/${hub.slug}/dashboard`

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Students</p>
            <h2>Student access now flows through batches</h2>
            <p>
              Batch enrollment is now the primary access model, so student operations can be tracked
              by bundle instead of only by individual course.
            </p>
          </div>
          <div className="dashboard-page__actions">
            <Link to={`${basePath}/batches`} className="dashboard-button">
              Open Batches
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}

      <section className="dashboard-grid dashboard-grid--stats">
        <article className="dashboard-stat">
          <span>Total Batches</span>
          <strong>{loading ? '--' : batches.length}</strong>
          <p>Batches currently available for enrollment and cohort delivery.</p>
        </article>

        <article className="dashboard-stat">
          <span>Distinct Students</span>
          <strong>{loading ? '--' : uniqueStudentCount}</strong>
          <p>Unique learners attached across batch enrollments.</p>
        </article>
      </section>

      {loading ? (
        <section className="dashboard-panel">
          <p className="dashboard-muted">Loading batch student data...</p>
        </section>
      ) : batches.length === 0 ? (
        <section className="dashboard-empty">
          <h2>No batch enrollments yet</h2>
          <p>Create a batch first so students have a bundle to join.</p>
        </section>
      ) : (
        <section className="dashboard-list">
          {batches.map((batch) => (
            <article key={batch._id} className="dashboard-member-card">
              <strong>{batch.title}</strong>
              <p className="dashboard-muted">
                {batch.studentCount} students • {batch.courseCount} courses • {batch.videoCount} videos
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

export default HubStudents
