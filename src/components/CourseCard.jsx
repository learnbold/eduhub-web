import './CourseCard.css'

const FALLBACK_THUMBNAIL =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80'

function CourseCard({ course, onClick, isContinueLearning = false }) {
  const displayPrice = course.isFree || !course.price
    ? 'Free'
    : `${course.currency || 'INR'} ${Number(course.price).toLocaleString()}`
  const hubName = course.hub?.name || course.instructor || 'Sparklass educator'
  const videoCount = Number(course.videosCount || course.videoCount || 0)
  const studentsCount = Number(course.studentsCount || 0)

  return (
    <article
      className="course-card"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick?.()
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
        <p className="course-card__instructor">{hubName}</p>
        {course.description ? (
          <p className="course-card__description">{course.description}</p>
        ) : null}

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
            <span className="course-card__students">
              {videoCount > 0
                ? `${videoCount.toLocaleString()} video${videoCount === 1 ? '' : 's'}`
                : studentsCount > 0
                  ? `${studentsCount.toLocaleString()} students`
                  : course.level || course.category || 'Course'}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}

export default CourseCard
