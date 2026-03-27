import './CourseCard.css'

const FALLBACK_THUMBNAIL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'

function CourseCard({ course, onClick }) {
  return (
    <article
      className="course-card"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="course-card__media">
        <img
          src={course.thumbnail || FALLBACK_THUMBNAIL}
          alt={course.title}
          className="course-card__image"
          loading="lazy"
        />
        <span className={course.isFree ? 'course-card__badge free' : 'course-card__badge paid'}>
          {course.isFree ? 'Free' : `$${Number(course.price ?? 0).toFixed(2)}`}
        </span>
      </div>

      <div className="course-card__body">
        <p className="course-card__category">{course.category}</p>
        <h3>{course.title}</h3>
        <div className="course-card__meta">
          <span>Top educator content</span>
          <span className="course-card__cta">View course</span>
        </div>
      </div>
    </article>
  )
}

export default CourseCard
