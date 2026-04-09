import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { normalizeSubscription } from '../utils/dashboardApi'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')
const TOKEN_STORAGE_KEY = 'token'
const USER_STORAGE_KEY = 'auth_user'
const HUB_STORAGE_KEY = 'teacher_hub'
const SUBSCRIPTION_STORAGE_KEY = 'teacher_subscription'

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
  { method = 'GET', body, signal, headers = {} } = {}
) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...headers,
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
  const [subscription, setSubscription] = useState(() =>
    normalizeSubscription(parseStoredValue(SUBSCRIPTION_STORAGE_KEY))
  )
  const [isHubLoading, setIsHubLoading] = useState(false)
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false)

  const persistHub = useCallback((nextHub) => {
    setHub(nextHub || null)

    if (nextHub) {
      localStorage.setItem(HUB_STORAGE_KEY, JSON.stringify(nextHub))
    } else {
      localStorage.removeItem(HUB_STORAGE_KEY)
    }
  }, [])

  const updateStoredHub = useCallback((nextHub) => {
    persistHub(nextHub)
  }, [persistHub])

  const persistSubscription = useCallback((nextSubscription) => {
    const normalizedSubscription = normalizeSubscription(nextSubscription)

    setSubscription(normalizedSubscription)

    if (normalizedSubscription) {
      localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(normalizedSubscription))
    } else {
      localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY)
    }
  }, [])

  const persistAuth = useCallback((authPayload) => {
    const nextToken = authPayload?.token || ''
    const nextUser = authPayload?.user || null
    const hasHub = Object.prototype.hasOwnProperty.call(authPayload || {}, 'hub')
    const hasSubscription = Object.prototype.hasOwnProperty.call(authPayload || {}, 'subscription')

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

    if (hasSubscription) {
      persistSubscription(authPayload?.subscription || null)
    } else {
      persistSubscription(null)
    }
  }, [persistHub, persistSubscription])

  const login = useCallback(async ({ email, password }) => {
    const authPayload = await requestAuth('/auth/login', { email, password })

    persistAuth(authPayload)
    return authPayload
  }, [persistAuth])

  const register = useCallback(async ({ name, email, password }) => {
    const authPayload = await requestAuth('/auth/register', { name, email, password })

    persistAuth(authPayload)
    return authPayload
  }, [persistAuth])

  const loadTeacherHub = useCallback(async ({ force = false, signal } = {}) => {
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
  }, [hub, persistHub, token, user?.role])

  const loadSubscription = useCallback(async ({ force = false, signal } = {}) => {
    if (!token) {
      throw new Error('Login required to manage a subscription.')
    }

    if (!force && subscription) {
      return subscription
    }

    try {
      setIsSubscriptionLoading(true)
      const responseBody = await requestAuthorized('/subscriptions/me', token, { signal })
      const nextSubscription = normalizeSubscription(responseBody?.subscription)

      if (!nextSubscription) {
        throw new Error('Invalid subscription response from server.')
      }

      persistSubscription(nextSubscription)
      return nextSubscription
    } finally {
      setIsSubscriptionLoading(false)
    }
  }, [persistSubscription, subscription, token])

  const upgradeTeacherPlan = useCallback(async ({ plan, billingCycle, couponCode, referralCode, lifetimeDeal } = {}) => {
    if (!token) {
      throw new Error('Login required to become a teacher.')
    }

    const idempotencyKey = crypto.randomUUID();

    const responseBody = await requestAuthorized('/subscriptions/upgrade', token, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: {
        plan,
        billingCycle,
        couponCode,
        referralCode,
        lifetimeDeal,
      },
    })

    if (!responseBody?.user || !responseBody?.hub || !responseBody?.subscription) {
      throw new Error('Invalid teacher upgrade response from server.')
    }

    persistAuth({
      token,
      user: responseBody.user,
      hub: responseBody.hub,
      subscription: responseBody.subscription,
    })

    return responseBody
  }, [persistAuth, token])

  const becomeTeacher = useCallback(async () => {
    return upgradeTeacherPlan({ plan: 'free', billingCycle: 'monthly' })
  }, [upgradeTeacherPlan])

  const logout = useCallback(() => {
    persistAuth({ token: '', user: null, hub: null, subscription: null })
  }, [persistAuth])

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
  }, [hub, loadTeacherHub, persistHub, token, user?.role])

  useEffect(() => {
    if (!token || subscription) {
      return undefined
    }

    const controller = new AbortController()

    loadSubscription({ signal: controller.signal }).catch(() => {})

    return () => controller.abort()
  }, [loadSubscription, subscription, token])

  const value = useMemo(
    () => ({
      user,
      token,
      hub,
      subscription,
      isAuthenticated: Boolean(token),
      isHubLoading,
      isSubscriptionLoading,
      login,
      register,
      loadTeacherHub,
      loadSubscription,
      upgradeTeacherPlan,
      becomeTeacher,
      updateStoredHub,
      logout,
    }),
    [
      becomeTeacher,
      hub,
      isHubLoading,
      isSubscriptionLoading,
      loadSubscription,
      loadTeacherHub,
      login,
      logout,
      register,
      subscription,
      token,
      updateStoredHub,
      upgradeTeacherPlan,
      user,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
