import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { fetchManagedHubBySlug } from '../../utils/dashboardApi'
import './dashboard.css'

function HubDashboardLayout() {
  const navigate = useNavigate()
  const { slug = '' } = useParams()
  const { hub: ownedHub, token, logout, updateStoredHub } = useAuth()
  const [currentHub, setCurrentHub] = useState(null)
  const [memberRole, setMemberRole] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token || !slug) {
      return undefined
    }

    const controller = new AbortController()

    const loadHub = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await fetchManagedHubBySlug(token, slug, controller.signal)

        if (controller.signal.aborted) {
          return
        }

        setCurrentHub(response.hub)
        setMemberRole(response.role)

        if (ownedHub?._id && response.hub?._id === ownedHub._id) {
          updateStoredHub(response.hub)
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setCurrentHub(null)
          setMemberRole('')
          setError(loadError.message || 'Failed to load this hub dashboard.')
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadHub()

    return () => controller.abort()
  }, [ownedHub?._id, slug, token, updateStoredHub])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleHubUpdated = (nextHub) => {
    setCurrentHub(nextHub)

    if (ownedHub?._id && nextHub?._id === ownedHub._id) {
      updateStoredHub(nextHub)
    }
  }

  if (loading && !currentHub) {
    return (
      <main className="dashboard-access">
        <section className="dashboard-access__card">
          <p className="dashboard-section-kicker">Teacher Hub</p>
          <h1>Loading hub workspace</h1>
          <p>We are preparing the correct workspace and role permissions for this hub.</p>
        </section>
      </main>
    )
  }

  if (!currentHub) {
    return (
      <main className="dashboard-access">
        <section className="dashboard-access__card">
          <p className="dashboard-section-kicker">Teacher Hub</p>
          <h1>Hub access unavailable</h1>
          <p>{error || 'This hub could not be opened for your account.'}</p>
          <div className="dashboard-access__actions">
            <Link to="/" className="dashboard-button">
              Return Home
            </Link>
          </div>
        </section>
      </main>
    )
  }

  const dashboardStyle = {
    '--hub-primary': currentHub.primaryColor || '#0f172a',
    '--hub-secondary': currentHub.secondaryColor || '#f59e0b',
  }

  return (
    <div className="dashboard-shell" style={dashboardStyle}>
      <Sidebar hub={currentHub} memberRole={memberRole} />

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="dashboard-section-kicker">Hub Dashboard</p>
            <h1>{currentHub.name}</h1>
            <p className="dashboard-muted">
              Role in this hub: <strong>{memberRole}</strong>
            </p>
          </div>

          <div className="dashboard-topbar__actions">
            <Link to={`/hub/${currentHub.slug}`} className="dashboard-button dashboard-button--ghost">
              View Public Hub
            </Link>
            <button type="button" className="dashboard-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <Outlet
            context={{
              hub: currentHub,
              memberRole,
              refreshHub: () => fetchManagedHubBySlug(token, currentHub.slug).then((response) => {
                handleHubUpdated(response.hub)
                setMemberRole(response.role)
                return response
              }),
              updateCurrentHub: handleHubUpdated,
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default HubDashboardLayout
