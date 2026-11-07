import { monotonicNow } from './clock'
import { db } from './db'
import { ValidationError } from './errors'
import { purgeTask, taskHasTime } from './projects'
import type { Day, Project, Section, Task } from './types'

// Écran d'édition du projet (lot 5) : tout est enregistré d'un bloc, en une transaction.
// Si une règle bloque (nom vide, temps enregistré…), rien n'est modifié.

export interface TaskDraft {
  /** Absent = nouvelle tâche. */
  id?: string
  label: string
  /** Tâche à archiver à l'enregistrement. */
  archive?: boolean
}

export interface SectionDraft {
  /** Absent = nouvelle section. */
  id?: string
  name: string
  tasks: TaskDraft[]
}

export interface ProjectDraft {
  /** Absent = nouveau projet. */
  id?: string
  name: string
  startDate: Day | null
  endDate: Day | null
  /** Sections dans l'ordre voulu ; une section ou une tâche active absente sera supprimée. */
  sections: SectionDraft[]
}

/** Charge un projet existant dans le format de l'éditeur (tâches actives seulement). */
export async function loadProjectDraft(projectId: string): Promise<ProjectDraft | null> {
  const project = await db.projects.get(projectId)
  if (!project || project.deletedAt !== null) return null
  const sections = (await db.sections.where('projectId').equals(projectId).toArray()).sort(
    (a, b) => a.order - b.order || a.createdAt - b.createdAt,
  )
  const tasks = (await db.tasks.where('projectId').equals(projectId).toArray())
    .filter((t) => t.status === 'active')
    .sort((a, b) => a.createdAt - b.createdAt)
  return {
    id: project.id,
    name: project.name,
    startDate: project.startDate,
    endDate: project.endDate,
    sections: sections.map((s) => ({
      id: s.id,
      name: s.name,
      tasks: tasks.filter((t) => t.sectionId === s.id).map((t) => ({ id: t.id, label: t.label })),
    })),
  }
}

/**
 * Enregistre le projet, ses sections et ses tâches.
 * - Lignes vides ignorées (tâche sans libellé, section sans nom ni tâche).
 * - Section sans nom mais avec des tâches : refus `sectionNameRequired`.
 * - Section ou tâche active retirée : supprimée si aucun temps n'y est enregistré, sinon
 *   refus `hasTime` (détails = libellés concernés) ; on peut l'archiver à la place.
 * - Les tâches archivées n'apparaissent pas dans l'éditeur et ne sont pas touchées
 *   (sauf si leur section est retirée).
 * Renvoie l'identifiant du projet.
 */
export async function saveProjectDraft(draft: ProjectDraft): Promise<string> {
  const name = draft.name.trim()
  if (name === '') throw new ValidationError('nameRequired')
  const startDate = draft.startDate || null
  const endDate = draft.endDate || null
  if (startDate && endDate && endDate < startDate) throw new ValidationError('endBeforeStart')

  // Nettoyage des lignes vides.
  const sections = draft.sections
    .map((s) => ({
      ...s,
      name: s.name.trim(),
      tasks: s.tasks.map((t) => ({ ...t, label: t.label.trim() })).filter((t) => t.label !== ''),
    }))
    .filter((s) => s.name !== '' || s.tasks.length > 0 || s.id)
  if (sections.some((s) => s.name === '')) throw new ValidationError('sectionNameRequired')

  return db.transaction(
    'rw',
    [
      db.projects,
      db.sections,
      db.tasks,
      db.sessionTasks,
      db.timeSegments,
      db.manualEntries,
      db.taskDayPlans,
      db.sectionPlacements,
    ],
    async () => {
      // Projet.
      let project: Project
      if (draft.id) {
        const current = await db.projects.get(draft.id)
        if (!current || current.deletedAt !== null) throw new ValidationError('notFound')
        project = { ...current, name, startDate, endDate }
        await db.projects.put(project)
      } else {
        project = {
          id: crypto.randomUUID(),
          name,
          startDate,
          endDate,
          deletedAt: null,
          createdAt: monotonicNow(),
        }
        await db.projects.add(project)
      }

      const existingSections = await db.sections.where('projectId').equals(project.id).toArray()
      const existingTasks = await db.tasks.where('projectId').equals(project.id).toArray()
      const keptSectionIds = new Set(sections.map((s) => s.id).filter(Boolean))
      const keptTaskIds = new Set(sections.flatMap((s) => s.tasks.map((t) => t.id)).filter(Boolean))

      // Suppressions : tâches actives retirées et sections retirées (avec toutes leurs tâches).
      const removedSections = existingSections.filter((s) => !keptSectionIds.has(s.id))
      const removedTasks = existingTasks.filter(
        (t) =>
          removedSections.some((s) => s.id === t.sectionId) ||
          (t.status === 'active' && !keptTaskIds.has(t.id)),
      )
      const blocked: string[] = []
      for (const t of removedTasks) if (await taskHasTime(t.id)) blocked.push(t.label)
      if (blocked.length > 0) throw new ValidationError('hasTime', blocked)
      for (const t of removedTasks) await purgeTask(t.id)
      for (const s of removedSections) {
        await db.sectionPlacements.where('sectionId').equals(s.id).delete()
        await db.sections.delete(s.id)
      }

      // Sections et tâches gardées ou nouvelles, dans l'ordre de l'éditeur.
      const now = Date.now()
      for (const [order, s] of sections.entries()) {
        let section: Section
        const current = s.id ? existingSections.find((x) => x.id === s.id) : undefined
        if (current) {
          section = { ...current, name: s.name, order }
          await db.sections.put(section)
        } else {
          section = {
            id: crypto.randomUUID(),
            projectId: project.id,
            name: s.name,
            progress: null,
            order,
            createdAt: monotonicNow(),
          }
          await db.sections.add(section)
        }
        for (const t of s.tasks) {
          const existing = t.id ? existingTasks.find((x) => x.id === t.id) : undefined
          const archive = t.archive === true
          if (existing) {
            const next: Task = {
              ...existing,
              label: t.label,
              sectionId: section.id,
              ...(archive ? { status: 'archived', archivedAt: now } : {}),
            }
            await db.tasks.put(next)
          } else {
            await db.tasks.add({
              id: crypto.randomUUID(),
              sectionId: section.id,
              projectId: project.id,
              label: t.label,
              status: archive ? 'archived' : 'active',
              archivedAt: archive ? now : null,
              createdAt: monotonicNow(),
            })
          }
        }
      }
      return project.id
    },
  )
}
