import { useState, type ReactNode } from 'react'
import { ui } from '../../components/ui'
import { createTask, updateSection, updateTask, type SectionWithTasks } from '../../data/projects'
import type { Section, Task } from '../../data/types'
import { labels } from '../../labels'

/** Zone « Avancement » : enregistrée à la sortie du champ ; vidée → null. */
export function ProgressField({ section, placeholder }: { section: Section; placeholder: string }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <textarea
      rows={1}
      aria-label={labels.projects.progressLabel(section.name)}
      placeholder={placeholder}
      className={`${ui.input} my-2 min-h-11 resize-y text-sm`}
      value={draft ?? section.progress ?? ''}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={async () => {
        if (draft !== null && draft !== (section.progress ?? '')) {
          await updateSection(section.id, { progress: draft })
        }
        setDraft(null)
      }}
    />
  )
}

/** Champ « + Ajouter une tâche » : Entrée pour valider, reste ouvert pour enchaîner. */
export function AddTaskInput({ section }: { section: Section }) {
  const [value, setValue] = useState('')
  return (
    <input
      className={`${ui.input} mt-2`}
      aria-label={labels.projects.addTaskLabel(section.name)}
      placeholder={labels.projects.addTask}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={async (e) => {
        if (e.key !== 'Enter' || value.trim() === '') return
        // Vider tout de suite : on peut enchaîner la saisie suivante sans attendre la base.
        setValue('')
        await createTask(section.id, value)
      }}
    />
  )
}

/** Libellé de tâche modifiable sur place (ajout au proto validé par le PO). */
function TaskLabel({ task }: { task: Task }) {
  const [draft, setDraft] = useState<string | null>(null)
  const commit = async () => {
    if (draft !== null && draft.trim() !== '' && draft.trim() !== task.label) {
      await updateTask(task.id, { label: draft })
    }
    setDraft(null)
  }

  if (draft === null) {
    return (
      <button
        type="button"
        className="min-h-11 min-w-0 flex-1 text-left"
        aria-label={labels.projects.editTask(task.label)}
        onClick={() => setDraft(task.label)}
      >
        {task.label}
      </button>
    )
  }
  return (
    <input
      autoFocus
      className={`${ui.input} min-w-0 flex-1 py-2`}
      aria-label={labels.projects.editTask(task.label)}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(null)
      }}
    />
  )
}

interface SectionCardProps {
  data: SectionWithTasks
  /** Action à droite de chaque tâche active (ex. « Archiver », 2.5). */
  taskAction?: (task: Task) => ReactNode
  /** Contenu sous le champ d'ajout (ex. tâches archivées, 2.5). */
  footer?: ReactNode
}

/** Carte d'une section dans le détail projet (proto `V.projet`). */
export function SectionCard({ data, taskAction, footer }: SectionCardProps) {
  const { section, activeTasks } = data
  return (
    <section className={ui.card} aria-label={section.name}>
      <strong>{section.name}</strong>
      <ProgressField section={section} placeholder={labels.projects.progressPlaceholder} />
      <ul>
        {activeTasks.map((task) => (
          <li key={task.id} className="flex items-center gap-2.5 border-t border-line text-sm">
            <TaskLabel task={task} />
            {taskAction?.(task)}
          </li>
        ))}
      </ul>
      <AddTaskInput section={section} />
      {footer}
    </section>
  )
}
