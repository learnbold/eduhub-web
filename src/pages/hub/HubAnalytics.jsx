import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchManagedHubBatches } from '../../utils/dashboardApi'

function HubAnalytics() {
  const { token } = useAuth()
  const { hub } = useOutletContext()
  const subscription = hub?.subscription
  const canUseBasicAnalytics = Boolean(subscription?.capabilities?.features?.analyticsBasic)
  const canUseAdvancedAnalytics = Boolean(subscription?.capabilities?.features?.analyticsAdvanced)
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadAnalytics = async () => {
      try {
        setLoading(true)
        setError('')
        const nextBatches = await fetchManagedHubBatches(token, hub._id, controller.signal)

        if (!controller.signal.aborted) {
          setBatches(nextBatches)
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Failed to load analytics.')
          setBatches([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadAnalytics()

    return () => controller.abort()
  }, [hub?._id, token])

  const analytics = useMemo(() => {
    const enrollments = batches.reduce((sum, batch) => sum + Number(batch.studentCount || 0), 0)
    const revenue = batches.reduce(
      (sum, batch) => sum + Number(batch.studentCount || 0) * Number(batch.price || 0),
      0
    )
    const activeOffers = batches.filter((batch) => !batch.isPlanArchived).length
    const archivedOffers = batches.filter((batch) => batch.isPlanArchived).length
    const topPerformers = [...batches]
      .sort(
        (left, right) =>
          Number(right.studentCount || 0) * Number(right.price || 0) -
          Number(left.studentCount || 0) * Number(left.price || 0)
      )
      .slice(0, 3)

    return {
      enrollments,
      revenue,
      activeOffers,
      archivedOffers,
      topPerformers,
    }
  }, [batches])

  if (!canUseBasicAnalytics) {
    return (
      <div className="dashboard-page">
        <section className="dashboard-panel">
          <div className="dashboard-page__header">
            <div>
              <p className="dashboard-section-kicker">Analytics</p>
              <h2>Upgrade to Pro to unlock analytics</h2>
              <p>
                Pro gives you revenue visibility, enrollment summaries, and the first layer of
                creator performance reporting inside your hub.
              </p>
            </div>

            <div className="dashboard-page__actions">
              <Link to="/become-teacher" className="dashboard-button">
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </section>

        <section className="dashboard-empty">
          <h2>Analytics are plan-gated</h2>
          <p>
            Free teachers can launch fast, and Pro unlocks the visibility needed to grow the
            business side of the hub.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Analytics</p>
            <h2>Measure how {hub.name} is performing</h2>
            <p>
              Pro surfaces monetization essentials, and Premium adds the deeper engagement layer as
              those datasets mature.
            </p>
          </div>

          {!canUseAdvancedAnalytics ? (
            <div className="dashboard-page__actions">
              <Link to="/become-teacher" className="dashboard-button--ghost">
                Upgrade to Premium
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}

      <section className="dashboard-grid dashboard-grid--stats">
        <article className="dashboard-stat">
          <span>Hub Views</span>
          <strong>{loading ? '--' : 'Soon'}</strong>
          <p>View tracking hooks are reserved for the billing-ready analytics pipeline.</p>
        </article>

        <article className="dashboard-stat">
          <span>Enrollments</span>
          <strong>{loading ? '--' : analytics.enrollments}</strong>
          <p>Total students enrolled across all active and archived plan batches.</p>
        </article>

        <article className="dashboard-stat">
          <span>Revenue Summary</span>
          <strong>{loading ? '--' : `INR ${analytics.revenue.toLocaleString()}`}</strong>
          <p>Projected gross revenue based on batch price multiplied by current student count.</p>
        </article>

        <article className="dashboard-stat">
          <span>Active Offers</span>
          <strong>{loading ? '--' : analytics.activeOffers}</strong>
          <p>Plan-visible batches currently available for new students inside this hub.</p>
        </article>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Premium Layer</p>
            <h3>Advanced analytics</h3>
            <p>
              Premium keeps the deeper engagement surface open as richer event data and reporting
              APIs arrive.
            </p>
          </div>
        </div>

        {canUseAdvancedAnalytics ? (
          <div className="dashboard-grid dashboard-grid--forms">
            <article className="dashboard-form-card">
              <p className="dashboard-section-kicker">Student Engagement</p>
              <h3>Tracking soon</h3>
              <p className="dashboard-muted">
                Watch time, repeat sessions, and completion-style engagement metrics will land here.
              </p>
            </article>

            <article className="dashboard-form-card">
              <p className="dashboard-section-kicker">Retention</p>
              <h3>Tracking soon</h3>
              <p className="dashboard-muted">
                Renewal patterns, active learner streaks, and reactivation indicators will appear here.
              </p>
            </article>

            <article className="dashboard-form-card" style={{ gridColumn: '1 / -1' }}>
              <p className="dashboard-section-kicker">Performance per Batch</p>
              {analytics.topPerformers.length === 0 ? (
                <p className="dashboard-muted">Create batches to unlock performance comparisons.</p>
              ) : (
                <div className="dashboard-list">
                  {analytics.topPerformers.map((batch) => (
                    <article key={batch._id} className="dashboard-activity-item">
                      <strong>{batch.title}</strong>
                      <p className="dashboard-muted">
                        {batch.studentCount} students - INR{' '}
                        {(Number(batch.studentCount || 0) * Number(batch.price || 0)).toLocaleString()}
                        {batch.isPlanArchived ? ' - archived by plan' : ''}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </div>
        ) : (
          <div className="dashboard-info">
            Upgrade to Premium for team-scale analytics, engagement reporting, retention tracking,
            and per-batch performance views.
          </div>
        )}
      </section>

      <section className="dashboard-panel">
        <p className="dashboard-section-kicker">Lifecycle Visibility</p>
        <h3>Subscription-aware inventory</h3>
        <p className="dashboard-muted">
          {loading
            ? 'Preparing batch inventory stats...'
            : `${analytics.activeOffers} active offers and ${analytics.archivedOffers} plan-archived offers are currently tracked for this hub.`}
        </p>
      </section>
    </div>
  )
}

export default HubAnalytics
