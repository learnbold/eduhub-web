import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { DashboardCard, DashboardModal } from '../../components/dashboard/DashboardCards'
import { useAuth } from '../../context/AuthContext'
import { useUploadStore } from '../../store/uploadStore'
import {
  deleteNote,
  fetchManagedHubNotes,
  formatFileSize,
  formatNotePrice,
  requestNoteDownload,
  updateNote,
} from '../../utils/dashboardApi'
import { getNoteThumbnailUrl } from '../../utils/media'

const buildUploadRefreshKey = (uploads) =>
  uploads
    .filter((upload) => upload.resourceType === 'note' && (upload.status === 'ready' || upload.status === 'failed'))
    .map((upload) => `${upload.id}:${upload.status}:${upload.updatedAt}`)
    .join('|')

function HubNotes() {
  const { token } = useAuth()
  const { hub } = useOutletContext()
  const { uploads } = useUploadStore()
  const noteUploadRefreshKey = useMemo(() => buildUploadRefreshKey(uploads), [uploads])

  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [noteToDelete, setNoteToDelete] = useState(null)
  const [deletingNoteId, setDeletingNoteId] = useState('')
  const [editingNote, setEditingNote] = useState(null)
  const [savingNote, setSavingNote] = useState(false)
  const [editValues, setEditValues] = useState({
    title: '',
    description: '',
    isFree: true,
    price: 0,
    isPublished: false,
  })

  useEffect(() => {
    if (!hub?._id) {
      return undefined
    }

    const controller = new AbortController()

    const loadNotes = async () => {
      try {
        setLoading(true)
        setError('')
        const nextNotes = await fetchManagedHubNotes(token, hub._id, controller.signal)
        if (!controller.signal.aborted) {
          setNotes(nextNotes)
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.message || 'Failed to load hub notes.')
          setNotes([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadNotes()
    return () => controller.abort()
  }, [hub?._id, noteUploadRefreshKey, token])

  const basePath = `/hub/${hub.slug}/dashboard`
  const standaloneNotes = notes.filter((note) => !note.courseId)
  const courseNotes = notes.filter((note) => Boolean(note.courseId))

  const openEditModal = (note) => {
    setEditingNote(note)
    setEditValues({
      title: note.title || '',
      description: note.description || '',
      isFree: note.isFree ?? Number(note.price || 0) === 0,
      price: Number(note.price || 0),
      isPublished: Boolean(note.isPublished),
    })
  }

  const handleDeleteNote = async () => {
    if (!noteToDelete?._id) {
      return
    }

    try {
      setDeletingNoteId(noteToDelete._id)
      setError('')
      setSuccess('')
      await deleteNote(token, noteToDelete._id)
      setNotes((current) => current.filter((note) => note._id !== noteToDelete._id))
      setSuccess(`"${noteToDelete.title}" was deleted.`)
      setNoteToDelete(null)
    } catch (deleteError) {
      setError(deleteError.message || 'Failed to delete note.')
    } finally {
      setDeletingNoteId('')
    }
  }

  const handleTogglePublish = async (note) => {
    try {
      setError('')
      setSuccess('')
      const updated = await updateNote(token, note._id, {
        isPublished: !note.isPublished,
      })
      setNotes((current) => current.map((item) => (item._id === updated._id ? updated : item)))
      setSuccess(`"${updated.title}" is now ${updated.isPublished ? 'published' : 'unpublished'}.`)
    } catch (updateError) {
      setError(updateError.message || 'Failed to update note visibility.')
    }
  }

  const handleOpenNote = async (note) => {
    try {
      setError('')
      const payload = await requestNoteDownload(note._id, token)
      if (payload?.downloadUrl) {
        window.open(payload.downloadUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (downloadError) {
      setError(downloadError.message || 'Failed to open note.')
    }
  }

  const handleSaveEdit = async () => {
    if (!editingNote?._id || savingNote) {
      return
    }

    try {
      setSavingNote(true)
      setError('')
      setSuccess('')

      const updated = await updateNote(token, editingNote._id, {
        title: editValues.title,
        description: editValues.description,
        isFree: editValues.isFree,
        price: editValues.isFree ? 0 : Number(editValues.price || 0),
        isPublished: editValues.isPublished,
      })

      setNotes((current) => current.map((note) => (note._id === updated._id ? updated : note)))
      setEditingNote(null)
      setSuccess(`"${updated.title}" was updated.`)
    } catch (updateError) {
      setError(updateError.message || 'Failed to update note.')
    } finally {
      setSavingNote(false)
    }
  }

  const renderNoteCard = (note) => (
    <DashboardCard
      key={note._id}
      title={note.title}
      description={note.description || 'PDF notes for your learners.'}
      thumbnail={getNoteThumbnailUrl(note)}
      eyebrow={note.course?.title ? `Course note • ${note.course.title}` : 'Standalone note'}
      badges={[
        <span
          key="price"
          className={note.isFree ? 'dashboard-pill dashboard-pill--success' : 'dashboard-pill dashboard-pill--warning'}
        >
          {formatNotePrice(note)}
        </span>,
        <span
          key="publish"
          className={note.isPublished ? 'dashboard-pill dashboard-pill--neutral' : 'dashboard-pill dashboard-pill--warning'}
        >
          {note.isPublished ? 'Published' : 'Draft'}
        </span>,
      ]}
      meta={[
        { label: 'File size', value: formatFileSize(note.fileSize) },
        { label: 'Downloads', value: note.downloadsCount || 0 },
        { label: 'Video link', value: note.video?.title || note.videoId?.title || 'Optional' },
        { label: 'Created', value: note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'Recently' },
      ]}
      onOpen={() => handleOpenNote(note)}
      onEdit={() => openEditModal(note)}
      onDelete={() => setNoteToDelete(note)}
    >
      <div className="dashboard-inline-actions">
        <button
          type="button"
          className="dashboard-button--ghost"
          onClick={(event) => {
            event.stopPropagation()
            handleTogglePublish(note)
          }}
        >
          {note.isPublished ? 'Unpublish' : 'Publish'}
        </button>
        <button
          type="button"
          className="dashboard-link-button"
          onClick={(event) => {
            event.stopPropagation()
            handleOpenNote(note)
          }}
        >
          Open PDF
        </button>
      </div>
    </DashboardCard>
  )

  return (
    <div className="dashboard-page">
      <section className="dashboard-panel">
        <div className="dashboard-page__header">
          <div>
            <p className="dashboard-section-kicker">Notes</p>
            <h2>Manage PDF notes across your hub</h2>
            <p>
              Publish standalone handouts or attach notes to a course or video while keeping pricing and
              access control aligned with the rest of the hub.
            </p>
          </div>
          <div className="dashboard-page__actions">
            <Link to={`${basePath}/notes/upload`} className="dashboard-button">
              Upload Note
            </Link>
          </div>
        </div>
      </section>

      {error ? <p className="dashboard-alert">{error}</p> : null}
      {success ? <p className="dashboard-success">{success}</p> : null}

      {loading ? (
        <section className="dashboard-panel">
          <p className="dashboard-muted">Loading hub notes...</p>
        </section>
      ) : notes.length === 0 ? (
        <section className="dashboard-empty">
          <h2>No notes yet</h2>
          <p>Upload your first PDF to create a standalone resource or course companion note.</p>
        </section>
      ) : (
        <>
          <section className="dashboard-card-section">
            <div className="dashboard-page__header">
              <div>
                <p className="dashboard-section-kicker">Standalone Notes</p>
                <h3>Hub-wide PDFs</h3>
              </div>
            </div>

            {standaloneNotes.length === 0 ? (
              <div className="dashboard-empty">
                <h3>No standalone notes yet</h3>
                <p>Create downloadable study sheets, checklists, and announcements for your hub.</p>
              </div>
            ) : (
              <div className="dashboard-grid dashboard-grid--cards">{standaloneNotes.map(renderNoteCard)}</div>
            )}
          </section>

          <section className="dashboard-card-section">
            <div className="dashboard-page__header">
              <div>
                <p className="dashboard-section-kicker">Course Notes</p>
                <h3>Attached to published learning paths</h3>
              </div>
            </div>

            {courseNotes.length === 0 ? (
              <div className="dashboard-empty">
                <h3>No course notes yet</h3>
                <p>Attach notes to a course or specific lesson video so learners unlock them with the same access rules.</p>
              </div>
            ) : (
              <div className="dashboard-grid dashboard-grid--cards">{courseNotes.map(renderNoteCard)}</div>
            )}
          </section>
        </>
      )}

      {noteToDelete ? (
        <DashboardModal
          title="Delete note"
          confirmLabel="Delete"
          variant="danger"
          busy={deletingNoteId === noteToDelete._id}
          onCancel={() => setNoteToDelete(null)}
          onConfirm={handleDeleteNote}
        >
          <p>Are you sure you want to delete this PDF note?</p>
        </DashboardModal>
      ) : null}

      {editingNote ? (
        <DashboardModal
          title="Edit note"
          confirmLabel="Save changes"
          busy={savingNote}
          onCancel={() => setEditingNote(null)}
          onConfirm={handleSaveEdit}
        >
          <div className="dashboard-form">
            <label className="dashboard-field">
              <span>Title</span>
              <input
                type="text"
                value={editValues.title}
                onChange={(event) => setEditValues((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label className="dashboard-field">
              <span>Description</span>
              <textarea
                value={editValues.description}
                onChange={(event) =>
                  setEditValues((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <div className="dashboard-form__grid">
              <label className="dashboard-field">
                <span>Access</span>
                <select
                  value={editValues.isFree ? 'free' : 'paid'}
                  onChange={(event) =>
                    setEditValues((current) => ({
                      ...current,
                      isFree: event.target.value === 'free',
                    }))
                  }
                >
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              <label className="dashboard-field">
                <span>Price</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  disabled={editValues.isFree}
                  value={editValues.price}
                  onChange={(event) => setEditValues((current) => ({ ...current, price: event.target.value }))}
                />
              </label>
            </div>
            <label className="dashboard-field">
              <span>Visibility</span>
              <select
                value={editValues.isPublished ? 'published' : 'draft'}
                onChange={(event) =>
                  setEditValues((current) => ({
                    ...current,
                    isPublished: event.target.value === 'published',
                  }))
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>
        </DashboardModal>
      ) : null}
    </div>
  )
}

export default HubNotes
