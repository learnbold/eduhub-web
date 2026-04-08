import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { updateHubSettings } from '../../utils/dashboardApi'

function HubSettings() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { hub, memberRole, updateCurrentHub } = useOutletContext()
  const [formValues, setFormValues] = useState({
    name: '',
    slug: '',
    description: '',
    logo: '',
    banner: '',
    primaryColor: '#0f172a',
    secondaryColor: '#f59e0b',
    customDomain: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!hub) {
      return
    }

    setFormValues({
      name: hub.name || '',
      slug: hub.slug || '',
      description: hub.description || '',
      logo: hub.logo || '',
      banner: hub.banner || '',
      primaryColor: hub.primaryColor || '#0f172a',
      secondaryColor: hub.secondaryColor || '#f59e0b',
      customDomain: hub.customDomain || '',
    })
  }, [hub])

  const subscription = hub?.subscription
  const canUseCustomBranding = Boolean(subscription?.capabilities?.features?.customBranding)
  const canUseCustomDomain = Boolean(subscription?.capabilities?.features?.customDomain)

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormValues((currentValues) => ({ ...currentValues, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setSuccess('')

      const payload = {
        name: formValues.name,
        slug: formValues.slug,
        description: formValues.description,
        ...(canUseCustomBranding
          ? {
              logo: formValues.logo,
              banner: formValues.banner,
              primaryColor: formValues.primaryColor,
              secondaryColor: formValues.secondaryColor,
            }
          : {}),
        ...(canUseCustomDomain ? { customDomain: formValues.customDomain } : {}),
      }

      const response = await updateHubSettings(token, hub._id, payload)
      const nextHub = response.hub

      updateCurrentHub(nextHub)
      setSuccess('Hub settings updated successfully.')

      if (nextHub.slug && nextHub.slug !== hub.slug) {
        navigate(`/hub/${nextHub.slug}/dashboard/settings`, { replace: true })
      }
    } catch (submitError) {
      setError(submitError.message || 'Failed to update hub settings.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (memberRole === 'teacher') {
    return (
      <div className="dashboard-page">
        <section className="dashboard-panel">
          <p className="dashboard-section-kicker">Hub Settings</p>
          <h2>Owner or admin access required</h2>
          <p>Teachers can create content, but only owner and admins can edit hub branding and identity.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Hub Settings</p>
            <h2>Customize the public identity of {hub.name}</h2>
            <p>Update branding, colors, copy, and route identity without leaving the hub dashboard.</p>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}
      {success ? <p className="dashboard-success">{success}</p> : null}

      {!canUseCustomBranding ? (
        <div className="dashboard-info">
          Upgrade to Pro to unlock custom branding, banner ads, and a more premium public hub.
          <Link to="/become-teacher" className="dashboard-link-button">
            Upgrade
          </Link>
        </div>
      ) : null}

      <section className="dashboard-form-card">
        <form className="dashboard-form" onSubmit={handleSubmit}>
          <div className="dashboard-form__grid">
            <label className="dashboard-field">
              <span>Hub Name</span>
              <input type="text" name="name" value={formValues.name} onChange={handleChange} required />
            </label>

            <label className="dashboard-field">
              <span>Hub Slug</span>
              <input type="text" name="slug" value={formValues.slug} onChange={handleChange} required />
            </label>
          </div>

          <label className="dashboard-field">
            <span>Description</span>
            <textarea
              name="description"
              value={formValues.description}
              onChange={handleChange}
              placeholder="Describe the teaching promise and tone of this hub."
            />
          </label>

          <div className="dashboard-form__grid">
            <label className="dashboard-field">
              <span>Logo URL</span>
              <input
                type="url"
                name="logo"
                value={formValues.logo}
                onChange={handleChange}
                disabled={!canUseCustomBranding}
              />
            </label>

            <label className="dashboard-field">
              <span>Banner URL</span>
              <input
                type="url"
                name="banner"
                value={formValues.banner}
                onChange={handleChange}
                disabled={!canUseCustomBranding}
              />
            </label>
          </div>

          <div className="dashboard-form__grid">
            <label className="dashboard-field">
              <span>Primary Color</span>
              <input
                type="text"
                name="primaryColor"
                value={formValues.primaryColor}
                onChange={handleChange}
                disabled={!canUseCustomBranding}
              />
            </label>

            <label className="dashboard-field">
              <span>Secondary Color</span>
              <input
                type="text"
                name="secondaryColor"
                value={formValues.secondaryColor}
                onChange={handleChange}
                disabled={!canUseCustomBranding}
              />
            </label>
          </div>

          <label className="dashboard-field">
            <span>Custom Domain</span>
            <input
              type="text"
              name="customDomain"
              value={formValues.customDomain}
              onChange={handleChange}
              placeholder="learn.yourbrand.com"
              disabled={!canUseCustomDomain}
            />
          </label>

          <div className="dashboard-brand-preview dashboard-brand-preview--settings">
            {formValues.logo ? (
              <img src={formValues.logo} alt={`${formValues.name} logo preview`} className="dashboard-brand-preview__logo" />
            ) : null}
            <div>
              <h3>{formValues.name || 'Hub Preview'}</h3>
              <p className="dashboard-muted">{formValues.description || 'Describe your hub here.'}</p>
              <div className="dashboard-color-row">
                <span className="dashboard-color-chip" style={{ backgroundColor: formValues.primaryColor }} />
                <span className="dashboard-color-chip" style={{ backgroundColor: formValues.secondaryColor }} />
              </div>
            </div>
          </div>

          <div className="dashboard-inline-actions">
            <button type="submit" className="dashboard-button" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Hub Settings'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default HubSettings
