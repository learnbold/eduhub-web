import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function HubDashboardRedirect() {
  const { hub, isHubLoading, loadTeacherHub } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!hub) {
      loadTeacherHub({ force: true }).catch((loadError) => {
        setError(loadError.message || 'Failed to load your hub.')
      })
    }
  }, [hub, loadTeacherHub])

  if (hub?.slug) {
    return <Navigate to={`/hub/${hub.slug}/dashboard`} replace />
  }

  return (
    <main className="dashboard-access">
      <section className="dashboard-access__card">
        <p className="dashboard-section-kicker">Teacher Hub</p>
        <h1>{error ? 'Hub unavailable' : 'Redirecting to your hub'}</h1>
        <p>
          {error ||
            (isHubLoading
              ? 'We are loading the hub attached to your teacher account.'
              : 'Preparing your teacher hub now.')}
        </p>
      </section>
    </main>
  )
}

export default HubDashboardRedirect
