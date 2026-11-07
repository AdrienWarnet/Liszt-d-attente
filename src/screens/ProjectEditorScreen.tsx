import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { CloseIcon } from '../components/icons'
import { Screen } from '../components/Screen'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { ui } from '../components/ui'
import { isValidationError, type ValidationCode } from '../data/errors'
import { loadProjectDraft, saveProjectDraft, type ProjectDraft } from '../data/projectEditor'
import { labels } from '../labels'

// Brouillon de l'écran : rien n'est écrit en base avant « Enregistrer ».
interface TaskRow {
  key: string
  id?: string
  label: string
  removed: boolean
  archive: boolean
}
interface SectionRow {
  key: string
  id?: string
  name: string
  removed: boolean
  tasks: TaskRow[]
}
interface Form {
  name: string
  startDate: string
  endDate: string
  sections: SectionRow[]
}

let seq = 0
const key = () => `k${++seq}`
const newTask = (): TaskRow => ({ key: key(), label: '', removed: false, archive: false })
const newSection = (): SectionRow => ({ key: key(), name: '', removed: false, tasks: [newTask()] })

function fromDraft(d: ProjectDraft): Form {
  return {
    name: d.name,
    startDate: d.startDate ?? '',
    endDate: d.endDate ?? '',
    sections: d.sections.map((s) => ({
      key: key(),
      id: s.id,
      name: s.name,
      removed: false,
      tasks: s.tasks.map((t) => ({
        key: key(),
        id: t.id,
        label: t.label,
        removed: false,
        archive: false,
      })),
    })),
  }
}

function toDraft(form: Form, id?: string): ProjectDraft {
  return {
    id,
    name: form.name,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    sections: form.sections
      .filter((s) => !s.removed)
      .map((s) => ({
        id: s.id,
        name: s.name,
        tasks: s.tasks
          .filter((t) => !t.removed)
          .map((t) => ({ id: t.id, label: t.label, archive: t.archive })),
      })),
  }
}

const NEW_FORM: Form = { name: '', startDate: '', endDate: '', sections: [newSection()] }

const smallAction = 'min-h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-muted'

/** Écran d'édition du projet (lot 5) : création et « Modifier ». */
export function ProjectEditorScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const [form, setForm] = useState<Form | null>(id ? null : NEW_FORM)
  // Instantané à l'ouverture (ou au dernier enregistrement) pour savoir s'il y a des modifications.
  const [initialJson, setInitialJson] = useState(() => (id ? '' : JSON.stringify(NEW_FORM)))
  const [error, setError] = useState<ValidationCode | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const inputs = useRef(new Map<string, HTMLInputElement>())

  useEffect(() => {
    if (!id) return
    loadProjectDraft(id).then((draft) => {
      if (!draft) return navigate('/projets', { replace: true })
      const f = fromDraft(draft)
      setInitialJson(JSON.stringify(f))
      setForm(f)
    })
  }, [id, navigate])

  useEffect(() => {
    if (focusKey) inputs.current.get(focusKey)?.focus()
  }, [focusKey, form])

  if (!form) return <Screen title={labels.editor.editTitle} back="/projets" />

  const dirty = JSON.stringify(form) !== initialJson
  const leave = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(id ? `/projets/${id}` : '/projets', { replace: true })
  }
  const askLeave = () => (dirty ? setConfirmLeave(true) : leave())

  const update = (fn: (f: Form) => Form) => setForm((f) => (f ? fn(f) : f))
  const updateSection = (sKey: string, fn: (s: SectionRow) => SectionRow) =>
    update((f) => ({ ...f, sections: f.sections.map((s) => (s.key === sKey ? fn(s) : s)) }))
  const updateTask = (sKey: string, tKey: string, fn: (t: TaskRow) => TaskRow) =>
    updateSection(sKey, (s) => ({ ...s, tasks: s.tasks.map((t) => (t.key === tKey ? fn(t) : t)) }))

  const addTaskAfter = (sKey: string, afterKey?: string) => {
    const t = newTask()
    updateSection(sKey, (s) => {
      const i = afterKey ? s.tasks.findIndex((x) => x.key === afterKey) + 1 : s.tasks.length
      return { ...s, tasks: [...s.tasks.slice(0, i), t, ...s.tasks.slice(i)] }
    })
    setFocusKey(t.key)
  }
  const addSection = () => {
    const s = newSection()
    update((f) => ({ ...f, sections: [...f.sections, s] }))
    setFocusKey(s.key)
  }
  const removeTask = (sKey: string, t: TaskRow) => {
    if (t.id) updateTask(sKey, t.key, (x) => ({ ...x, removed: true, archive: false }))
    else updateSection(sKey, (s) => ({ ...s, tasks: s.tasks.filter((x) => x.key !== t.key) }))
  }
  const removeSection = (s: SectionRow) => {
    if (s.id) updateSection(s.key, (x) => ({ ...x, removed: true }))
    else update((f) => ({ ...f, sections: f.sections.filter((x) => x.key !== s.key) }))
  }

  const save = async () => {
    setError(null)
    try {
      const savedId = await saveProjectDraft(toDraft(form, id))
      setInitialJson(JSON.stringify(form))
      toast(labels.editor.saved)
      if (id) leave()
      else navigate(`/projets/${savedId}`, { replace: true })
    } catch (e) {
      if (!isValidationError(e)) throw e
      if (e.code === 'hasTime')
        toast(labels.editor.hasTime(e.details.map((d) => `« ${d} »`).join(', ')))
      else if (e.code === 'sectionNameRequired') toast(labels.editor.sectionNameRequired)
      else setError(e.code)
    }
  }

  const fieldError = (code: ValidationCode) =>
    error === code && (
      <p role="alert" className="mt-1 text-[13px] text-danger">
        {labels.errors[code as keyof typeof labels.errors]}
      </p>
    )
  const register = (k: string) => (el: HTMLInputElement | null) => {
    if (el) inputs.current.set(k, el)
    else inputs.current.delete(k)
  }

  return (
    <Screen
      title={id ? labels.editor.editTitle : labels.editor.newTitle}
      back="/projets"
      onBack={askLeave}
    >
      <label htmlFor="project-name" className={ui.label}>
        {labels.projects.name}
      </label>
      <input
        id="project-name"
        className={ui.input}
        value={form.name}
        placeholder={labels.projects.namePlaceholder}
        onChange={(e) => update((f) => ({ ...f, name: e.target.value }))}
      />
      {fieldError('nameRequired')}
      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label htmlFor="project-start" className={ui.label}>
            {labels.projects.startDate}
          </label>
          <input
            id="project-start"
            type="date"
            className={ui.input}
            value={form.startDate}
            onChange={(e) => update((f) => ({ ...f, startDate: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="project-end" className={ui.label}>
            {labels.projects.endDate}
          </label>
          <input
            id="project-end"
            type="date"
            className={ui.input}
            value={form.endDate}
            onChange={(e) => update((f) => ({ ...f, endDate: e.target.value }))}
          />
        </div>
      </div>
      {fieldError('endBeforeStart')}

      <p className={ui.label}>{labels.editor.sections}</p>
      {form.sections.map((s, si) =>
        s.removed ? (
          <div
            key={s.key}
            className={`${ui.card} flex items-center justify-between gap-2 text-sm text-muted`}
          >
            <span className="line-through">{labels.editor.sectionRemoved(s.name)}</span>
            <button
              type="button"
              className={`${smallAction} text-felt`}
              onClick={() => updateSection(s.key, (x) => ({ ...x, removed: false }))}
            >
              {labels.editor.restore}
            </button>
          </div>
        ) : (
          <section key={s.key} className={ui.card} aria-label={labels.editor.sectionLabel(si + 1)}>
            <div className="flex items-center gap-2">
              <input
                ref={register(s.key)}
                className={`${ui.input} font-semibold`}
                aria-label={labels.editor.sectionName}
                placeholder={labels.editor.sectionPlaceholder}
                value={s.name}
                enterKeyHint="next"
                onChange={(e) => updateSection(s.key, (x) => ({ ...x, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  if (s.tasks[0]) setFocusKey(s.tasks[0].key)
                  else addTaskAfter(s.key)
                }}
              />
              <button
                type="button"
                className={smallAction}
                aria-label={labels.editor.removeSectionLabel(s.name)}
                onClick={() => removeSection(s)}
              >
                {labels.editor.removeSection}
              </button>
            </div>

            <ul className="mt-1">
              {s.tasks.map((t, ti) => (
                <li
                  key={t.key}
                  className="flex items-center gap-1.5 border-b border-line py-1.5 last:border-b-0"
                >
                  {t.removed || t.archive ? (
                    <>
                      <span
                        className={`min-w-0 flex-1 py-2 text-sm text-muted ${t.removed ? 'line-through' : ''}`}
                      >
                        {t.label}{' '}
                        <em className="not-italic">
                          ({t.removed ? labels.editor.taskRemoved : labels.editor.taskArchived})
                        </em>
                      </span>
                      <button
                        type="button"
                        className={`${smallAction} text-felt`}
                        aria-label={labels.editor.restoreLabel(t.label)}
                        onClick={() =>
                          updateTask(s.key, t.key, (x) => ({
                            ...x,
                            removed: false,
                            archive: false,
                          }))
                        }
                      >
                        {labels.editor.restore}
                      </button>
                    </>
                  ) : (
                    <>
                      <input
                        ref={register(t.key)}
                        className={`${ui.input} min-w-0 flex-1 py-2`}
                        aria-label={labels.editor.taskLabel(s.name, ti + 1)}
                        placeholder={labels.editor.taskPlaceholder}
                        value={t.label}
                        enterKeyHint="next"
                        onChange={(e) =>
                          updateTask(s.key, t.key, (x) => ({ ...x, label: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return
                          e.preventDefault()
                          addTaskAfter(s.key, t.key)
                        }}
                      />
                      {t.id && (
                        <button
                          type="button"
                          className={smallAction}
                          aria-label={labels.editor.archiveTaskLabel(t.label)}
                          onClick={() => updateTask(s.key, t.key, (x) => ({ ...x, archive: true }))}
                        >
                          {labels.editor.archiveTask}
                        </button>
                      )}
                      <button
                        type="button"
                        className={ui.iconButton}
                        aria-label={labels.editor.removeTask(t.label)}
                        onClick={() => removeTask(s.key, t)}
                      >
                        <CloseIcon />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`${ui.link} block`}
              onClick={() => addTaskAfter(s.key)}
            >
              {labels.editor.addTask}
            </button>
          </section>
        ),
      )}
      <button type="button" className={ui.secondary} onClick={addSection}>
        {labels.editor.addSection}
      </button>
      <p className={`${ui.fact} mt-3`}>{labels.editor.hint}</p>

      {/* Pied toujours visible : on enregistre quand on veut. */}
      <div className="sticky -bottom-6 -mx-5 mt-3 -mb-6 flex gap-2.5 border-t border-line bg-screen px-5 pt-3 pb-9">
        <button type="button" className={`${ui.ghost} flex-1`} onClick={askLeave}>
          {labels.common.cancel}
        </button>
        <button
          type="button"
          className={`${ui.primary} flex-1`}
          onClick={save}
          disabled={form.name.trim() === ''}
        >
          {labels.common.save}
        </button>
      </div>

      <Sheet
        open={confirmLeave}
        title={labels.editor.discardTitle}
        onClose={() => setConfirmLeave(false)}
        confirmLabel={labels.editor.discard}
        onConfirm={() => {
          setConfirmLeave(false)
          leave()
        }}
      >
        <p className={`${ui.fact} text-[15px]`}>{labels.editor.discardText}</p>
      </Sheet>
    </Screen>
  )
}
