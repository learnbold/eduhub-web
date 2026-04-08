import { NavLink, useParams } from 'react-router-dom'

function Sidebar({ hub, memberRole }) {
  const { slug = '' } = useParams()

  const navigationItems = [
    {
      label: 'Overview',
      to: `/hub/${slug}/dashboard`,
      end: true,
      badge: '01',
    },
    {
      label: 'Batches',
      to: `/hub/${slug}/dashboard/batches`,
      badge: '02',
    },
    {
      label: 'Courses',
      to: `/hub/${slug}/dashboard/courses`,
      badge: '03',
    },
    {
      label: 'Videos',
      to: `/hub/${slug}/dashboard/videos`,
      badge: '04',
    },
    {
      label: 'Students',
      to: `/hub/${slug}/dashboard/students`,
      badge: '05',
    },
    {
      label: 'Settings',
      to: `/hub/${slug}/dashboard/settings`,
      badge: '06',
    },
  ]

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-sidebar__brand">
        {hub?.logo ? (
          <img src={hub.logo} alt={`${hub.name} logo`} className="dashboard-sidebar__logo" />
        ) : (
          <span className="dashboard-sidebar__brand-mark">{hub?.name?.slice(0, 1) || 'H'}</span>
        )}
        <div>
          <strong>{hub?.name || 'Teacher Hub'}</strong>
          <p>{hub?.slug ? `/hub/${hub.slug}` : 'Your creator platform'}</p>
        </div>
      </div>

      <div className="dashboard-sidebar__role">
        <span>Current role</span>
        <strong>{memberRole || 'teacher'}</strong>
      </div>

      <nav className="dashboard-sidebar__nav" aria-label="Dashboard navigation">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive ? 'dashboard-sidebar__link active' : 'dashboard-sidebar__link'
            }
          >
            <span className="dashboard-sidebar__badge">{item.badge}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="dashboard-sidebar__footnote">
        <p>
          This workspace is batch-first: hubs own the brand, while batches now package access to
          courses, videos, students, and future notes.
        </p>
      </div>
    </aside>
  )
}

export default Sidebar
