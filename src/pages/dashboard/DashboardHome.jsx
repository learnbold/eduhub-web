import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  fetchHubActivity,
  fetchHubTeam,
  fetchManagedHubCourses,
  fetchManagedHubVideos,
} from '../../utils/dashboardApi'

function DashboardHome() {
  const { token } = useAuth()
  const { hub, memberRole } = useOutletContext()
  const [stats, setStats] = useState({
    courses: 0,
    courseVideos: 0,
    standaloneVideos: 0,
    teamMembers: 1,
  })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadOverview = async () => {
      try {
        setLoading(true)
        setError('')

        const [courses, videos, team, activity] = await Promise.all([
          fetchManagedHubCourses(token, hub._id, controller.signal),
          fetchManagedHubVideos(token, hub._id, controller.signal),
          memberRole === 'teacher'
            ? Promise.resolve({ owner: hub.ownerProfile, admins: [], teachers: [] })
            : fetchHubTeam(token, hub._id, controller.signal),
          memberRole === 'teacher'
            ? Promise.resolve([])
            : fetchHubActivity(token, hub._id, controller.signal).catch(() => []),
        ])

        if (controller.signal.aborted) {
          return
        }

        const standaloneVideos = videos.filter((video) => video.videoType === 'standalone')
        const courseVideos = videos.filter((video) => video.videoType !== 'standalone')

        setStats({
          courses: courses.length,
          courseVideos: courseVideos.length,
          standaloneVideos: standaloneVideos.length,
          teamMembers: 1 + (team?.admins?.length || 0) + (team?.teachers?.length || 0),
        })
        setRecentActivity(activity.slice(0, 5))
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Failed to load your hub overview.')
          setStats({
            courses: 0,
            courseVideos: 0,
            standaloneVideos: 0,
            teamMembers: 1,
          })
          setRecentActivity([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadOverview()

    return () => controller.abort()
  }, [hub?._id, hub?.ownerProfile, memberRole, token])

  const hubDashboardBasePath = `/hub/${hub.slug}/dashboard`
  const ownerName = hub.ownerProfile?.displayName || hub.name

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Hub Overview</p>
            <h2>Operate {hub.name} like a real creator platform</h2>
            <p>
              This hub now combines public branding, team governance, and content operations inside
              one private workspace.
            </p>
          </div>

          <div className="dashboard-page__actions">
            <Link to={`${hubDashboardBasePath}/courses/create`} className="dashboard-button">
              Create Course
            </Link>
            <Link
              to={`${hubDashboardBasePath}/videos/upload?type=standalone`}
              className="dashboard-button--ghost"
            >
              Post Hub Update
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}

      <section className="dashboard-grid dashboard-grid--stats" aria-label="Hub stats">
        <article className="dashboard-stat">
          <span>Courses</span>
          <strong>{loading ? '--' : stats.courses}</strong>
          <p>Structured learning products inside this hub.</p>
        </article>

        <article className="dashboard-stat">
          <span>Course Videos</span>
          <strong>{loading ? '--' : stats.courseVideos}</strong>
          <p>Lesson videos attached to courses.</p>
        </article>

        <article className="dashboard-stat">
          <span>Hub Updates</span>
          <strong>{loading ? '--' : stats.standaloneVideos}</strong>
          <p>Standalone videos for your public hub feed.</p>
        </article>

        <article className="dashboard-stat">
          <span>Team Members</span>
          <strong>{loading ? '--' : stats.teamMembers}</strong>
          <p>Owner, admins, and teachers working in this hub.</p>
        </article>
      </section>

      <section className="dashboard-hero">
        <article className="dashboard-panel">
          <p className="dashboard-section-kicker">Identity</p>
          <h2>{hub.name}</h2>
          <p className="dashboard-muted">
            {hub.description || `${ownerName}'s branded hub on Sparklass.`}
          </p>

          <div className="dashboard-detail-grid">
            <div>
              <span>Owner</span>
              <strong>{ownerName}</strong>
            </div>
            <div>
              <span>Your Hub Role</span>
              <strong>{memberRole}</strong>
            </div>
            <div>
              <span>Primary Color</span>
              <strong>{hub.primaryColor}</strong>
            </div>
            <div>
              <span>Public URL</span>
              <strong>{`/hub/${hub.slug}`}</strong>
            </div>
          </div>
        </article>

        <article className="dashboard-panel dashboard-hero__panel">
          <div className="dashboard-brand-preview">
            {hub.logo ? (
              <img src={hub.logo} alt={`${hub.name} logo`} className="dashboard-brand-preview__logo" />
            ) : null}
            <div>
              <p className="dashboard-section-kicker">Branding</p>
              <h3>{hub.name}</h3>
              <div className="dashboard-color-row">
                <span
                  className="dashboard-color-chip"
                  style={{ backgroundColor: hub.primaryColor }}
                />
                <span
                  className="dashboard-color-chip"
                  style={{ backgroundColor: hub.secondaryColor }}
                />
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Governance</p>
            <h2>Recent hub activity</h2>
            <p>Owners and admins can see operational activity happening inside this hub.</p>
          </div>
          {memberRole !== 'teacher' ? (
            <Link to={`${hubDashboardBasePath}/admin`} className="dashboard-button--ghost">
              Open Admin Panel
            </Link>
          ) : null}
        </div>

        {memberRole === 'teacher' ? (
          <div className="dashboard-info">
            Activity feeds are visible to hub owners and admins. You still have content creation
            access in this workspace.
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="dashboard-empty">
            <h3>No recent activity yet</h3>
            <p>Team actions like course creation and video uploads will appear here.</p>
          </div>
        ) : (
          <div className="dashboard-activity-list">
            {recentActivity.map((activity) => (
              <article
                key={`${activity.timestamp}-${activity._id || activity.action}`}
                className="dashboard-activity-item"
              >
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

export default DashboardHome
