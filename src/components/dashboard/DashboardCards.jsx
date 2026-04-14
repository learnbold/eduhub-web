import { Link } from 'react-router-dom'

const defaultThumbnail =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0" x2="1" y1="0" y2="1"%3E%3Cstop stop-color="%23e0f2fe"/%3E%3Cstop offset=".52" stop-color="%23f8fafc"/%3E%3Cstop offset="1" stop-color="%23fed7aa"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="960" height="540" fill="url(%23g)"/%3E%3Ccircle cx="760" cy="116" r="92" fill="%23f59e0b" fill-opacity=".38"/%3E%3Cpath d="M132 390 300 226l112 108 72-64 340 120v74H132z" fill="%230f172a" fill-opacity=".16"/%3E%3Crect x="92" y="76" width="776" height="388" rx="38" fill="none" stroke="%230f172a" stroke-opacity=".16" stroke-width="16"/%3E%3C/svg%3E'

function EditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M4 17.25V20h2.75L17.8 8.95l-2.75-2.75L4 17.25Zm15.9-10.4a1 1 0 0 0 0-1.42L18.57 4.1a1 1 0 0 0-1.42 0l-1.04 1.04 2.75 2.75 1.04-1.04Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M7 21a2 2 0 0 1-2-2V8h14v11a2 2 0 0 1-2 2H7ZM9 4h6l1 2h4v2H4V6h4l1-2Zm1 7v7h2v-7h-2Zm4 0v7h2v-7h-2Z" />
    </svg>
  )
}

function ActionButton({ label, variant = 'neutral', onClick, children }) {
  return (
    <button
      type="button"
      className={`dashboard-card-action dashboard-card-action--${variant}`}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.(event)
      }}
    >
      {children}
    </button>
  )
}

export function DashboardCard({
  title,
  description,
  thumbnail,
  eyebrow,
  badges,
  meta,
  children,
  onOpen,
  onEdit,
  onDelete,
}) {
  const resolvedTitle = title || 'Untitled'
  const cardProps = onOpen
    ? {
        role: 'link',
        tabIndex: 0,
        onClick: onOpen,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpen()
          }
        },
      }
    : {}

  return (
    <article className="dashboard-content-card" {...cardProps}>
      <div className="dashboard-content-card__thumbnail">
        <img src={thumbnail || defaultThumbnail} alt="" loading="lazy" />
        <div className="dashboard-content-card__actions">
          <ActionButton label={`Edit ${resolvedTitle}`} onClick={onEdit}>
            <EditIcon />
          </ActionButton>
          <ActionButton label={`Delete ${resolvedTitle}`} variant="danger" onClick={onDelete}>
            <TrashIcon />
          </ActionButton>
        </div>
      </div>

      <div className="dashboard-content-card__body">
        <div className="dashboard-content-card__header">
          <div>
            {eyebrow ? <p className="dashboard-content-card__eyebrow">{eyebrow}</p> : null}
            <h3>{resolvedTitle}</h3>
            {description ? <p className="dashboard-muted">{description}</p> : null}
          </div>
          {badges?.length ? <div className="dashboard-pill-row">{badges}</div> : null}
        </div>

        {meta?.length ? (
          <div className="dashboard-content-card__meta">
            {meta.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        ) : null}

        {children}
      </div>
    </article>
  )
}

export function DashboardModal({ title, children, confirmLabel, busy, variant = 'primary', onCancel, onConfirm }) {
  return (
    <div className="dashboard-modal-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="dashboard-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="dashboard-modal-title">{title}</h3>
        <div className="dashboard-modal__body">{children}</div>
        <div className="dashboard-modal__actions">
          <button type="button" className="dashboard-button--ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          {onConfirm ? (
            <button
              type="button"
              className={variant === 'danger' ? 'dashboard-button dashboard-button--danger' : 'dashboard-button'}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? 'Working...' : confirmLabel}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export function EditPlaceholderModal({ itemType, itemName, openTo, onClose }) {
  return (
    <DashboardModal title={`Edit ${itemType}`} onCancel={onClose}>
      <p>
        Basic edit setup is ready for <strong>{itemName}</strong>. Full editing fields can be added
        on top of this modal flow.
      </p>
      {openTo ? (
        <div className="dashboard-modal__actions">
          <Link to={openTo} className="dashboard-button" onClick={onClose}>
            Open Details
          </Link>
        </div>
      ) : null}
    </DashboardModal>
  )
}
