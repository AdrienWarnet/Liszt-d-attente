import { useState } from 'react'
import { useParams } from 'react-router'
import { Screen } from '../components/Screen'
import { ui } from '../components/ui'
import { formatDayMonth } from '../data/dates'
import { useProject } from '../data/hooks'
import type { Project } from '../data/types'
import { labels } from '../labels'
import { ProjectFormSheet } from './projects/ProjectFormSheet'

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
  const [editing, setEditing] = useState(false)

  if (data === undefined) return <Screen title="" back="/projets" />
  if (data === null || data.project.deletedAt !== null) {
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
      </div>

      {editing && (
        <ProjectFormSheet
          project={project}
          onClose={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      )}
    </Screen>
  )
}
