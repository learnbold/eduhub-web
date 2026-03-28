import { createContext, useContext, useMemo, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
const TOKEN_STORAGE_KEY = 'token'
const USER_STORAGE_KEY = 'auth_user'

const AuthContext = createContext(null)

const parseStoredUser = () => {
  const storedUser = localStorage.getItem(USER_STORAGE_KEY)

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser)
  } catch (error) {
    console.error('Failed to parse stored auth user:', error)
    localStorage.removeItem(USER_STORAGE_KEY)
    return null
  }
}

const createMockAuthResponse = ({ name, email }) => {
  const timestamp = Date.now()
  const learnerName =
    name?.trim() || email?.split('@')?.[0]?.replace(/[._-]/g, ' ') || 'Demo Learner'

  return {
    token: `mock-token-${timestamp}`,
    user: {
      id: `mock-user-${timestamp}`,
      name: learnerName.replace(/\b\w/g, (character) => character.toUpperCase()),
      role: 'student',
    },
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

const requestAuth = async (endpoint, payload, mockFactory) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      return response.json()
    }

    const responseBody = await response.json().catch(() => null)

    if (response.status === 404 || response.status >= 500) {
      return mockFactory()
    }

    throw new Error(buildErrorMessage(`Request failed with status ${response.status}`, responseBody))
  } catch (error) {
    if (
      error instanceof TypeError ||
      (error instanceof Error && /fetch|network|failed to fetch/i.test(error.message))
    ) {
      return mockFactory()
    }

    throw error
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY) || '')
  const [user, setUser] = useState(() => parseStoredUser())

  const persistAuth = (authPayload) => {
    const nextToken = authPayload?.token || ''
    const nextUser = authPayload?.user || null

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
  }

  const login = async ({ email, password }) => {
    const authPayload = await requestAuth('/auth/login', { email, password }, () =>
      createMockAuthResponse({ email })
    )

    persistAuth(authPayload)
    return authPayload
  }

  const register = async ({ name, email, password }) => {
    const authPayload = await requestAuth('/auth/register', { name, email, password }, () =>
      createMockAuthResponse({ name, email })
    )

    persistAuth(authPayload)
    return authPayload
  }

  const logout = () => {
    persistAuth({ token: '', user: null })
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
    }),
    [token, user]
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
