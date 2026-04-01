import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { addHubAdmin, addHubTeacher, fetchHubTeam } from '../../utils/dashboardApi'

function HubTeamManagement() {
  const { token } = useAuth()
  const { hub, memberRole } = useOutletContext()
  const [team, setTeam] = useState({
    owner: null,
    admins: [],
    teachers: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [teacherEmail, setTeacherEmail] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadTeam = async () => {
      try {
        setLoading(true)
        setError('')
        const nextTeam = await fetchHubTeam(token, hub._id, controller.signal)

        if (!controller.signal.aborted) {
          setTeam(nextTeam)
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Failed to load hub team.')
          setTeam({
            owner: null,
            admins: [],
            teachers: [],
          })
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadTeam()

    return () => controller.abort()
  }, [hub?._id, token])

  const refreshTeam = async () => {
    const nextTeam = await fetchHubTeam(token, hub._id)
    setTeam(nextTeam)
    return nextTeam
  }

  const handleAddTeacher = async (event) => {
    event.preventDefault()

    if (!teacherEmail.trim() || isSubmitting) {
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setSuccess('')
      await addHubTeacher(token, hub._id, { email: teacherEmail.trim() })
      await refreshTeam()
      setTeacherEmail('')
      setSuccess('Teacher added to the hub team.')
    } catch (submitError) {
      setError(submitError.message || 'Failed to add teacher.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddAdmin = async (event) => {
    event.preventDefault()

    if (!adminEmail.trim() || isSubmitting) {
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setSuccess('')
      await addHubAdmin(token, hub._id, { email: adminEmail.trim() })
      await refreshTeam()
      setAdminEmail('')
      setSuccess('Admin added to the hub team.')
    } catch (submitError) {
      setError(submitError.message || 'Failed to add admin.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderMemberCard = (title, members) => (
    <section className="dashboard-panel">
      <div className="dashboard-page__header">
        <div>
          <p className="dashboard-section-kicker">{title}</p>
          <h3>{title} members</h3>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="dashboard-empty">
          <h3>No members yet</h3>
          <p>This role does not have any assigned users yet.</p>
        </div>
      ) : (
        <div className="dashboard-team-grid">
          {members.map((member) => (
            <article key={member._id} className="dashboard-member-card">
              <strong>{member.displayName}</strong>
              <p className="dashboard-muted">{member.email || member.username || 'Sparklass member'}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )

  if (memberRole === 'teacher') {
    return (
      <div className="dashboard-page">
        <section className="dashboard-panel">
          <p className="dashboard-section-kicker">Team Management</p>
          <h2>Owner or admin access required</h2>
          <p>
            Teachers can create content, but only hub owners and admins can manage the team inside
            this workspace.
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
            <p className="dashboard-section-kicker">Teachers</p>
            <h2>Manage the team inside {hub.name}</h2>
            <p>Owners can assign admins, and admins can add teachers to the hub workspace.</p>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}
      {success ? <p className="dashboard-success">{success}</p> : null}

      {loading ? (
        <section className="dashboard-panel">
          <p className="dashboard-muted">Loading hub team...</p>
        </section>
      ) : (
        <>
          <section className="dashboard-panel">
            <p className="dashboard-section-kicker">Owner</p>
            <h3>{team.owner?.displayName || 'Hub Owner'}</h3>
            <p className="dashboard-muted">{team.owner?.email || 'Owner account'}</p>
          </section>

          <section className="dashboard-grid dashboard-grid--forms">
            <section className="dashboard-form-card">
              <p className="dashboard-section-kicker">Add Teacher</p>
              <form className="dashboard-form" onSubmit={handleAddTeacher}>
                <label className="dashboard-field">
                  <span>Teacher Email</span>
                  <input
                    type="email"
                    value={teacherEmail}
                    onChange={(event) => setTeacherEmail(event.target.value)}
                    placeholder="teacher@example.com"
                    required
                  />
                </label>
                <button type="submit" className="dashboard-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Add Teacher'}
                </button>
              </form>
            </section>

            {memberRole === 'owner' ? (
              <section className="dashboard-form-card">
                <p className="dashboard-section-kicker">Add Admin</p>
                <form className="dashboard-form" onSubmit={handleAddAdmin}>
                  <label className="dashboard-field">
                    <span>Admin Email</span>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(event) => setAdminEmail(event.target.value)}
                      placeholder="admin@example.com"
                      required
                    />
                  </label>
                  <button type="submit" className="dashboard-button" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Add Admin'}
                  </button>
                </form>
              </section>
            ) : (
              <section className="dashboard-form-card">
                <p className="dashboard-section-kicker">Admin Roles</p>
                <h3>Owner-only action</h3>
                <p className="dashboard-muted">
                  Only the hub owner can promote members into the admin role.
                </p>
              </section>
            )}
          </section>

          {renderMemberCard('Admins', team.admins)}
          {renderMemberCard('Teachers', team.teachers)}
        </>
      )}
    </div>
  )
}

export default HubTeamManagement
