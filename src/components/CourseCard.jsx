import './CourseCard.css'

const FALLBACK_THUMBNAIL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'

function CourseCard({ course, onClick, isContinueLearning = false }) {
  // If price is missing or course is free, show Free. Otherwise show formatted price.
  const displayPrice = course.isFree || !course.price ? 'Free' : `$${Number(course.price).toFixed(2)}`
  const rating = course.rating || '4.8'
  const studentsCount = course.studentsCount || Math.floor(Math.random() * 5000 + 1000)

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
        {/* Top-left category badge */}
        {course.category && (
          <span className="course-card__badge course-card__badge--category">
            {course.category}
          </span>
        )}
        
        {/* Top-right price badge */}
        {!isContinueLearning && (
          <span className={`course-card__badge course-card__badge--price ${course.isFree || !course.price ? 'free' : 'paid'}`}>
            {displayPrice}
          </span>
        )}
      </div>

      <div className="course-card__body">
        <h3 title={course.title} className="course-card__title">{course.title}</h3>
        <p className="course-card__instructor">{course.instructor || 'Top Educator'}</p>

        {isContinueLearning ? (
          <div className="course-card__progress-container">
            <div className="course-card__progress-bar">
              <div 
                className="course-card__progress-fill" 
                style={{ width: `${course.progress || 0}%` }}
              />
            </div>
            <span className="course-card__progress-text">{course.progress || 0}% Complete</span>
          </div>
        ) : (
          <div className="course-card__meta">
            <span className="course-card__rating">
              <svg viewBox="0 0 24 24" className="star-icon" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              {rating}
            </span>
            <span className="course-card__students">
              ({studentsCount.toLocaleString()} students)
            </span>
          </div>
        )}
      </div>
    </article>
  )
}

export default CourseCard
