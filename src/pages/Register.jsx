import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const initialFormState = {
  name: '',
  email: '',
  password: '',
}

function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register, token } = useAuth()
  const [formValues, setFormValues] = useState(initialFormState)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = location.state?.from?.pathname || '/'

  if (token) {
    return <Navigate to={redirectTo} replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((currentValues) => ({ ...currentValues, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setError('')

    try {
      setIsSubmitting(true)
      await register(formValues)
      navigate(redirectTo, { replace: true })
    } catch (submitError) {
      setError(submitError.message || 'Unable to create your account right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card__header">
          <p className="auth-card__eyebrow">Create your account</p>
          <h1>Start your learning journey</h1>
          <p className="auth-card__copy">
            Set up your profile once and keep your lessons, progress, and future access in one
            place.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span>Name</span>
            <input
              type="text"
              name="name"
              placeholder="Your full name"
              autoComplete="name"
              value={formValues.name}
              onChange={handleChange}
              required
            />
          </label>

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={formValues.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              name="password"
              placeholder="Choose a secure password"
              autoComplete="new-password"
              value={formValues.password}
              onChange={handleChange}
              required
            />
          </label>

          {error ? <p className="auth-error">{error}</p> : null}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </main>
  )
}

export default Register
