import { addWeeks, toDay, weekStart as weekStartOf } from './dates'
import { db } from './db'
import { ValidationError } from './errors'
import { listProjects, type ProjectColor } from './projects'
import type { Project, Section, SectionPlacement, Timestamp, WeekStart } from './types'

// Planning macro (R13, R14) : le premier placement d'une section est figé (prévu
// initial) ; les modifications ne touchent que le prévu revu.

const sortWeeks = (weeks: Iterable<WeekStart>) => [...new Set(weeks)].sort()

async function placementsOf(sectionId: string) {
  return db.sectionPlacements.where('sectionId').equals(sectionId).toArray()
}

/**
 * Place une section sur des semaines.
 * - Aucun prévu initial et semaines non vides : crée l'initial ET le revu.
 * - Sinon : remplace seulement le revu ; l'initial n'est jamais modifié ni supprimé.
 */
export async function setSectionWeeks(sectionId: string, weekStarts: readonly WeekStart[]) {
  const weeks = sortWeeks(weekStarts)
  await db.transaction('rw', db.sections, db.sectionPlacements, async () => {
    if (!(await db.sections.get(sectionId))) throw new ValidationError('notFound')
    const current = await placementsOf(sectionId)
    const hasInitial = current.some((p) => p.kind === 'initial')
    const rows = (kind: SectionPlacement['kind']) =>
      weeks.map((weekStart) => ({ id: crypto.randomUUID(), sectionId, weekStart, kind }))
    if (!hasInitial) {
      if (weeks.length > 0)
        await db.sectionPlacements.bulkAdd([...rows('initial'), ...rows('revised')])
      return
    }
    await db.sectionPlacements.bulkDelete(
      current.filter((p) => p.kind === 'revised').map((p) => p.id),
    )
    await db.sectionPlacements.bulkAdd(rows('revised'))
  })
}

/**
 * Ajoute ou retire une semaine du prévu revu (case du planning).
 * Renvoie `true` si c'était le premier placement (devenu le prévu initial).
 */
export async function toggleSectionWeek(sectionId: string, week: WeekStart): Promise<boolean> {
  // Lecture et écriture dans la même transaction : deux touchers rapides ne se marchent pas dessus.
  return db.transaction('rw', db.sections, db.sectionPlacements, async () => {
    const current = await placementsOf(sectionId)
    const first = !current.some((p) => p.kind === 'initial')
    const revised = new Set(current.filter((p) => p.kind === 'revised').map((p) => p.weekStart))
    if (revised.has(week)) revised.delete(week)
    else revised.add(week)
    await setSectionWeeks(sectionId, [...revised])
    return first
  })
}

export interface SectionPlanning {
  section: Section
  initialWeeks: WeekStart[]
  revisedWeeks: WeekStart[]
  progress: string | null
  /** Le revu diffère de l'initial (indicateur « modifié »). */
  changed: boolean
}

export interface ProjectPlanning {
  project: Project
  /** Semaines affichées, du lundi le plus ancien au plus récent. */
  weeks: WeekStart[]
  currentWeek: WeekStart
  sections: SectionPlanning[]
}

/** Semaines vues au minimum à partir de la semaine courante. */
export const PLANNING_MIN_WEEKS = 8

/**
 * Planning d'un projet. Plage affichée : de la plus ancienne à la plus récente semaine
 * parmi placements, date de début et date de fin, élargie pour toujours montrer la
 * semaine courante et les 7 suivantes (sinon on ne pourrait rien placer).
 */
export async function getProjectPlanning(
  projectId: string,
  now: Timestamp = Date.now(),
): Promise<ProjectPlanning | null> {
  const project = await db.projects.get(projectId)
  if (!project) return null
  const sections = (await db.sections.where('projectId').equals(projectId).toArray()).sort(
    (a, b) => a.order - b.order || a.createdAt - b.createdAt,
  )
  const placements = await db.sectionPlacements
    .where('sectionId')
    .anyOf(sections.map((s) => s.id))
    .toArray()

  const currentWeek = weekStartOf(toDay(now))
  const candidates = [
    ...placements.map((p) => p.weekStart),
    ...[project.startDate, project.endDate].filter((d): d is string => !!d).map(weekStartOf),
    currentWeek,
    addWeeks(currentWeek, PLANNING_MIN_WEEKS - 1),
  ].sort()
  const weeks: WeekStart[] = []
  for (let w = candidates[0]; w <= candidates[candidates.length - 1]; w = addWeeks(w, 1))
    weeks.push(w)

  return {
    project,
    weeks,
    currentWeek,
    sections: sections.map((section) => {
      const own = placements.filter((p) => p.sectionId === section.id)
      const initialWeeks = sortWeeks(
        own.filter((p) => p.kind === 'initial').map((p) => p.weekStart),
      )
      const revisedWeeks = sortWeeks(
        own.filter((p) => p.kind === 'revised').map((p) => p.weekStart),
      )
      return {
        section,
        initialWeeks,
        revisedWeeks,
        progress: section.progress,
        changed: initialWeeks.join() !== revisedWeeks.join(),
      }
    }),
  }
}

export interface WeekPlanningGroup {
  project: Project
  color: ProjectColor
  sections: { section: Section; inInitial: boolean }[]
}

/** Sections placées (revu) sur une semaine, projets non supprimés, groupées par projet (bilan, 6.2). */
export async function getWeekPlanningAllProjects(week: WeekStart): Promise<WeekPlanningGroup[]> {
  // Pas d'index sur weekStart (schéma v1) : filtre, la table reste petite.
  const placements = await db.sectionPlacements.filter((p) => p.weekStart === week).toArray()
  const sections = new Map(
    (await db.sections.bulkGet([...new Set(placements.map((p) => p.sectionId))]))
      .filter((s): s is Section => !!s)
      .map((s) => [s.id, s]),
  )
  return (await listProjects())
    .map(({ project, color }) => ({
      project,
      color,
      sections: [...sections.values()]
        .filter((s) => s.projectId === project.id)
        .filter((s) => placements.some((p) => p.sectionId === s.id && p.kind === 'revised'))
        .sort((a, b) => a.order - b.order)
        .map((section) => ({
          section,
          inInitial: placements.some((p) => p.sectionId === section.id && p.kind === 'initial'),
        })),
    }))
    .filter((g) => g.sections.length > 0)
}
