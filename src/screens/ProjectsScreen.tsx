import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Screen } from '../components/Screen'
import { ui } from '../components/ui'
import { formatDayMonth } from '../data/dates'
import { useProjects } from '../data/hooks'
import type { Project } from '../data/types'
import { labels } from '../labels'
import { ProjectFormSheet } from './projects/ProjectFormSheet'

function projectLine(project: Project, activeTaskCount: number) {
  return [
    project.startDate && labels.projects.since(formatDayMonth(project.startDate)),
    project.endDate && labels.projects.until(formatDayMonth(project.endDate)),
    labels.projects.activeTasks(activeTaskCount),
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Onglet Projets (proto `V.projets`). */
export function ProjectsScreen() {
  const projects = useProjects()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)

  return (
    <Screen title={labels.tabs.projects}>
      {projects?.length === 0 && <p className={`${ui.fact} mb-4`}>{labels.projects.empty}</p>}

      {projects?.map(({ project, activeTaskCount }) => (
        <Link
          key={project.id}
          to={`/projets/${project.id}`}
          className="mb-2.5 block rounded-2xl border border-line px-4 py-3.5"
        >
          <strong className="block text-[17px]">{project.name}</strong>
          <span className={ui.crumb}>{projectLine(project, activeTaskCount)}</span>
        </Link>
      ))}

      <button type="button" className={ui.secondary} onClick={() => setCreating(true)}>
        {labels.projects.newProject}
      </button>
      <Link to="/revue" className={`${ui.link} mt-2 block`}>
        {labels.projects.reviewLink}
      </Link>

      {creating && (
        <ProjectFormSheet
          onClose={() => setCreating(false)}
          onSaved={(project) => {
            setCreating(false)
            navigate(`/projets/${project.id}`)
          }}
        />
      )}
    </Screen>
  )
}
