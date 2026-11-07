import type { ProjectColor } from '../data/projects'
import type { Project } from '../data/types'
import { labels } from '../labels'
import { projectBg } from './ui'

/** En-tête de groupe projet du proto : pastille de couleur + nom (R26). */
export function ProjectGroupHeader({ project, color }: { project: Project; color: ProjectColor }) {
  return (
    <div className="mt-4 flex items-center gap-2 text-sm font-bold">
      <i className={`size-2.5 shrink-0 rounded-[3px] ${projectBg[color]}`} aria-hidden="true" />
      {project.name}
      {project.deletedAt !== null && (
        <span className="font-normal text-muted">{labels.day.deleted}</span>
      )}
    </div>
  )
}
