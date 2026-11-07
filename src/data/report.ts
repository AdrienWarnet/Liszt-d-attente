import { formatDayLabel, formatDayShort, toDay, weekDays } from './dates'
import { db } from './db'
import { sumNullable } from './durations'
import { getWeekPlanningAllProjects, type WeekPlanningGroup } from './planning'
import { projectColorMap, type ProjectColor } from './projects'
import { getCurrentSession, listRealEntries } from './sessions'
import type { Day, DurationSec, Project, Section, Task, Timestamp, WeekStart } from './types'
import { getWeekBudget } from './week'

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
