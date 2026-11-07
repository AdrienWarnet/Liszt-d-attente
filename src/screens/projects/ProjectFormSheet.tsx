import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { ui } from '../../components/ui'
import { isValidationError, type ValidationCode } from '../../data/errors'
import { createProject, updateProject } from '../../data/projects'
import type { Project } from '../../data/types'
import { labels } from '../../labels'

interface ProjectFormSheetProps {
  /** Projet à modifier ; absent = création. */
  project?: Project
  onClose: () => void
  onSaved: (project: Project) => void
}

/** Feuille « Nouveau projet » / « Modifier le projet » (proto `SH.newProject`). */
export function ProjectFormSheet({ project, onClose, onSaved }: ProjectFormSheetProps) {
  const [name, setName] = useState(project?.name ?? '')
  const [startDate, setStartDate] = useState(project?.startDate ?? '')
  const [endDate, setEndDate] = useState(project?.endDate ?? '')
  const [error, setError] = useState<ValidationCode | null>(null)

  const save = async () => {
    // Champ date vidé → null (géré par la couche donnée).
    const input = { name, startDate: startDate || null, endDate: endDate || null }
    try {
      onSaved(project ? await updateProject(project.id, input) : await createProject(input))
    } catch (e) {
      if (isValidationError(e)) setError(e.code)
      else throw e
    }
  }

  const errorText = (code: ValidationCode) =>
    error === code && (
      <p role="alert" className="mt-1 text-[13px] text-danger">
        {labels.errors[code as keyof typeof labels.errors]}
      </p>
    )

  return (
    <Sheet
      open
      title={project ? labels.projects.editTitle : labels.projects.newTitle}
      onClose={onClose}
      confirmLabel={labels.common.save}
      onConfirm={save}
      confirmDisabled={name.trim() === ''}
    >
      <label htmlFor="project-name" className={ui.label}>
        {labels.projects.name}
      </label>
      <input
        id="project-name"
        className={ui.input}
        value={name}
        placeholder={labels.projects.namePlaceholder}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && name.trim() !== '' && save()}
      />
      {errorText('nameRequired')}

      <label htmlFor="project-start" className={ui.label}>
        {labels.projects.startDate}
      </label>
      <input
        id="project-start"
        type="date"
        className={ui.input}
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />

      <label htmlFor="project-end" className={ui.label}>
        {labels.projects.endDate}
      </label>
      <input
        id="project-end"
        type="date"
        className={ui.input}
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
      {errorText('endBeforeStart')}
    </Sheet>
  )
}
