import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import {
  listActiveTasksGrouped,
  listProjects,
  listSectionsWithTasks,
  projectColorMap,
} from './projects'
import {
  getBannerState,
  getCurrentSession,
  getRealTimeByTask,
  getRunningSegment,
  getSessionView,
  listHistory,
  listManualEntries,
} from './sessions'
import { getProjectPlanning } from './planning'
import { getWeeklyReport } from './report'
import type { Day, Timestamp, WeekStart } from './types'
import { getDayOverview, getDayPlan, getWeekOverview } from './week'

// Hooks de lecture : se mettent à jour seuls quand la base change.
// `undefined` = chargement en cours.

export function useProjects() {
  return useLiveQuery(listProjects)
}

export function useProject(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return null
    const all = await db.projects.toArray()
    const project = all.find((p) => p.id === id)
    if (!project) return null
    return { project, color: projectColorMap(all).get(id)! }
  }, [id])
}

export function useSectionsWithTasks(projectId: string | undefined) {
  return useLiveQuery(async () => (projectId ? listSectionsWithTasks(projectId) : []), [projectId])
}

export function useActiveTasksGrouped() {
  return useLiveQuery(listActiveTasksGrouped)
}

// ---------- Sessions et temps réel (4.1) ----------
// `now` change chaque seconde quand un chrono tourne : la requête est relancée.

export function useCurrentSession() {
  return useLiveQuery(getCurrentSession)
}

export function useRunningSegment() {
  return useLiveQuery(getRunningSegment)
}

export function useSessionView(sessionId: string | undefined, now: Timestamp) {
  return useLiveQuery(
    async () => (sessionId ? getSessionView(sessionId, now) : null),
    [sessionId, now],
  )
}

export function useHistory(now: Timestamp) {
  return useLiveQuery(() => listHistory(now), [now])
}

export function useRealTimeByTask(days: readonly Day[], now: Timestamp) {
  return useLiveQuery(() => getRealTimeByTask(days, now), [days.join(','), now])
}

// ---------- Semaine et temps prévu (3.1) ----------

export function useWeekOverview(weekStart: WeekStart, now: Timestamp) {
  return useLiveQuery(() => getWeekOverview(weekStart, now), [weekStart, now])
}

export function useDayOverview(day: Day, now: Timestamp) {
  return useLiveQuery(() => getDayOverview(day, now), [day, now])
}

export function useDayPlan(day: Day) {
  return useLiveQuery(() => getDayPlan(day), [day])
}

export function useBannerState(now: Timestamp) {
  return useLiveQuery(() => getBannerState(now), [now])
}

export function useManualEntries() {
  return useLiveQuery(() => listManualEntries())
}

// ---------- Planning (5.1) ----------

export function useProjectPlanning(projectId: string | undefined, now: Timestamp) {
  return useLiveQuery(
    async () => (projectId ? getProjectPlanning(projectId, now) : null),
    [projectId, now],
  )
}

// ---------- Bilan (6.2, 6.3) ----------

export function useWeeklyReport(weekStart: WeekStart, now: Timestamp) {
  return useLiveQuery(() => getWeeklyReport(weekStart, now), [weekStart, now])
}
