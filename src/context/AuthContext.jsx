import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const TOKEN_STORAGE_KEY = 'token'
const USER_STORAGE_KEY = 'auth_user'
const HUB_STORAGE_KEY = 'teacher_hub'

const AuthContext = createContext(null)

const parseStoredValue = (storageKey) => {
  const storedValue = localStorage.getItem(storageKey)

  if (!storedValue) {
    return null
  }

  try {
    return JSON.parse(storedValue)
  } catch {
    localStorage.removeItem(storageKey)
    return null
  }
}

const buildErrorMessage = (fallbackMessage, payload) => {
  if (payload?.message) {
    return payload.message
  }

  if (payload?.error) {
    return payload.error
  }

  return fallbackMessage
}

const requestAuth = async (endpoint, payload) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseBody = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(
        buildErrorMessage(`Request failed with status ${response.status}`, responseBody)
      )
    }

    if (!responseBody?.token || !responseBody?.user) {
      throw new Error('Invalid authentication response from server.')
    }

    return responseBody
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to reach authentication service.')
    }

    throw error
  }
}

const requestAuthorized = async (
  endpoint,
  token,
  { method = 'GET', body, signal } = {}
) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const responseBody = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(
        buildErrorMessage(`Request failed with status ${response.status}`, responseBody)
      )
    }

    return responseBody
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Unable to reach authentication service.')
    }

    throw error
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '')
  const [user, setUser] = useState(() => parseStoredValue(USER_STORAGE_KEY))
  const [hub, setHub] = useState(() => parseStoredValue(HUB_STORAGE_KEY))
  const [isHubLoading, setIsHubLoading] = useState(false)

  const persistHub = (nextHub) => {
    setHub(nextHub || null)

    if (nextHub) {
      localStorage.setItem(HUB_STORAGE_KEY, JSON.stringify(nextHub))
    } else {
      localStorage.removeItem(HUB_STORAGE_KEY)
    }
  }

  const updateStoredHub = (nextHub) => {
    persistHub(nextHub)
  }

  const persistAuth = (authPayload) => {
    const nextToken = authPayload?.token || ''
    const nextUser = authPayload?.user || null
    const hasHub = Object.prototype.hasOwnProperty.call(authPayload || {}, 'hub')

    setToken(nextToken)
    setUser(nextUser)

    if (nextToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }

    if (nextUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser))
    } else {
      localStorage.removeItem(USER_STORAGE_KEY)
    }

    if (hasHub) {
      persistHub(authPayload?.hub || null)
    } else {
      persistHub(null)
    }
  }

  const login = async ({ email, password }) => {
    const authPayload = await requestAuth('/auth/login', { email, password })

    persistAuth(authPayload)
    return authPayload
  }

  const register = async ({ name, email, password }) => {
    const authPayload = await requestAuth('/auth/register', { name, email, password })

    persistAuth(authPayload)
    return authPayload
  }

  const loadTeacherHub = async ({ force = false, signal } = {}) => {
    if (!token) {
      throw new Error('Login required to load your hub.')
    }

    if (user?.role !== 'teacher') {
      persistHub(null)
      return null
    }

    if (!force && hub) {
      return hub
    }

    try {
      setIsHubLoading(true)
      const responseBody = await requestAuthorized('/hub/me', token, { signal })
      const nextHub = responseBody?.hub || null

      if (!nextHub) {
        throw new Error('Invalid hub response from server.')
      }

      persistHub(nextHub)
      return nextHub
    } finally {
      setIsHubLoading(false)
    }
  }

  const becomeTeacher = async () => {
    if (!token) {
      throw new Error('Login required to become a teacher.')
    }

    const responseBody = await requestAuthorized('/auth/become-teacher', token, {
      method: 'PATCH',
    })

    if (!responseBody?.user || !responseBody?.hub) {
      throw new Error('Invalid teacher upgrade response from server.')
    }

    persistAuth({
      token,
      user: responseBody.user,
      hub: responseBody.hub,
    })

    return responseBody
  }

  const logout = () => {
    persistAuth({ token: '', user: null, hub: null })
  }

  useEffect(() => {
    if (!token || user?.role !== 'teacher' || hub) {
      if (user?.role !== 'teacher' && hub) {
        persistHub(null)
      }

      return undefined
    }

    const controller = new AbortController()

    loadTeacherHub({ signal: controller.signal }).catch(() => {})

    return () => controller.abort()
  }, [token, user?.role, hub])

  const value = useMemo(
    () => ({
      user,
      token,
      hub,
      isAuthenticated: Boolean(token),
      isHubLoading,
      login,
      register,
      loadTeacherHub,
      becomeTeacher,
      updateStoredHub,
      logout,
    }),
    [token, user, hub, isHubLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
