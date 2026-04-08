import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import './BecomeTeacher.css'

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly', badge: 'Save 20%' },
]

const FAQ_ITEMS = [
  {
    question: 'Can I switch plans later?',
    answer:
      'Yes. You can start free, move into Pro for the 7-day trial, or scale into Premium as your hub grows.',
  },
  {
    question: 'What happens if I cancel?',
    answer:
      'Your most sold batch stays open for new students, while the rest are archived for new signups until you renew.',
  },
  {
    question: 'Do students lose access?',
    answer:
      'No. Existing students keep access to the batches they already joined, even if those batches are archived for new users.',
  },
]

function BecomeTeacher() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    hub,
    isAuthenticated,
    isSubscriptionLoading,
    subscription,
    upgradeTeacherPlan,
    user,
  } = useAuth()
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [activePlan, setActivePlan] = useState('')
  const [feedback, setFeedback] = useState({ type: '', message: '' })

  const currentPlan = subscription?.plan || 'free'
  const effectivePlan = subscription?.effectivePlan || currentPlan
  const canOpenHub = Boolean(hub?.slug && user?.role === 'teacher')

  const plans = useMemo(
    () => [
      {
        id: 'free',
        name: 'Free',
        price: '₹0',
        priceSuffix: '/month',
        eyebrow: 'Launch without risk',
        description: 'Perfect for validating your first teaching offer and publishing your first batch.',
        features: [
          'Unlimited video uploads (free or paid)',
          'Unlimited course creation',
          '1 batch (free or paid)',
          'Basic hub page',
          'Standard Sparklass branding',
        ],
        cta: 'Start Free',
        accent: 'free',
      },
      {
        id: 'pro',
        name: 'Pro',
        badge: 'Most Popular',
        price: '₹XXX',
        priceSuffix: billingCycle === 'monthly' ? '/month' : '/month billed yearly',
        eyebrow: 'Turn traction into revenue',
        description:
          'Build a branded teaching business with more batches, better presentation, and basic monetization insights.',
        highlight: true,
        features: [
          'Everything in Free',
          'Up to 5 batches',
          'Custom branding (logo, colors)',
          'Custom domain support',
          'Banner ads on hub page',
          'Basic analytics: views, enrollments, revenue summary',
        ],
        cta: 'Upgrade to Pro',
        note:
          billingCycle === 'monthly'
            ? 'Includes a 7-day free trial. No payment required today.'
            : 'Annual billing discount applies when billing goes live.',
        accent: 'pro',
      },
      {
        id: 'premium',
        name: 'Premium',
        price: '₹XXX',
        priceSuffix: billingCycle === 'monthly' ? '/month' : '/month billed yearly',
        eyebrow: 'Scale into an academy',
        description:
          'Run a serious teaching operation with teams, deeper analytics, and room for every batch you want to sell.',
        features: [
          'Everything in Pro',
          'Unlimited batches',
          'Add team members: teachers and admins',
          'Advanced analytics: student engagement, retention, performance per batch',
          'Priority support',
          'Future features access',
        ],
        cta: 'Go Premium',
        note:
          billingCycle === 'monthly'
            ? 'Built for teams, operators, and fast-growing teacher brands.'
            : 'Best for creators planning a full-year teaching business.',
        accent: 'premium',
      },
    ],
    [billingCycle]
  )

  const handlePlanAction = async (planId) => {
    setFeedback({ type: '', message: '' })

    if (!isAuthenticated) {
      navigate('/register', {
        state: {
          from: {
            pathname: '/become-teacher',
          },
        },
      })
      return
    }

    if (activePlan || isSubscriptionLoading) {
      return
    }

    try {
      setActivePlan(planId)
      const response = await upgradeTeacherPlan({
        plan: planId,
        billingCycle: planId === 'free' ? 'monthly' : billingCycle,
      })

      setFeedback({
        type: 'success',
        message: response.message || 'Your teacher plan is ready.',
      })

      if (response?.hub?.slug) {
        setTimeout(() => navigate(`/hub/${response.hub.slug}/dashboard`), 400)
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to update your teacher plan right now.',
      })
    } finally {
      setActivePlan('')
    }
  }

  return (
    <div className="teacher-pricing-shell">
      <Navbar />

      <main className="teacher-pricing-page">
        <section className="teacher-pricing-hero">
          <div className="teacher-pricing-hero__content">
            <p className="teacher-pricing-kicker">Creator Plans</p>
            <h1>Turn Your Knowledge into a Business</h1>
            <p className="teacher-pricing-hero__copy">
              Create your own hub, sell batches, and build your teaching empire.
            </p>

            <div className="teacher-pricing-hero__actions">
              <button
                type="button"
                className="teacher-pricing-primary"
                onClick={() => handlePlanAction('free')}
                disabled={Boolean(activePlan) || isSubscriptionLoading}
              >
                {activePlan === 'free' ? 'Starting...' : 'Start for Free'}
              </button>

              {canOpenHub ? (
                <Link to={`/hub/${hub.slug}/dashboard`} className="teacher-pricing-secondary">
                  Open Your Hub
                </Link>
              ) : (
                <button
                  type="button"
                  className="teacher-pricing-secondary"
                  onClick={() =>
                    document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' })
                  }
                >
                  Compare Plans
                </button>
              )}
            </div>

            <div className="teacher-pricing-hero__meta">
              <span>Current plan: {subscription?.capabilities?.label || 'Free'}</span>
              <span>Effective access: {effectivePlan}</span>
              {subscription?.trialEndsAt ? (
                <span>Pro trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}</span>
              ) : null}
            </div>
          </div>

          <div className="teacher-pricing-hero__panel">
            <div className="teacher-pricing-stat">
              <span>Business Stack</span>
              <strong>Hub + Batches + Payments Ready</strong>
              <p>Launch your storefront, group offers into batches, and scale with plan-based growth rails.</p>
            </div>
            <div className="teacher-pricing-stat">
              <span>Built for creators</span>
              <strong>Own the audience you teach</strong>
              <p>Move beyond one-off uploads and build repeatable teaching revenue around a branded destination.</p>
            </div>
          </div>
        </section>

        {feedback.message ? (
          <div
            className={`teacher-pricing-feedback ${
              feedback.type === 'error' ? 'teacher-pricing-feedback--error' : ''
            }`}
            role="status"
            aria-live="polite"
          >
            {feedback.message}
          </div>
        ) : null}

        <section className="teacher-pricing-billing" id="pricing-plans">
          <div>
            <p className="teacher-pricing-kicker">Billing</p>
            <h2>Choose the pace that fits your teaching business</h2>
          </div>

          <div className="teacher-pricing-toggle" role="tablist" aria-label="Billing cycle">
            {BILLING_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={
                  billingCycle === option.value
                    ? 'teacher-pricing-toggle__button active'
                    : 'teacher-pricing-toggle__button'
                }
                onClick={() => setBillingCycle(option.value)}
              >
                {option.label}
                {option.badge ? (
                  <span className="teacher-pricing-toggle__badge">{option.badge}</span>
                ) : null}
              </button>
            ))}
          </div>
        </section>

        <section className="teacher-pricing-grid">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id && subscription?.status === 'active'
            const isExpiredPaidPlan =
              subscription?.status === 'expired' && subscription?.plan === plan.id

            return (
              <article
                key={plan.id}
                className={
                  plan.highlight
                    ? 'teacher-plan-card teacher-plan-card--highlight'
                    : 'teacher-plan-card'
                }
              >
                <div className="teacher-plan-card__top">
                  <div>
                    <p className="teacher-plan-card__eyebrow">{plan.eyebrow}</p>
                    <h3>{plan.name}</h3>
                  </div>

                  {plan.badge ? <span className="teacher-plan-card__badge">{plan.badge}</span> : null}
                </div>

                <div className="teacher-plan-card__pricing">
                  <strong>{plan.price}</strong>
                  <span>{plan.priceSuffix}</span>
                </div>

                <p className="teacher-plan-card__description">{plan.description}</p>

                <div className="teacher-plan-card__status-row">
                  {isCurrentPlan ? <span className="teacher-plan-card__status">Current plan</span> : null}
                  {isExpiredPaidPlan ? (
                    <span className="teacher-plan-card__status teacher-plan-card__status--warning">
                      Expired, running on Free access
                    </span>
                  ) : null}
                </div>

                <button
                  type="button"
                  className={
                    plan.highlight
                      ? 'teacher-pricing-primary teacher-pricing-primary--block'
                      : 'teacher-pricing-secondary teacher-pricing-secondary--block'
                  }
                  onClick={() => handlePlanAction(plan.id)}
                  disabled={Boolean(activePlan) || isSubscriptionLoading}
                >
                  {activePlan === plan.id ? 'Processing...' : plan.cta}
                </button>

                {plan.note ? <p className="teacher-plan-card__note">{plan.note}</p> : null}

                <ul className="teacher-plan-card__features">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            )
          })}
        </section>

        <section className="teacher-pricing-policy">
          <div className="teacher-pricing-policy__copy">
            <p className="teacher-pricing-kicker">Subscription Safety</p>
            <h2>Your teaching business keeps moving, even if billing pauses</h2>
            <p>
              When a paid subscription expires, Sparklass protects continuity for enrolled students
              while still giving you a clear upgrade path back to full scale.
            </p>
          </div>

          <div className="teacher-pricing-policy__steps">
            <article>
              <span>1</span>
              <h3>Primary batch stays on</h3>
              <p>Your most sold batch remains active for new students, so your best offer keeps converting.</p>
            </article>
            <article>
              <span>2</span>
              <h3>Other batches are archived</h3>
              <p>They disappear for new signups but stay accessible to already enrolled students.</p>
            </article>
            <article>
              <span>3</span>
              <h3>Renew and restore instantly</h3>
              <p>Renewing brings archived batches back and restores your full creator workspace automatically.</p>
            </article>
          </div>
        </section>

        <section className="teacher-pricing-trust">
          <div>
            <p className="teacher-pricing-kicker">Why Sparklass?</p>
            <h2>Built for teachers who want a business, not just an audience</h2>
          </div>

          <div className="teacher-pricing-trust__grid">
            <article>
              <h3>Own your audience</h3>
              <p>Bring students into your own branded hub instead of borrowing reach from someone else’s platform.</p>
            </article>
            <article>
              <h3>Higher earnings than YouTube</h3>
              <p>Package access into paid batches, control pricing, and create recurring monetization moments.</p>
            </article>
            <article>
              <h3>Sell bundles, not chaos</h3>
              <p>Combine courses, videos, and future resources into focused batch offers that students can actually buy.</p>
            </article>
          </div>
        </section>

        <section className="teacher-pricing-faq">
          <div>
            <p className="teacher-pricing-kicker">FAQ</p>
            <h2>Questions teachers ask before they launch</h2>
          </div>

          <div className="teacher-pricing-faq__grid">
            {FAQ_ITEMS.map((item) => (
              <article key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        {!isAuthenticated ? (
          <section className="teacher-pricing-footer-cta">
            <h2>Start free today, then scale when your first batch sells.</h2>
            <div className="teacher-pricing-hero__actions">
              <Link
                to="/register"
                className="teacher-pricing-primary"
                state={{ from: { pathname: '/become-teacher' } }}
              >
                Create an Account
              </Link>
              <Link
                to="/login"
                className="teacher-pricing-secondary"
                state={{ from: { pathname: '/become-teacher' } }}
              >
                I Already Have an Account
              </Link>
            </div>
          </section>
        ) : null}

        {location.state?.from?.pathname && location.state.from.pathname !== '/become-teacher' ? (
          <div className="teacher-pricing-backlink">
            <Link to={location.state.from.pathname}>Return to where you came from</Link>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  )
}

export default BecomeTeacher
