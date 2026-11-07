import { useState, type ReactNode } from 'react'
import { ui } from '../../components/ui'
import { createTask, updateSection, type SectionWithTasks } from '../../data/projects'
import type { Section } from '../../data/types'
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

/**
 * Ajout rapide d'une tâche (revue de semaine) : bouton « Ajouter » ou touche Entrée.
 * Le champ se vide tout de suite pour enchaîner la saisie suivante.
 */
export function AddTaskInput({ section }: { section: Section }) {
  const [value, setValue] = useState('')
  const add = async () => {
    if (value.trim() === '') return
    setValue('')
    await createTask(section.id, value)
  }
  return (
    <div className="mt-2 flex gap-2">
      <input
        className={`${ui.input} min-w-0 flex-1`}
        aria-label={labels.projects.addTaskLabel(section.name)}
        placeholder={labels.projects.addTask}
        value={value}
        enterKeyHint="done"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
      />
      <button
        type="button"
        className="min-h-11 shrink-0 rounded-[10px] bg-felt-soft px-3.5 text-sm font-semibold text-felt disabled:opacity-40"
        disabled={value.trim() === ''}
        onClick={add}
      >
        {labels.projects.addTaskButton}
      </button>
    </div>
  )
}

/** Carte d'une section dans le détail projet : consultation, avancement, tâches archivées. */
export function SectionCard({ data, footer }: { data: SectionWithTasks; footer?: ReactNode }) {
  const { section, activeTasks } = data
  return (
    <section className={ui.card} aria-label={section.name}>
      <strong>{section.name}</strong>
      <ProgressField section={section} placeholder={labels.projects.progressPlaceholder} />
      <ul>
        {activeTasks.map((task) => (
          <li key={task.id} className="flex min-h-11 items-center border-t border-line text-sm">
            {task.label}
          </li>
        ))}
      </ul>
      {footer}
    </section>
  )
}
