import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchHubActivity } from '../../utils/dashboardApi'

function HubAdminPanel() {
  const { token } = useAuth()
  const { hub, memberRole } = useOutletContext()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hub?._id || memberRole === 'teacher') {
      setLoading(false)
      return undefined
    }

    const controller = new AbortController()

    const loadActivity = async () => {
      try {
        setLoading(true)
        setError('')
        const nextActivities = await fetchHubActivity(token, hub._id, controller.signal)

        if (!controller.signal.aborted) {
          setActivities(nextActivities)
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Failed to load admin activity.')
          setActivities([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadActivity()

    return () => controller.abort()
  }, [hub?._id, memberRole, token])

  if (memberRole === 'teacher') {
    return (
      <div className="dashboard-page">
        <section className="dashboard-panel">
          <p className="dashboard-section-kicker">Admin Panel</p>
          <h2>Owner or admin access required</h2>
          <p>Only the owner and admins can manage operations, governance, and activity review.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Admin Panel</p>
            <h2>Operate the internal systems of {hub.name}</h2>
            <p>Use this area to supervise team actions, students, content operations, and future monetization.</p>
          </div>
          <div className="dashboard-page__actions">
            <Link to={`/hub/${hub.slug}/dashboard/teachers`} className="dashboard-button--ghost">
              Team Management
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}

      <section className="dashboard-grid dashboard-grid--admin">
        <article className="dashboard-stat">
          <span>Students</span>
          <strong>Coming Soon</strong>
          <p>Hub-level student oversight will land here.</p>
        </article>
        <article className="dashboard-stat">
          <span>Content Ops</span>
          <strong>Active</strong>
          <p>Courses and videos already flow through this hub workspace.</p>
        </article>
        <article className="dashboard-stat">
          <span>Monetization</span>
          <strong>Placeholder</strong>
          <p>Reserved for future revenue and payout tooling.</p>
        </article>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Activity Feed</p>
            <h3>Recent team actions</h3>
          </div>
        </div>

        {loading ? (
          <p className="dashboard-muted">Loading hub activity...</p>
        ) : activities.length === 0 ? (
          <div className="dashboard-empty">
            <h3>No activity logged yet</h3>
            <p>Course creation, uploads, and team changes will appear here.</p>
          </div>
        ) : (
          <div className="dashboard-activity-list">
            {activities.map((activity) => (
              <article key={`${activity.timestamp}-${activity._id || activity.action}`} className="dashboard-activity-item">
                <strong>{activity.action.replace(/_/g, ' ')}</strong>
                <p className="dashboard-muted">
                  {activity.userId?.displayName || 'A team member'} •{' '}
                  {activity.timestamp ? new Date(activity.timestamp).toLocaleString() : 'Recently'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default HubAdminPanel
