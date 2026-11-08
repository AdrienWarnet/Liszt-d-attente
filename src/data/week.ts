import { toDay, weekDays } from './dates'
import { db } from './db'
import { formatDuration, sumNullable } from './durations'
import { listProjects, type ProjectColor } from './projects'
import {
  groupByProject,
  listRealEntries,
  taskContexts,
  type ProjectGroup,
  type TaskContext,
} from './sessions'
import type { Day, DurationSec, Project, Timestamp, WeekStart } from './types'
import { labels } from '../labels'

// ---------- Écarts et barres (R12) ----------

/** Seuil sous lequel un écart vaut « pile dans le budget » ; seuil du rouge pour le prévu. */
export const GAP_THRESHOLD_SEC = 60

export type GapRef = 'budget' | 'planned'

/**
 * « 0:15 au-dessus du budget », « 2:20 sous le budget », « pile dans le budget »
 * (ou « … du prévu »). `null` si l'une des deux valeurs est `null`.
 */
export function formatGap(
  value: DurationSec | null,
  ref: DurationSec | null,
  kind: GapRef = 'budget',
): string | null {
  if (value === null || ref === null) return null
  const diff = value - ref
  const words = labels.gap[kind]
  if (Math.abs(diff) < GAP_THRESHOLD_SEC) return words.even
  return `${formatDuration(Math.abs(diff))} ${diff > 0 ? words.above : words.below}`
}

/** Prévu au-dessus du budget d'au moins une minute : seul cas affiché en rouge (R12). */
export function isPlannedOverBudget(
  planned: DurationSec | null,
  budget: DurationSec | null,
): boolean {
  return planned !== null && budget !== null && planned - budget >= GAP_THRESHOLD_SEC
}

export interface BarFill {
  /** Largeur du remplissage, 0 à 100. */
  percent: number
  /** Valeur au-dessus de la référence (remplissage `ink`, constat neutre). */
  over: boolean
}

/** Barre « valeur / référence » du proto. */
export function barFill(value: DurationSec | null, ref: DurationSec | null): BarFill {
  if (value === null && ref === null) return { percent: 0, over: false }
  const v = value ?? 0
  const scale = ref || Math.max(v, ref ?? 0) || 1
  return { percent: Math.min(100, (v / scale) * 100), over: ref !== null && v > ref }
}

// ---------- Budget ----------

/** `null` → ligne supprimée (budget non saisi). 0 reste 0. */
export async function setDailyBudget(day: Day, durationSec: DurationSec | null): Promise<void> {
  if (durationSec === null) await db.dailyBudgets.delete(day)
  else await db.dailyBudgets.put({ day, durationSec })
}

export async function getWeekBudget(weekStart: WeekStart) {
  const days = weekDays(weekStart)
  const rows = await db.dailyBudgets.bulkGet(days)
  const budgets = days.map((day, i) => ({ day, durationSec: rows[i]?.durationSec ?? null }))
  return { days: budgets, total: sumNullable(budgets.map((d) => d.durationSec)) }
}

// ---------- Temps prévu ----------

export async function setProjectWeekPlan(
  projectId: string,
  weekStart: WeekStart,
  durationSec: DurationSec | null,
): Promise<void> {
  if (durationSec === null) await db.projectWeekPlans.delete([projectId, weekStart])
  else await db.projectWeekPlans.put({ projectId, weekStart, durationSec })
}

/** Marque la tâche « prévue » ce jour (la ligne existe), avec ou sans durée. */
export async function planTaskOnDay(taskId: string, day: Day, durationSec: DurationSec | null) {
  await db.taskDayPlans.put({ taskId, day, durationSec })
}

export async function unplanTaskOnDay(taskId: string, day: Day): Promise<void> {
  await db.taskDayPlans.delete([taskId, day])
}

/**
 * Feuille « Prévoir des tâches » : ajoute les tâches cochées (durée `null`), retire les
 * tâches actives décochées. Une tâche archivée déjà prévue n'est jamais retirée ici.
 */
export async function setDayPlannedTasks(day: Day, taskIds: readonly string[]): Promise<void> {
  const wanted = new Set(taskIds)
  await db.transaction('rw', db.taskDayPlans, db.tasks, async () => {
    const current = await db.taskDayPlans.where('day').equals(day).toArray()
    const tasks = await db.tasks.bulkGet(current.map((p) => p.taskId))
    for (const [i, plan] of current.entries()) {
      if (!wanted.has(plan.taskId) && tasks[i]?.status === 'active') {
        await db.taskDayPlans.delete([plan.taskId, day])
      }
    }
    const planned = new Set(current.map((p) => p.taskId))
    for (const taskId of taskIds) {
      if (!planned.has(taskId)) await db.taskDayPlans.put({ taskId, day, durationSec: null })
    }
  })
}

export interface PlannedTask extends TaskContext {
  durationSec: DurationSec | null
  archived: boolean
}

/** Tâches prévues un jour, groupées par projet (R26), archivées et projets supprimés compris. */
export async function getDayPlan(day: Day): Promise<ProjectGroup<PlannedTask>[]> {
  const plans = await db.taskDayPlans.where('day').equals(day).toArray()
  const contexts = await taskContexts(plans.map((p) => p.taskId))
  const items = plans
    .filter((p) => contexts.has(p.taskId))
    .map((p) => {
      const ctx = contexts.get(p.taskId)!
      return { ...ctx, durationSec: p.durationSec, archived: ctx.task.status === 'archived' }
    })
    .sort(
      (a, b) =>
        a.project.createdAt - b.project.createdAt ||
        a.section.order - b.section.order ||
        a.task.createdAt - b.task.createdAt,
    )
  return groupByProject(items)
}

// ---------- Vues Semaine et Jour ----------

async function realByDayAndProject(days: readonly Day[], now: Timestamp) {
  const entries = await listRealEntries(days, now)
  const tasks = await db.tasks.bulkGet([...new Set(entries.map((e) => e.taskId))])
  const projectOf = new Map(tasks.filter((t) => !!t).map((t) => [t!.id, t!.projectId]))
  const byDay = new Map<Day, DurationSec>()
  const byProject = new Map<string, DurationSec>()
  for (const e of entries) {
    byDay.set(e.day, (byDay.get(e.day) ?? 0) + e.durationSec)
    const projectId = projectOf.get(e.taskId)
    if (projectId) byProject.set(projectId, (byProject.get(projectId) ?? 0) + e.durationSec)
  }
  return { byDay, byProject }
}

export interface WeekDayRow {
  day: Day
  budget: DurationSec | null
  real: DurationSec | null
  plannedTaskCount: number
  planned: DurationSec | null
  isToday: boolean
}

export interface WeekProjectRow {
  project: Project
  color: ProjectColor
  planned: DurationSec | null
  real: DurationSec | null
}

export interface WeekOverview {
  week: { budget: DurationSec | null; real: DurationSec | null }
  days: WeekDayRow[]
  projects: WeekProjectRow[]
  plannedTotal: DurationSec | null
  plannedOverBudget: boolean
}

/** Données de l'onglet Semaine. */
export async function getWeekOverview(weekStart: WeekStart, now: Timestamp): Promise<WeekOverview> {
  const days = weekDays(weekStart)
  const todayDay = toDay(now)
  const budget = await getWeekBudget(weekStart)
  const real = await realByDayAndProject(days, now)
  const plans = await db.taskDayPlans.where('day').anyOf(days).toArray()

  const dayRows = days.map((day, i) => {
    const own = plans.filter((p) => p.day === day)
    return {
      day,
      budget: budget.days[i].durationSec,
      real: real.byDay.get(day) ?? null,
      plannedTaskCount: own.length,
      planned: sumNullable(own.map((p) => p.durationSec)),
      isToday: day === todayDay,
    }
  })

  const projectPlans = await db.projectWeekPlans.where('weekStart').equals(weekStart).toArray()
  const projects = (await listProjects()).map(({ project, color }) => ({
    project,
    color,
    planned: projectPlans.find((p) => p.projectId === project.id)?.durationSec ?? null,
    real: real.byProject.get(project.id) ?? null,
  }))
  const plannedTotal = sumNullable(projects.map((p) => p.planned))

  return {
    week: { budget: budget.total, real: sumNullable(dayRows.map((d) => d.real)) },
    days: dayRows,
    projects,
    plannedTotal,
    plannedOverBudget: isPlannedOverBudget(plannedTotal, budget.total),
  }
}

export interface DayOverview {
  budget: DurationSec | null
  real: DurationSec | null
  planned: DurationSec | null
  plannedOverBudget: boolean
}

/** Données de la vue Jour. */
export async function getDayOverview(day: Day, now: Timestamp): Promise<DayOverview> {
  const budget = (await db.dailyBudgets.get(day))?.durationSec ?? null
  const entries = await listRealEntries([day], now)
  const plans = await db.taskDayPlans.where('day').equals(day).toArray()
  const planned = sumNullable(plans.map((p) => p.durationSec))
  return {
    budget,
    real: sumNullable(entries.map((e) => e.durationSec)),
    planned,
    plannedOverBudget: isPlannedOverBudget(planned, budget),
  }
}

// ---------- Vue Jour : fait et imprévues (lot 7) ----------

export interface DayTask extends TaskContext {
  /** Temps prévu (`null` = prévue sans durée, ou imprévue). */
  plannedSec: DurationSec | null
  /** Temps fait ce jour-là (chronos + ajouts manuels), `null` si rien. */
  realSec: DurationSec | null
  archived: boolean
}

export interface DayTasks {
  planned: ProjectGroup<DayTask>[]
  /** Tâches travaillées ce jour sans être prévues. Statut recalculé : prévue ensuite → passe dans `planned`. */
  unplanned: ProjectGroup<DayTask>[]
}

const byPosition = (a: DayTask, b: DayTask) =>
  a.project.createdAt - b.project.createdAt ||
  a.section.order - b.section.order ||
  a.task.createdAt - b.task.createdAt

export async function getDayTasks(day: Day, now: Timestamp): Promise<DayTasks> {
  const plans = await db.taskDayPlans.where('day').equals(day).toArray()
  const realByTask = new Map<string, DurationSec>()
  for (const e of await listRealEntries([day], now)) {
    realByTask.set(e.taskId, (realByTask.get(e.taskId) ?? 0) + e.durationSec)
  }
  const plannedIds = new Set(plans.map((p) => p.taskId))
  const unplannedIds = [...realByTask.keys()].filter((id) => !plannedIds.has(id))
  const contexts = await taskContexts([...plannedIds, ...unplannedIds])
  const line = (taskId: string, plannedSec: DurationSec | null): DayTask | null => {
    const ctx = contexts.get(taskId)
    if (!ctx) return null
    return {
      ...ctx,
      plannedSec,
      realSec: realByTask.get(taskId) ?? null,
      archived: ctx.task.status === 'archived',
    }
  }
  const planned = plans
    .map((p) => line(p.taskId, p.durationSec))
    .filter((x): x is DayTask => !!x)
    .sort(byPosition)
  const unplanned = unplannedIds
    .map((id) => line(id, null))
    .filter((x): x is DayTask => !!x)
    .sort(byPosition)
  return { planned: groupByProject(planned), unplanned: groupByProject(unplanned) }
}
