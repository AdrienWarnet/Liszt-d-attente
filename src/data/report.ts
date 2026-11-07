import {
  addDays,
  addWeeks,
  formatDayLabel,
  formatDayMonth,
  formatDayShort,
  formatWeekLabel,
  formatWeekShort,
  parseDay,
  toDay,
  weekDays,
  weekStart as weekStartOf,
} from './dates'
import { db } from './db'
import { sumNullable } from './durations'
import { getWeekPlanningAllProjects, type WeekPlanningGroup } from './planning'
import { projectColorMap, type ProjectColor } from './projects'
import { getCurrentSession, listRealEntries, listRealEntriesForTasks } from './sessions'
import type { Day, DurationSec, Project, Section, Task, Timestamp, WeekStart } from './types'
import { getWeekBudget } from './week'
import { labels } from '../labels'

// Bilan : tableau de bord calculé à la volée (R23, R25). Les écrans ne font qu'afficher.

const pct = (part: number | null, whole: number | null): number | null =>
  part === null || whole === null || whole === 0 ? null : Math.round((part / whole) * 100)

const diff = (a: DurationSec | null, b: DurationSec | null) =>
  a === null || b === null ? null : a - b

/** Indice sélectionné par défaut : le repère (aujourd'hui, semaine courante), sinon la dernière colonne avec données. */
export function defaultSelection(
  cols: readonly { highlight: boolean; hasData: boolean }[],
): number {
  const marked = cols.findIndex((c) => c.highlight)
  if (marked >= 0) return marked
  for (let i = cols.length - 1; i > 0; i--) if (cols[i].hasData) return i
  return 0
}

// ---------- Bilan hebdo (6.2) ----------

export interface ReportDay {
  day: Day
  shortLabel: string
  fullLabel: string
  real: DurationSec | null
  budget: DurationSec | null
  /** Réel − budget, `null` si l'un manque. */
  gap: DurationSec | null
  isToday: boolean
}

export interface ReportTask {
  task: Task
  section: Section
  planned: DurationSec | null
  real: DurationSec | null
  archived: boolean
}

export interface ReportSection {
  section: Section
  real: DurationSec | null
  /** Part du réel du projet, en %. */
  sharePct: number | null
  tasks: ReportTask[]
}

export interface ReportProject {
  project: Project
  color: ProjectColor
  deleted: boolean
  planned: DurationSec | null
  real: DurationSec | null
  /** Part du réel de la semaine, en %. */
  sharePct: number | null
  /** Réel / prévu du projet, en % ; `null` sans prévu. */
  plannedPct: number | null
  /** Réel − prévu. */
  gap: DurationSec | null
  sections: ReportSection[]
  taskCount: number
}

export interface WeeklyReport {
  isEmpty: boolean
  /** Une session en cours compte dans cette semaine. */
  live: boolean
  week: {
    real: DurationSec | null
    budget: DurationSec | null
    plannedProjects: DurationSec | null
    gap: DurationSec | null
  }
  days: ReportDay[]
  defaultSelectedDay: number
  projects: ReportProject[]
  planning: WeekPlanningGroup[]
}

export async function getWeeklyReport(weekStart: WeekStart, now: Timestamp): Promise<WeeklyReport> {
  const days = weekDays(weekStart)
  const todayDay = toDay(now)
  const budget = await getWeekBudget(weekStart)
  const entries = await listRealEntries(days, now)
  const taskPlans = await db.taskDayPlans.where('day').anyOf(days).toArray()
  const projectPlans = await db.projectWeekPlans.where('weekStart').equals(weekStart).toArray()

  // Réel par jour et par tâche.
  const realByDay = new Map<Day, DurationSec>()
  const realByTask = new Map<string, DurationSec>()
  for (const e of entries) {
    realByDay.set(e.day, (realByDay.get(e.day) ?? 0) + e.durationSec)
    realByTask.set(e.taskId, (realByTask.get(e.taskId) ?? 0) + e.durationSec)
  }
  const plannedByTask = new Map<string, DurationSec | null>()
  for (const p of taskPlans) {
    plannedByTask.set(p.taskId, sumNullable([plannedByTask.get(p.taskId) ?? null, p.durationSec]))
  }

  const reportDays: ReportDay[] = days.map((day, i) => {
    const real = realByDay.get(day) ?? null
    const b = budget.days[i].durationSec
    return {
      day,
      shortLabel: formatDayShort(day).replace('.', ''),
      fullLabel: formatDayLabel(day),
      real,
      budget: b,
      gap: diff(real, b),
      isToday: day === todayDay,
    }
  })
  const weekReal = sumNullable(reportDays.map((d) => d.real))

  // Tâches concernées : du réel ou du prévu cette semaine (archivées, projets supprimés compris).
  const taskIds = [...new Set([...realByTask.keys(), ...plannedByTask.keys()])]
  const tasks = (await db.tasks.bulkGet(taskIds)).filter((t): t is Task => !!t)
  const sections = new Map((await db.sections.toArray()).map((s) => [s.id, s]))
  const allProjects = await db.projects.toArray()
  const colors = projectColorMap(allProjects)

  const projects = allProjects
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    .map((project): ReportProject | null => {
      const ownTasks = tasks
        .filter((t) => t.projectId === project.id)
        .sort((a, b) => a.createdAt - b.createdAt)
      const ownSections = [...new Set(ownTasks.map((t) => t.sectionId))]
        .map((id) => sections.get(id))
        .filter((s): s is Section => !!s)
        .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
      const planned = projectPlans.find((p) => p.projectId === project.id)?.durationSec ?? null
      if (ownSections.length === 0 && planned === null) return null

      const reportSections = ownSections.map((section): ReportSection => {
        const sectionTasks: ReportTask[] = ownTasks
          .filter((t) => t.sectionId === section.id)
          .map((task) => ({
            task,
            section,
            planned: plannedByTask.get(task.id) ?? null,
            real: realByTask.get(task.id) ?? null,
            archived: task.status === 'archived',
          }))
        return {
          section,
          real: sumNullable(sectionTasks.map((t) => t.real)),
          sharePct: null,
          tasks: sectionTasks,
        }
      })
      const real = sumNullable(reportSections.map((s) => s.real))
      for (const s of reportSections) s.sharePct = pct(s.real, real)
      return {
        project,
        color: colors.get(project.id)!,
        deleted: project.deletedAt !== null,
        planned,
        real,
        sharePct: pct(real, weekReal),
        plannedPct: pct(real ?? 0, planned),
        gap: diff(real, planned),
        sections: reportSections,
        taskCount: reportSections.reduce((n, s) => n + s.tasks.length, 0),
      }
    })
    .filter((p): p is ReportProject => p !== null)

  const current = await getCurrentSession()
  return {
    isEmpty: weekReal === null && budget.total === null && projects.length === 0,
    live: !!current && days.includes(current.day),
    week: {
      real: weekReal,
      budget: budget.total,
      plannedProjects: sumNullable(projects.map((p) => p.planned)),
      gap: diff(weekReal, budget.total),
    },
    days: reportDays,
    defaultSelectedDay: defaultSelection(
      reportDays.map((d) => ({
        highlight: d.isToday,
        hasData: d.real !== null || d.budget !== null,
      })),
    ),
    projects,
    planning: await getWeekPlanningAllProjects(weekStart),
  }
}

// ---------- Bilan d'un projet (6.3) ----------

/**
 * Semaines en texte : « non placé », « sem. du 9 nov. », plage contiguë « 9 → 22 nov. »
 * (« 26 oct. → 8 nov. » sur deux mois), sinon liste « 9 nov, 23 nov ».
 */
export function formatWeekRange(weeks: readonly WeekStart[]): string {
  const sorted = [...new Set(weeks)].sort()
  if (sorted.length === 0) return labels.weekRange.none
  if (sorted.length === 1) return labels.weekRange.single(formatDayMonth(sorted[0]))
  const contiguous = sorted.every((w, i) => i === 0 || addWeeks(sorted[i - 1], 1) === w)
  if (!contiguous) return sorted.map(formatWeekShort).join(', ')
  const start = parseDay(sorted[0])
  const endDay = addDays(sorted[sorted.length - 1], 6)
  const end = parseDay(endDay)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  return `${sameMonth ? start.getDate() : formatDayMonth(sorted[0])} → ${formatDayMonth(endDay)}`
}

export interface ProjectReportWeek {
  weekStart: WeekStart
  shortLabel: string
  fullLabel: string
  planned: DurationSec | null
  real: DurationSec | null
  gap: DurationSec | null
  isCurrent: boolean
}

export interface ProjectReportSection {
  section: Section
  real: DurationSec | null
  initialRange: string
  revisedRange: string
  progress: string | null
  tasks: { task: Task; real: DurationSec | null; archived: boolean }[]
}

export interface ProjectReport {
  project: Project
  color: ProjectColor
  realTotal: DurationSec | null
  weeksWorked: number
  activeTaskCount: number
  weeks: ProjectReportWeek[]
  defaultSelectedWeek: number
  sections: ProjectReportSection[]
}

/**
 * Bilan d'un projet sur toute sa durée (R24). Semaines : de la plus ancienne parmi date de
 * début, placements, prévu et réel, jusqu'à la semaine suivant la semaine courante.
 */
export async function getProjectReport(
  projectId: string,
  now: Timestamp,
): Promise<ProjectReport | null> {
  const project = await db.projects.get(projectId)
  if (!project) return null
  const colors = projectColorMap(await db.projects.toArray())
  const sections = (await db.sections.where('projectId').equals(projectId).toArray()).sort(
    (a, b) => a.order - b.order || a.createdAt - b.createdAt,
  )
  const tasks = (await db.tasks.where('projectId').equals(projectId).toArray()).sort(
    (a, b) => a.createdAt - b.createdAt,
  )
  const entries = await listRealEntriesForTasks(
    tasks.map((t) => t.id),
    now,
  )
  const plans = await db.projectWeekPlans.filter((p) => p.projectId === projectId).toArray()
  const placements = await db.sectionPlacements
    .where('sectionId')
    .anyOf(sections.map((s) => s.id))
    .toArray()

  const realByTask = new Map<string, DurationSec>()
  const realByWeek = new Map<WeekStart, DurationSec>()
  for (const e of entries) {
    realByTask.set(e.taskId, (realByTask.get(e.taskId) ?? 0) + e.durationSec)
    const w = weekStartOf(e.day)
    realByWeek.set(w, (realByWeek.get(w) ?? 0) + e.durationSec)
  }

  const currentWeek = weekStartOf(toDay(now))
  const lastWeek = addWeeks(currentWeek, 1)
  const first = [
    currentWeek,
    ...(project.startDate ? [weekStartOf(project.startDate)] : []),
    ...placements.map((p) => p.weekStart),
    ...plans.map((p) => p.weekStart),
    ...realByWeek.keys(),
  ].sort()[0]
  const weeks: ProjectReportWeek[] = []
  for (let w = first; w <= lastWeek; w = addWeeks(w, 1)) {
    const planned = plans.find((p) => p.weekStart === w)?.durationSec ?? null
    const real = realByWeek.get(w) ?? null
    weeks.push({
      weekStart: w,
      shortLabel: formatWeekShort(w),
      fullLabel: formatWeekLabel(w),
      planned,
      real,
      gap: diff(real, planned),
      isCurrent: w === currentWeek,
    })
  }

  return {
    project,
    color: colors.get(projectId)!,
    realTotal: sumNullable(entries.map((e) => e.durationSec)),
    weeksWorked: realByWeek.size,
    activeTaskCount: tasks.filter((t) => t.status === 'active').length,
    weeks,
    defaultSelectedWeek: defaultSelection(
      weeks.map((w) => ({
        highlight: w.isCurrent,
        hasData: w.real !== null || w.planned !== null,
      })),
    ),
    sections: sections.map((section) => {
      const own = placements.filter((p) => p.sectionId === section.id)
      const sectionTasks = tasks
        .filter((t) => t.sectionId === section.id)
        .map((task) => ({
          task,
          real: realByTask.get(task.id) ?? null,
          archived: task.status === 'archived',
        }))
      return {
        section,
        real: sumNullable(sectionTasks.map((t) => t.real)),
        initialRange: formatWeekRange(
          own.filter((p) => p.kind === 'initial').map((p) => p.weekStart),
        ),
        revisedRange: formatWeekRange(
          own.filter((p) => p.kind === 'revised').map((p) => p.weekStart),
        ),
        progress: section.progress,
        tasks: sectionTasks,
      }
    }),
  }
}
