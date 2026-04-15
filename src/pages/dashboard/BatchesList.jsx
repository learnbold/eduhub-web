import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { DashboardCard, DashboardModal, EditPlaceholderModal } from '../../components/dashboard/DashboardCards'
import { useAuth } from '../../context/AuthContext'
import {
  createBatch,
  deleteBatch,
  fetchManagedHubBatches,
  formatBatchPrice,
} from '../../utils/dashboardApi'

const initialBatchForm = {
  title: '',
  description: '',
  price: '0',
  thumbnail: '',
  startDate: '',
  endDate: '',
}

function BatchesList() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const { hub } = useOutletContext()
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formValues, setFormValues] = useState(initialBatchForm)
  const [batchToDelete, setBatchToDelete] = useState(null)
  const [deletingBatchId, setDeletingBatchId] = useState('')
  const [batchToEdit, setBatchToEdit] = useState(null)

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadBatches = async () => {
      try {
        setLoading(true)
        setError('')
        const nextBatches = await fetchManagedHubBatches(token, hub._id, controller.signal)

        if (!controller.signal.aborted) {
          setBatches(nextBatches)
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Failed to load hub batches.')
          setBatches([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadBatches()

    return () => controller.abort()
  }, [hub?._id, token])

  const basePath = `/hub/${hub.slug}/dashboard`
  const subscription = hub.subscription
  const batchLimit = subscription?.capabilities?.batchLimit
  const activeBatchCount = batches.filter((batch) => !batch.isPlanArchived).length
  const limitReached = batchLimit !== null && activeBatchCount >= batchLimit
  const upgradeMessage =
    subscription?.notices?.upgradeMessage ||
    (subscription?.effectivePlan === 'pro'
      ? 'Upgrade to Premium to create more batches'
      : 'Upgrade to Pro to create more batches')

  const handleDeleteBatch = async () => {
    if (!batchToDelete?._id) {
      return
    }

    try {
      setDeletingBatchId(batchToDelete._id)
      setError('')
      setSuccess('')
      await deleteBatch(token, batchToDelete._id)
      setBatches((current) => current.filter((batch) => batch._id !== batchToDelete._id))
      setBatchToDelete(null)
      setSuccess(`"${batchToDelete.title || batchToDelete.name}" was deleted.`)
    } catch {
      setError('Failed to delete')
    } finally {
      setDeletingBatchId('')
    }
  }

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Batch Workspace</p>
            <h2>Batches are now the main teaching product in {hub.name}</h2>
            <p>
              Use batches to package courses, standalone videos, notes, and student access under
              one monetizable teaching container.
            </p>
          </div>

          <div className="dashboard-page__actions">
            <button
              type="button"
              className="dashboard-button"
              disabled={limitReached}
              onClick={() => {
                if (limitReached) return
                setShowCreateForm((current) => !current)
                setError('')
                setSuccess('')
              }}
            >
              {showCreateForm ? 'Close Creator' : 'Create Batch'}
            </button>
            <Link to={`${basePath}/courses/create`} className="dashboard-button--ghost">
              Create Course
            </Link>
          </div>
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Plan Guardrails</p>
            <h3>{subscription?.capabilities?.label || 'Free'} plan batch allowance</h3>
            <p>
              {batchLimit === null
                ? 'Premium keeps batch creation fully open so you can scale as wide as you want.'
                : `You are using ${activeBatchCount} of ${batchLimit} active batches in this workspace.`}
            </p>
          </div>

          <div className="dashboard-page__actions">
            <Link to="/become-teacher" className="dashboard-button--ghost">
              Compare Plans
            </Link>
          </div>
        </div>

        {limitReached ? <p className="dashboard-info">{upgradeMessage}</p> : null}
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}
      {success ? <p className="dashboard-success">{success}</p> : null}

      {showCreateForm && !limitReached ? (
        <section className="dashboard-panel">
          <div className="dashboard-page__header">
            <div>
              <p className="dashboard-section-kicker">New Batch</p>
              <h3>Launch a new cohort container</h3>
            </div>
          </div>

          <form
            className="dashboard-form"
            onSubmit={async (event) => {
              event.preventDefault()
              if (creating) return

              try {
                setCreating(true)
                setError('')
                setSuccess('')

                const createdBatch = await createBatch(token, {
                  hubId: hub._id,
                  title: formValues.title,
                  description: formValues.description,
                  price: Number(formValues.price || 0),
                  thumbnail: formValues.thumbnail,
                  startDate: formValues.startDate || null,
                  endDate: formValues.endDate || null,
                })

                setBatches((current) => [createdBatch, ...current])
                setFormValues(initialBatchForm)
                setShowCreateForm(false)
                setSuccess(`Batch "${createdBatch.title}" created successfully.`)
              } catch (createError) {
                setError(createError.message || 'Failed to create batch.')
              } finally {
                setCreating(false)
              }
            }}
          >
            <div className="dashboard-form__grid">
              <label className="dashboard-field">
                <span>Title</span>
                <input
                  type="text"
                  value={formValues.title}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, title: event.target.value }))
                  }
                  required
                />
              </label>

              <label className="dashboard-field">
                <span>Price</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formValues.price}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, price: event.target.value }))
                  }
                />
              </label>
            </div>

            <label className="dashboard-field">
              <span>Description</span>
              <textarea
                value={formValues.description}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>

            <label className="dashboard-field">
              <span>Thumbnail URL</span>
              <input
                type="text"
                value={formValues.thumbnail}
                onChange={(event) =>
                  setFormValues((current) => ({ ...current, thumbnail: event.target.value }))
                }
                placeholder="https://..."
              />
            </label>

            <div className="dashboard-form__grid">
              <label className="dashboard-field">
                <span>Start Date</span>
                <input
                  type="date"
                  value={formValues.startDate}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, startDate: event.target.value }))
                  }
                />
              </label>

              <label className="dashboard-field">
                <span>End Date</span>
                <input
                  type="date"
                  value={formValues.endDate}
                  onChange={(event) =>
                    setFormValues((current) => ({ ...current, endDate: event.target.value }))
                  }
                />
              </label>
            </div>

            <div className="dashboard-inline-actions">
              <button type="submit" className="dashboard-button" disabled={creating}>
                {creating ? 'Creating...' : 'Save Batch'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {loading ? (
        <section className="dashboard-panel">
          <p className="dashboard-muted">Loading hub batches...</p>
        </section>
      ) : batches.length === 0 ? (
        <section className="dashboard-empty">
          <h2>No batches yet</h2>
          <p>Create your first batch to start selling access to grouped courses and videos.</p>
          <div className="dashboard-access__actions">
            <button
              type="button"
              className="dashboard-button"
              disabled={limitReached}
              onClick={() => setShowCreateForm(true)}
            >
              Create First Batch
            </button>
          </div>
        </section>
      ) : (
        <section className="dashboard-grid dashboard-grid--cards">
          {batches.map((batch) => (
            <DashboardCard
              key={batch._id}
              title={batch.title || batch.name}
              description={batch.description || 'Bundle courses, videos, notes, and students under one access unit.'}
              thumbnail={batch.thumbnailUrl || batch.thumbnail}
              eyebrow={formatBatchPrice(batch)}
              onOpen={() => navigate(`${basePath}/batches/${batch._id}`)}
              onEdit={() => setBatchToEdit(batch)}
              onDelete={() => setBatchToDelete(batch)}
              badges={[
                <span key="status" className={batch.isPlanArchived ? 'dashboard-pill dashboard-pill--warning' : 'dashboard-pill dashboard-pill--success'}>
                  {batch.isPlanArchived ? 'Archived by plan' : 'Active'}
                </span>,
              ]}
              meta={[
                { label: 'Students', value: batch.studentCount },
                { label: 'Courses', value: batch.courseCount },
                { label: 'Videos', value: batch.videoCount },
                {
                  label: 'Schedule',
                  value: batch.startDate ? new Date(batch.startDate).toLocaleDateString() : 'Self-paced',
                },
              ]}
            >
              <div className="dashboard-pill-row">
                  <span className="dashboard-pill dashboard-pill--neutral">{formatBatchPrice(batch)}</span>
                  <span className="dashboard-pill dashboard-pill--success">{batch.courseCount} courses</span>
                  {batch.isPlanArchived ? (
                    <span className="dashboard-pill dashboard-pill--warning">Archived by plan</span>
                  ) : null}
              </div>

              {batch.isPlanArchived ? (
                <p className="dashboard-muted">
                  Hidden from new students until the workspace is renewed, while enrolled students keep access.
                </p>
              ) : null}

              <div className="dashboard-inline-actions" onClick={(event) => event.stopPropagation()}>
                <Link to={`${basePath}/batches/${batch._id}`} className="dashboard-button">
                  Open Batch
                </Link>
                <Link to={`${basePath}/courses`} className="dashboard-button--ghost">
                  Manage Courses
                </Link>
              </div>
            </DashboardCard>
          ))}
        </section>
      )}

      {batchToDelete ? (
        <DashboardModal
          title="Delete batch"
          confirmLabel="Delete"
          variant="danger"
          busy={deletingBatchId === batchToDelete._id}
          onCancel={() => setBatchToDelete(null)}
          onConfirm={handleDeleteBatch}
        >
          <p>Are you sure you want to delete this?</p>
        </DashboardModal>
      ) : null}

      {batchToEdit ? (
        <EditPlaceholderModal
          itemType="batch"
          itemName={batchToEdit.title || batchToEdit.name}
          openTo={`${basePath}/batches/${batchToEdit._id}`}
          onClose={() => setBatchToEdit(null)}
        />
      ) : null}
    </div>
  )
}

export default BatchesList
