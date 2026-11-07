import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Screen } from '../components/Screen'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { ui } from '../components/ui'
import { formatDayMonth } from '../data/dates'
import { useProject, useSectionsWithTasks } from '../data/hooks'
import { createSection, deleteProject } from '../data/projects'
import type { Project } from '../data/types'
import { labels } from '../labels'
import { ArchiveButton, ArchivedTasks } from './projects/Archiving'
import { ProjectFormSheet } from './projects/ProjectFormSheet'
import { SectionCard } from './projects/SectionCard'

/** Champ « + Nouvelle section » : Entrée pour valider. */
function NewSectionInput({ projectId }: { projectId: string }) {
  const [value, setValue] = useState('')
  return (
    <input
      className={ui.input}
      aria-label={labels.projects.newSection}
      placeholder={labels.projects.newSection}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={async (e) => {
        if (e.key !== 'Enter' || value.trim() === '') return
        // Vider tout de suite : on peut enchaîner la saisie suivante sans attendre la base.
        setValue('')
        await createSection(projectId, value)
      }}
    />
  )
}

function projectSubtitle(project: Project) {
  return [
    project.startDate
      ? labels.projects.sinceTitle(formatDayMonth(project.startDate))
      : labels.projects.noStart,
    project.endDate && labels.projects.until(formatDayMonth(project.endDate)),
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Détail d'un projet (proto `V.projet`). */
export function ProjectDetailScreen() {
  const { id } = useParams()
  const data = useProject(id)
  const sections = useSectionsWithTasks(id)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  if (data === undefined) return <Screen title="" back="/projets" />
  if (data === null || (data.project.deletedAt !== null && !confirmDelete)) {
    return (
      <Screen title={labels.tabs.projects} back="/projets">
        <p className={ui.fact}>{labels.projects.notFound}</p>
      </Screen>
    )
  }

  const { project } = data
  return (
    <Screen title={project.name} subtitle={projectSubtitle(project)} back="/projets">
      <div className="mt-1 mb-3.5 flex flex-wrap gap-2">
        <button type="button" className={ui.chip} onClick={() => setEditing(true)}>
          {labels.projects.edit}
        </button>
        <Link
          to={`/projets/${project.id}/planning`}
          className={`${ui.chip} inline-flex items-center`}
        >
          {labels.projects.planning}
        </Link>
        <Link to={`/projets/${project.id}/bilan`} className={`${ui.chip} inline-flex items-center`}>
          {labels.projects.report}
        </Link>
        <button type="button" className={ui.chipDanger} onClick={() => setConfirmDelete(true)}>
          {labels.projects.delete}
        </button>
      </div>

      {sections?.length === 0 && <p className={`${ui.fact} mb-3`}>{labels.projects.noSection}</p>}
      {sections?.map((data) => (
        <SectionCard
          key={data.section.id}
          data={data}
          taskAction={(task) => <ArchiveButton task={task} />}
          footer={<ArchivedTasks tasks={data.archivedTasks} />}
        />
      ))}
      <NewSectionInput projectId={project.id} />

      {editing && (
        <ProjectFormSheet
          project={project}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}

      <Sheet
        open={confirmDelete}
        title={labels.projects.deleteTitle(project.name)}
        onClose={() => setConfirmDelete(false)}
        confirmLabel={labels.projects.delete}
        onConfirm={async () => {
          await deleteProject(project.id)
          navigate('/projets', { replace: true })
          toast(labels.projects.deleted)
        }}
      >
        <p className={`${ui.fact} text-[15px]`}>{labels.projects.deleteText}</p>
      </Sheet>
    </Screen>
  )
}
