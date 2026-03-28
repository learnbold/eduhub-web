import './EnrollCard.css'

const formatPrice = (price, isFree) => {
  if (isFree) {
    return 'Free'
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price ?? 0)
}

const metaRows = (category) => [
  ['Category', category],
  ['Access', 'Full lifetime access'],
  ['Format', 'Self-paced lessons'],
  ['Support', 'Guided learning path'],
]

function EnrollCard({ course, isEnrolling, enrollError, onEnroll }) {
  const buttonLabel = isEnrolling
    ? 'Preparing your access...'
    : course.isFree
      ? 'Start Learning'
      : 'Enroll Now'

  return (
    <div className="enroll-card">
      <div className="enroll-card__price-block">
        <div>
          <p className="enroll-card__eyebrow">Course access</p>
          <h2>{formatPrice(course.price, course.isFree)}</h2>
        </div>

        <span className={course.isFree ? 'enroll-card__badge free' : 'enroll-card__badge paid'}>
          {course.isFree ? 'Free access' : 'Premium course'}
        </span>
      </div>

      <button
        type="button"
        className="enroll-card__button"
        onClick={onEnroll}
        disabled={isEnrolling}
      >
        {buttonLabel}
      </button>

      <p className="enroll-card__supporting">
        One focused decision now, a much clearer learning path next.
      </p>

      {enrollError ? <p className="enroll-card__error">{enrollError}</p> : null}

      <div className="enroll-card__meta">
        {metaRows(course.category).map(([label, value]) => (
          <div key={label} className="enroll-card__meta-row">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EnrollCard
