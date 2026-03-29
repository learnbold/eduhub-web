import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute({ children, requireTeacher = false }) {
  const location = useLocation()
  const { token, user } = useAuth()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (requireTeacher && user?.role !== 'teacher') {
    return <Navigate to="/" replace state={{ from: location, accessDenied: 'teacher' }} />
  }

  return children || <Outlet />
}

export default ProtectedRoute
