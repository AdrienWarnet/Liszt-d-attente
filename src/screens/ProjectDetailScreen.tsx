import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Screen } from '../components/Screen'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/Toast'
import { ui } from '../components/ui'
import { formatDayMonth } from '../data/dates'
import { useProject, useSectionsWithTasks } from '../data/hooks'
import { deleteProject } from '../data/projects'
import type { Project } from '../data/types'
import { labels } from '../labels'
import { ArchivedTasks } from './projects/Archiving'
import { SectionCard } from './projects/SectionCard'

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

/**
 * Détail d'un projet (proto `V.projet`). La saisie des sections et tâches se fait dans
 * l'écran d'édition (« Modifier », lot 5) ; ici : consultation, avancement, réactivation.
 */
export function ProjectDetailScreen() {
  const { id } = useParams()
  const data = useProject(id)
  const sections = useSectionsWithTasks(id)
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
  const chip = `${ui.chip} inline-flex items-center`
  return (
    <Screen title={project.name} subtitle={projectSubtitle(project)} back="/projets">
      <div className="mt-1 mb-3.5 flex flex-wrap gap-2">
        <Link to={`/projets/${project.id}/modifier`} className={chip}>
          {labels.projects.edit}
        </Link>
        <Link to={`/projets/${project.id}/planning`} className={chip}>
          {labels.projects.planning}
        </Link>
        <Link to={`/projets/${project.id}/bilan`} className={chip}>
          {labels.projects.report}
        </Link>
        <button type="button" className={ui.chipDanger} onClick={() => setConfirmDelete(true)}>
          {labels.projects.delete}
        </button>
      </div>

      {sections?.length === 0 && (
        <>
          <p className={`${ui.fact} mb-3`}>{labels.projects.noSection}</p>
          <Link
            to={`/projets/${project.id}/modifier`}
            className={`${ui.secondary} block text-center`}
          >
            {labels.editor.fillProject}
          </Link>
        </>
      )}
      {sections?.map((data) => (
        <SectionCard
          key={data.section.id}
          data={data}
          footer={<ArchivedTasks tasks={data.archivedTasks} />}
        />
      ))}

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
