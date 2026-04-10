import './BatchCard.css'

const formatPrice = (batch) => {
  if (!batch || Number(batch.price || 0) === 0) {
    return 'Free'
  }

  return `INR ${Number(batch.price).toLocaleString()}`
}

function BatchCard({ batch }) {
  const title = batch?.title || batch?.name || 'Untitled batch'
  const courseCount = Number(batch?.courseCount || 0)

  return (
    <article className="batch-card">
      <div className="batch-card__topline">
        <span>{formatPrice(batch)}</span>
        <span>{courseCount.toLocaleString()} course{courseCount === 1 ? '' : 's'}</span>
      </div>
      <h3>{title}</h3>
      <p className="batch-card__hub">{batch?.hub?.name || 'Sparklass Hub'}</p>
      <p className="batch-card__description">
        {batch?.description || 'A structured learning batch from this hub.'}
      </p>
    </article>
  )
}

export default BatchCard
