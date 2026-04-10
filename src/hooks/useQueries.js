import { useQuery } from '@tanstack/react-query'
import { fetchPublicCourseBySlug, fetchPublicHubPage } from '../utils/dashboardApi'
import { useAuth } from '../context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const fetchCourses = async ({ signal }) => {
  const response = await fetch(`${API_BASE_URL}/courses`, { signal })
  if (!response.ok) throw new Error('Failed to fetch courses')
  const data = await response.json()
  return Array.isArray(data) ? data : Array.isArray(data.courses) ? data.courses : []
}

export const useCourses = () => {
  return useQuery({
    queryKey: ['courses'],
    queryFn: fetchCourses,
  })
}

export const usePublicCourse = (slug, options = {}) => {
  return useQuery({
    queryKey: ['course', slug],
    queryFn: ({ signal }) => fetchPublicCourseBySlug(slug, signal),
    enabled: !!slug,
    ...options,
  })
}

export const usePublicHub = (slug, options = {}) => {
  return useQuery({
    queryKey: ['hub', slug],
    queryFn: ({ signal }) => fetchPublicHubPage(slug, signal),
    enabled: !!slug,
    ...options,
  })
}

// Added this based on instructions, though current user is mostly handled in AuthContext
// This gives a nice generic hook if needed elsewhere
export const useCurrentUser = () => {
  const { user, token } = useAuth()
  
  return useQuery({
    queryKey: ['me', token],
    queryFn: async ({ signal }) => {
      if (!token) return null
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal
      })
      if (!response.ok) throw new Error('Failed to fetch user')
      return response.json()
    },
    enabled: !!token,
    initialData: user, // Use context as initial data if available
  })
}
