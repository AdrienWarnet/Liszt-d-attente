import { monotonicNow } from './clock'
import { db } from './db'
import { ValidationError } from './errors'
import type { Day, Project, Section, Task } from './types'

// ---------- Couleurs de projet ----------

export const PROJECT_COLORS = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5'] as const
export type ProjectColor = (typeof PROJECT_COLORS)[number]

const byCreation = (a: { createdAt: number; id: string }, b: { createdAt: number; id: string }) =>
  a.createdAt - b.createdAt || a.id.localeCompare(b.id)

/**
 * Couleur de chaque projet selon son rang de création parmi TOUS les projets
 * (supprimés compris), modulo 6. Ne dépend jamais de l'ordre d'affichage.
 */
export function projectColorMap(allProjects: readonly Project[]): Map<string, ProjectColor> {
  const sorted = [...allProjects].sort(byCreation)
  return new Map(sorted.map((p, i) => [p.id, PROJECT_COLORS[i % PROJECT_COLORS.length]]))
}

export async function getProjectColors(): Promise<Map<string, ProjectColor>> {
  return projectColorMap(await db.projects.toArray())
}

// ---------- Validation ----------

function cleanName(name: string, code: 'nameRequired' | 'labelRequired'): string {
  const trimmed = name.trim()
  if (trimmed === '') throw new ValidationError(code)
  return trimmed
}

const cleanDate = (d: Day | null | undefined): Day | null => (d ? d : null)

function checkDates(startDate: Day | null, endDate: Day | null) {
  if (startDate !== null && endDate !== null && endDate < startDate) {
    throw new ValidationError('endBeforeStart')
  }
}

async function getLiveProject(projectId: string): Promise<Project> {
  const project = await db.projects.get(projectId)
  if (!project) throw new ValidationError('notFound')
  if (project.deletedAt !== null) throw new ValidationError('projectDeleted')
  return project
}

// ---------- Projets ----------

export interface ProjectInput {
  name: string
  startDate?: Day | null
  endDate?: Day | null
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const project: Project = {
    id: crypto.randomUUID(),
    name: cleanName(input.name, 'nameRequired'),
    startDate: cleanDate(input.startDate),
    endDate: cleanDate(input.endDate),
    deletedAt: null,
    createdAt: monotonicNow(),
  }
  checkDates(project.startDate, project.endDate)
  await db.projects.add(project)
  return project
}

export async function updateProject(id: string, patch: Partial<ProjectInput>): Promise<Project> {
  const current = await getLiveProject(id)
  const next: Project = {
    ...current,
    name: patch.name === undefined ? current.name : cleanName(patch.name, 'nameRequired'),
    startDate: patch.startDate === undefined ? current.startDate : cleanDate(patch.startDate),
    endDate: patch.endDate === undefined ? current.endDate : cleanDate(patch.endDate),
  }
  checkDates(next.startDate, next.endDate)
  await db.projects.put(next)
  return next
}

/** Suppression logique : sections, tâches et temps restent en base. */
export async function deleteProject(id: string): Promise<void> {
  await getLiveProject(id)
  await db.projects.update(id, { deletedAt: Date.now() })
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id)
}

export interface ProjectSummary {
  project: Project
  color: ProjectColor
  activeTaskCount: number
}

/** Projets non supprimés, par date de création, avec couleur et nombre de tâches actives. */
export async function listProjects(): Promise<ProjectSummary[]> {
  const all = await db.projects.toArray()
  const colors = projectColorMap(all)
  const live = all.filter((p) => p.deletedAt === null).sort(byCreation)
  const activeTasks = await db.tasks.where('status').equals('active').toArray()
  return live.map((project) => ({
    project,
    color: colors.get(project.id)!,
    activeTaskCount: activeTasks.filter((t) => t.projectId === project.id).length,
  }))
}

// ---------- Sections ----------

export async function createSection(projectId: string, name: string): Promise<Section> {
  const cleaned = cleanName(name, 'nameRequired')
  return db.transaction('rw', db.projects, db.sections, async () => {
    await getLiveProject(projectId)
    const siblings = await db.sections.where('projectId').equals(projectId).toArray()
    const section: Section = {
      id: crypto.randomUUID(),
      projectId,
      name: cleaned,
      progress: null,
      order: siblings.reduce((max, s) => Math.max(max, s.order), -1) + 1,
      createdAt: monotonicNow(),
    }
    await db.sections.add(section)
    return section
  })
}

export async function updateSection(
  id: string,
  patch: { name?: string; progress?: string | null },
): Promise<void> {
  const section = await db.sections.get(id)
  if (!section) throw new ValidationError('notFound')
  const changes: Partial<Section> = {}
  if (patch.name !== undefined) changes.name = cleanName(patch.name, 'nameRequired')
  if (patch.progress !== undefined) {
    const progress = patch.progress?.trim() ?? ''
    changes.progress = progress === '' ? null : progress
  }
  await db.sections.update(id, changes)
}

// ---------- Tâches ----------

export async function createTask(sectionId: string, label: string): Promise<Task> {
  const cleaned = cleanName(label, 'labelRequired')
  return db.transaction('rw', db.projects, db.sections, db.tasks, async () => {
    const section = await db.sections.get(sectionId)
    if (!section) throw new ValidationError('notFound')
    await getLiveProject(section.projectId)
    const task: Task = {
      id: crypto.randomUUID(),
      sectionId,
      projectId: section.projectId,
      label: cleaned,
      status: 'active',
      archivedAt: null,
      createdAt: monotonicNow(),
    }
    await db.tasks.add(task)
    return task
  })
}

export async function updateTask(id: string, patch: { label: string }): Promise<void> {
  const label = cleanName(patch.label, 'labelRequired')
  const count = await db.tasks.update(id, { label })
  if (count === 0 && !(await db.tasks.get(id))) throw new ValidationError('notFound')
}

export async function archiveTask(id: string): Promise<void> {
  await archiveTasks([id])
}

/** Archive plusieurs tâches en une seule transaction (revue de semaine). */
export async function archiveTasks(ids: readonly string[]): Promise<void> {
  const now = Date.now()
  await db.transaction('rw', db.tasks, async () => {
    for (const id of ids) {
      const task = await db.tasks.get(id)
      if (!task) throw new ValidationError('notFound')
      if (task.status === 'active')
        await db.tasks.update(id, { status: 'archived', archivedAt: now })
    }
  })
}

export async function reactivateTask(id: string): Promise<void> {
  const task = await db.tasks.get(id)
  if (!task) throw new ValidationError('notFound')
  await db.tasks.update(id, { status: 'active', archivedAt: null })
}

// ---------- Lectures groupées ----------

export interface SectionWithTasks {
  section: Section
  activeTasks: Task[]
  archivedTasks: Task[]
}

const sortSections = (sections: Section[]) =>
  sections.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)

/** Sections d'un projet dans l'ordre, avec leurs tâches actives et archivées (par création). */
export async function listSectionsWithTasks(projectId: string): Promise<SectionWithTasks[]> {
  const sections = sortSections(await db.sections.where('projectId').equals(projectId).toArray())
  const tasks = (await db.tasks.where('projectId').equals(projectId).toArray()).sort(byCreation)
  return sections.map((section) => {
    const own = tasks.filter((t) => t.sectionId === section.id)
    return {
      section,
      activeTasks: own.filter((t) => t.status === 'active'),
      archivedTasks: own.filter((t) => t.status === 'archived'),
    }
  })
}

export interface ActiveTasksGroup {
  project: Project
  color: ProjectColor
  sections: { section: Section; tasks: Task[] }[]
}

/**
 * Tâches actives des projets non supprimés, groupées projet → section.
 * Toutes les sections sont présentes (même sans tâche) pour pouvoir en ajouter.
 */
export async function listActiveTasksGrouped(): Promise<ActiveTasksGroup[]> {
  const projects = await listProjects()
  const sections = await db.sections.toArray()
  const tasks = (await db.tasks.where('status').equals('active').toArray()).sort(byCreation)
  return projects.map(({ project, color }) => ({
    project,
    color,
    sections: sortSections(sections.filter((s) => s.projectId === project.id)).map((section) => ({
      section,
      tasks: tasks.filter((t) => t.sectionId === section.id),
    })),
  }))
}
