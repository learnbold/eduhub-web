import './CourseInfo.css'

const buildFocusPoints = (category) => [
  `Create a clear ${category.toLowerCase()} workflow you can reuse with confidence.`,
  'Move through practical lessons that balance fundamentals with real execution.',
  'Learn a polished process you can carry into client work, teams, or personal projects.',
  'Finish with deliverables that feel complete, intentional, and portfolio-ready.',
]

const experienceBlocks = [
  {
    title: 'Structured Momentum',
    text: 'Lessons are sequenced to keep the pace high without feeling overwhelming.',
  },
  {
    title: 'Applied Practice',
    text: 'Each section is built around action so learners leave with something tangible.',
  },
  {
    title: 'Modern Standards',
    text: 'The workflow reflects what premium digital products expect from strong practitioners.',
  },
]

function CourseInfo({ course, isPreviewCourse }) {
  const paragraphs = course.description
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const descriptionParagraphs = paragraphs.length ? paragraphs : [course.description]
  const focusPoints = buildFocusPoints(course.category || 'creative')

  return (
    <div className="course-info">
      <section className="course-info__media-card">
        <div className="course-info__media-frame">
          <img src={course.thumbnail} alt={course.title} className="course-info__image" />
        </div>

        <div className="course-info__media-meta">
          <div>
            <span>Course format</span>
            <strong>On-demand premium learning</strong>
          </div>
          <div>
            <span>Best for</span>
            <strong>{course.category} learners building practical depth</strong>
          </div>
        </div>
      </section>

      <section className="course-info__copy-card">
        <div className="course-info__section-head">
          <p>About this course</p>
          {isPreviewCourse ? <span>Preview experience</span> : <span>Live course detail</span>}
        </div>

        <div className="course-info__description">
          {descriptionParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="course-info__grid">
        {experienceBlocks.map((block) => (
          <article key={block.title} className="course-info__mini-card">
            <h3>{block.title}</h3>
            <p>{block.text}</p>
          </article>
        ))}
      </section>

      <section className="course-info__copy-card">
        <div className="course-info__section-head">
          <p>What you will gain</p>
          <span>Designed for meaningful progress</span>
        </div>

        <ul className="course-info__list">
          {focusPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default CourseInfo
