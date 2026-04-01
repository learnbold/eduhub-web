import './HubCard.css'

function HubCard({ hub }) {
  return (
    <article className="hub-card">
      <div className="hub-card__banner">
        <img 
          src={hub.banner} 
          alt={`${hub.name} banner`} 
          className="hub-card__banner-img"
          loading="lazy" 
        />
        <div className="hub-card__logo-wrapper">
          <img 
            src={hub.logo} 
            alt={`${hub.name} logo`} 
            className="hub-card__logo-img"
            loading="lazy" 
          />
        </div>
      </div>
      
      <div className="hub-card__body">
        <h3 className="hub-card__title">{hub.name}</h3>
        <p className="hub-card__description">{hub.description}</p>
        
        <div className="hub-card__meta">
          <span className="hub-card__courses-count">{hub.coursesCount} Courses</span>
        </div>
        
        <button type="button" className="hub-card__cta">
          Visit Hub
        </button>
      </div>
    </article>
  )
}

export default HubCard
