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
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY)
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
    const authPayload = await requestAuth('/auth/login', { email, password })

    persistAuth(authPayload)
    return authPayload
  }

  const register = async ({ name, email, password }) => {
    const authPayload = await requestAuth('/auth/register', { name, email, password })

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
