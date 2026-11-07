import { monotonicNow } from './clock'
import { toDay } from './dates'
import { db } from './db'
import { sumNullable } from './durations'
import { ValidationError } from './errors'
import { createTask, projectColorMap, type ProjectColor } from './projects'
import type {
  Day,
  DurationSec,
  ManualEntry,
  Project,
  Section,
  Session,
  SessionTask,
  Task,
  TimeSegment,
  Timestamp,
} from './types'

// Le temps est TOUJOURS calculé depuis les horodatages enregistrés en base :
// aucun compteur en mémoire (l'app peut être tuée ou l'écran verrouillé à tout moment).
// Note : IndexedDB n'indexe pas les `null`, d'où les `filter(... === null)`.

// ---------- Lectures de base ----------

export async function getCurrentSession(): Promise<Session | null> {
  return (await db.sessions.filter((s) => s.endedAt === null).first()) ?? null
}

export async function getRunningSegment(): Promise<TimeSegment | null> {
  return (await db.timeSegments.filter((s) => s.endedAt === null).first()) ?? null
}

/** Somme des segments en secondes entières ; un segment ouvert compte jusqu'à `now`. */
export function segmentsDuration(segments: readonly TimeSegment[], now: Timestamp): DurationSec {
  const ms = segments.reduce((t, s) => t + Math.max(0, (s.endedAt ?? now) - s.startedAt), 0)
  return Math.floor(ms / 1000)
}

/** `null` si la tâche n'a encore aucun temps dans la session (ni segment, ni correction). */
function taskDuration(
  st: SessionTask,
  segments: readonly TimeSegment[],
  now: Timestamp,
): DurationSec | null {
  if (st.correctedDurationSec !== null) return st.correctedDurationSec
  return segments.length > 0 ? segmentsDuration(segments, now) : null
}

async function segmentsOf(sessionId: string, taskId: string) {
  return db.timeSegments.where('[sessionId+taskId]').equals([sessionId, taskId]).toArray()
}

async function getOpenSession(sessionId: string): Promise<Session> {
  const session = await db.sessions.get(sessionId)
  if (!session) throw new ValidationError('notFound')
  if (session.endedAt !== null) throw new ValidationError('sessionEnded')
  return session
}

async function closeRunningSegment(now: Timestamp) {
  const open = await db.timeSegments.filter((s) => s.endedAt === null).toArray()
  for (const s of open) await db.timeSegments.update(s.id, { endedAt: now })
}

// ---------- Session ----------

/** Démarre une session rattachée au jour de démarrage (R18). Une seule à la fois (H4). */
export async function startSession(): Promise<Session> {
  return db.transaction('rw', db.sessions, async () => {
    if (await getCurrentSession()) throw new ValidationError('sessionInProgress')
    const now = Date.now()
    const session: Session = {
      id: crypto.randomUUID(),
      startedAt: now,
      endedAt: null,
      day: toDay(now),
    }
    await db.sessions.add(session)
    return session
  })
}

export async function endSession(sessionId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.timeSegments, async () => {
    await getOpenSession(sessionId)
    const now = Date.now()
    await closeRunningSegment(now)
    await db.sessions.update(sessionId, { endedAt: now })
  })
}

async function addSessionTask(sessionId: string, taskId: string) {
  if (await db.sessionTasks.get([sessionId, taskId])) return
  if (!(await db.tasks.get(taskId))) throw new ValidationError('notFound')
  const existing = await db.sessionTasks.where('sessionId').equals(sessionId).toArray()
  await db.sessionTasks.add({
    sessionId,
    taskId,
    order: existing.reduce((max, st) => Math.max(max, st.order), -1) + 1,
    correctedDurationSec: null,
  })
}

/** Ajoute une tâche à la session (sans effet si elle y est déjà). */
export async function addTaskToSession(sessionId: string, taskId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sessionTasks, db.tasks, async () => {
    await getOpenSession(sessionId)
    await addSessionTask(sessionId, taskId)
  })
}

/** Crée une tâche (section obligatoire) et l'ajoute à la session. */
export async function createTaskInSession(
  sessionId: string,
  sectionId: string,
  label: string,
): Promise<Task> {
  return db.transaction(
    'rw',
    [db.projects, db.sections, db.tasks, db.sessions, db.sessionTasks],
    async () => {
      await getOpenSession(sessionId)
      const task = await createTask(sectionId, label)
      await addSessionTask(sessionId, task.id)
      return task
    },
  )
}

/**
 * Feuille « Ajouter des tâches » : ajoute les tâches cochées ; une tâche décochée
 * n'est retirée que si elle n'a encore aucun temps dans la session.
 */
export async function setSessionTasks(
  sessionId: string,
  taskIds: readonly string[],
): Promise<void> {
  const wanted = new Set(taskIds)
  await db.transaction('rw', db.sessions, db.sessionTasks, db.tasks, db.timeSegments, async () => {
    await getOpenSession(sessionId)
    const current = await db.sessionTasks.where('sessionId').equals(sessionId).toArray()
    for (const st of current) {
      if (wanted.has(st.taskId)) continue
      const segments = await segmentsOf(sessionId, st.taskId)
      if (st.correctedDurationSec === null && segments.length === 0) {
        await db.sessionTasks.delete([sessionId, st.taskId])
      }
    }
    for (const taskId of taskIds) await addSessionTask(sessionId, taskId)
  })
}

// ---------- Chrono ----------

/** Lance le chrono d'une tâche ; met en pause celui qui tournait (R16). */
export async function startTask(sessionId: string, taskId: string): Promise<void> {
  await db.transaction('rw', db.sessions, db.sessionTasks, db.tasks, db.timeSegments, async () => {
    await getOpenSession(sessionId)
    const running = await getRunningSegment()
    if (running?.sessionId === sessionId && running.taskId === taskId) return
    const now = Date.now()
    await closeRunningSegment(now)
    await addSessionTask(sessionId, taskId)
    await db.timeSegments.add({
      id: crypto.randomUUID(),
      sessionId,
      taskId,
      startedAt: now,
      endedAt: null,
    })
  })
}

/** Met en pause le chrono en cours (s'il y en a un). */
export async function pauseTask(): Promise<void> {
  await db.transaction('rw', db.timeSegments, () => closeRunningSegment(Date.now()))
}

/** Temps de la tâche dans la session : correction si elle existe, sinon somme des segments. */
export async function getSessionTaskDuration(
  sessionId: string,
  taskId: string,
  now: Timestamp = Date.now(),
): Promise<DurationSec> {
  const st = await db.sessionTasks.get([sessionId, taskId])
  if (!st) throw new ValidationError('notFound')
  return taskDuration(st, await segmentsOf(sessionId, taskId), now) ?? 0
}

/** Corrige la durée d'une tâche dans une session ; `null` annule la correction (R19). */
export async function correctSessionTaskDuration(
  sessionId: string,
  taskId: string,
  durationSec: DurationSec | null,
): Promise<void> {
  if (durationSec !== null && (!Number.isInteger(durationSec) || durationSec < 0)) {
    throw new ValidationError('durationInvalid')
  }
  await db.transaction('rw', db.sessionTasks, db.timeSegments, async () => {
    const st = await db.sessionTasks.get([sessionId, taskId])
    if (!st) throw new ValidationError('notFound')
    const running = await getRunningSegment()
    if (running?.sessionId === sessionId && running.taskId === taskId) {
      throw new ValidationError('taskRunning')
    }
    await db.sessionTasks.update([sessionId, taskId], { correctedDurationSec: durationSec })
  })
}

// ---------- Ajouts manuels ----------

function checkManualDuration(durationSec: DurationSec) {
  if (!Number.isInteger(durationSec) || durationSec <= 0)
    throw new ValidationError('durationInvalid')
}

export async function addManualEntry(
  taskId: string,
  day: Day,
  durationSec: DurationSec,
): Promise<ManualEntry> {
  checkManualDuration(durationSec)
  if (!(await db.tasks.get(taskId))) throw new ValidationError('notFound')
  const entry: ManualEntry = {
    id: crypto.randomUUID(),
    taskId,
    day,
    durationSec,
    createdAt: monotonicNow(),
  }
  await db.manualEntries.add(entry)
  return entry
}

export async function updateManualEntry(
  id: string,
  patch: Partial<Pick<ManualEntry, 'taskId' | 'day' | 'durationSec'>>,
): Promise<void> {
  if (patch.durationSec !== undefined) checkManualDuration(patch.durationSec)
  if (!(await db.manualEntries.get(id))) throw new ValidationError('notFound')
  await db.manualEntries.update(id, patch)
}

export async function deleteManualEntry(id: string): Promise<void> {
  await db.manualEntries.delete(id)
}

// ---------- Temps réel ----------

export interface RealEntry {
  taskId: string
  day: Day
  durationSec: DurationSec
}

/**
 * Toutes les entrées de temps réel des jours donnés : temps des tâches de session
 * (rattaché au jour de démarrage) + ajouts manuels. Tâches archivées et projets
 * supprimés compris (R21). Une session en cours compte jusqu'à `now`.
 */
export async function listRealEntries(days: readonly Day[], now: Timestamp): Promise<RealEntry[]> {
  const sessions = await db.sessions
    .where('day')
    .anyOf([...days])
    .toArray()
  const sessionDay = new Map(sessions.map((s) => [s.id, s.day]))
  const ids = [...sessionDay.keys()]
  const sessionTasks = await db.sessionTasks.where('sessionId').anyOf(ids).toArray()
  const segments = await db.timeSegments.filter((s) => sessionDay.has(s.sessionId)).toArray()

  const entries: RealEntry[] = []
  for (const st of sessionTasks) {
    const own = segments.filter((s) => s.sessionId === st.sessionId && s.taskId === st.taskId)
    const durationSec = taskDuration(st, own, now)
    if (durationSec !== null) {
      entries.push({ taskId: st.taskId, day: sessionDay.get(st.sessionId)!, durationSec })
    }
  }
  const manual = await db.manualEntries
    .where('day')
    .anyOf([...days])
    .toArray()
  for (const m of manual) entries.push({ taskId: m.taskId, day: m.day, durationSec: m.durationSec })
  return entries
}

/** Temps réel en secondes, ou `null` si aucune donnée. */
export async function getRealTime(
  query: { days: readonly Day[]; taskIds?: readonly string[]; projectId?: string },
  now: Timestamp = Date.now(),
): Promise<DurationSec | null> {
  let entries = await listRealEntries(query.days, now)
  if (query.taskIds) {
    const ids = new Set(query.taskIds)
    entries = entries.filter((e) => ids.has(e.taskId))
  }
  if (query.projectId) {
    const ids = new Set(
      (await db.tasks.where('projectId').equals(query.projectId).primaryKeys()) as string[],
    )
    entries = entries.filter((e) => ids.has(e.taskId))
  }
  return sumNullable(entries.map((e) => e.durationSec))
}

/** Temps réel par tâche sur les jours donnés (tâches sans donnée absentes). */
export async function getRealTimeByTask(
  days: readonly Day[],
  now: Timestamp = Date.now(),
): Promise<Map<string, DurationSec>> {
  const byTask = new Map<string, DurationSec>()
  for (const e of await listRealEntries(days, now)) {
    byTask.set(e.taskId, (byTask.get(e.taskId) ?? 0) + e.durationSec)
  }
  return byTask
}

// ---------- Vues ----------

export interface TaskContext {
  task: Task
  section: Section
  project: Project
  color: ProjectColor
}

export async function taskContexts(taskIds: readonly string[]): Promise<Map<string, TaskContext>> {
  const tasks = (await db.tasks.bulkGet([...taskIds])).filter((t): t is Task => !!t)
  const sections = new Map((await db.sections.toArray()).map((s) => [s.id, s]))
  const projects = await db.projects.toArray()
  const colors = projectColorMap(projects)
  const byId = new Map(projects.map((p) => [p.id, p]))
  return new Map(
    tasks.map((task) => [
      task.id,
      {
        task,
        section: sections.get(task.sectionId)!,
        project: byId.get(task.projectId)!,
        color: colors.get(task.projectId)!,
      },
    ]),
  )
}

export interface SessionTaskLine extends TaskContext {
  /** Durée dans la session (0 si jamais lancée). */
  durationSec: DurationSec
  corrected: boolean
  running: boolean
}

async function sessionLines(session: Session, now: Timestamp): Promise<SessionTaskLine[]> {
  const sts = (await db.sessionTasks.where('sessionId').equals(session.id).toArray()).sort(
    (a, b) => a.order - b.order,
  )
  const segments = await db.timeSegments.filter((s) => s.sessionId === session.id).toArray()
  const contexts = await taskContexts(sts.map((st) => st.taskId))
  return sts
    .filter((st) => contexts.has(st.taskId))
    .map((st) => {
      const own = segments.filter((s) => s.taskId === st.taskId)
      return {
        ...contexts.get(st.taskId)!,
        durationSec: taskDuration(st, own, now) ?? 0,
        corrected: st.correctedDurationSec !== null,
        running: own.some((s) => s.endedAt === null),
      }
    })
}

export interface ProjectGroup<T> {
  project: Project
  color: ProjectColor
  items: T[]
}

/** Regroupe par projet, dans l'ordre de première apparition (R26). */
export function groupByProject<T extends { project: Project; color: ProjectColor }>(
  items: readonly T[],
): ProjectGroup<T>[] {
  const groups = new Map<string, ProjectGroup<T>>()
  for (const item of items) {
    if (!groups.has(item.project.id)) {
      groups.set(item.project.id, { project: item.project, color: item.color, items: [] })
    }
    groups.get(item.project.id)!.items.push(item)
  }
  return [...groups.values()]
}

export interface SessionView {
  session: Session
  totalSec: DurationSec
  taskCount: number
  groups: ProjectGroup<SessionTaskLine>[]
}

/** Écran de la session en cours : tâches groupées par projet. */
export async function getSessionView(
  sessionId: string,
  now: Timestamp = Date.now(),
): Promise<SessionView | null> {
  const session = await db.sessions.get(sessionId)
  if (!session) return null
  const lines = await sessionLines(session, now)
  return {
    session,
    totalSec: lines.reduce((t, l) => t + l.durationSec, 0),
    taskCount: lines.length,
    groups: groupByProject(lines),
  }
}

export interface SessionSummary {
  session: Session
  /** `null` si aucune tâche n'a de temps. */
  totalSec: DurationSec | null
  tasks: SessionTaskLine[]
}

async function summarize(session: Session, now: Timestamp): Promise<SessionSummary> {
  const sts = await db.sessionTasks.where('sessionId').equals(session.id).toArray()
  const segments = await db.timeSegments.filter((s) => s.sessionId === session.id).toArray()
  const totalSec = sumNullable(
    sts.map((st) =>
      taskDuration(
        st,
        segments.filter((s) => s.taskId === st.taskId),
        now,
      ),
    ),
  )
  return { session, totalSec, tasks: await sessionLines(session, now) }
}

/** Sessions (terminées ou en cours) dont le jour est dans l'intervalle, plus récentes d'abord. */
export async function listSessions(
  range: { from?: Day; to?: Day } = {},
  now: Timestamp = Date.now(),
): Promise<SessionSummary[]> {
  const sessions = (await db.sessions.toArray())
    .filter((s) => (!range.from || s.day >= range.from) && (!range.to || s.day <= range.to))
    .sort((a, b) => b.startedAt - a.startedAt)
  return Promise.all(sessions.map((s) => summarize(s, now)))
}

export type HistoryItem =
  | { kind: 'session'; day: Day; summary: SessionSummary }
  | { kind: 'manual'; day: Day; entry: ManualEntry; context: TaskContext }

export interface History {
  current: SessionSummary | null
  items: HistoryItem[]
}

/** Historique : session en cours à part, puis sessions terminées et ajouts manuels, du plus récent au plus ancien. */
export async function listHistory(now: Timestamp = Date.now()): Promise<History> {
  const sessions = await db.sessions.toArray()
  const current = sessions.find((s) => s.endedAt === null)
  const ended = await Promise.all(
    sessions.filter((s) => s.endedAt !== null).map((s) => summarize(s, now)),
  )
  const manual = await db.manualEntries.toArray()
  const contexts = await taskContexts(manual.map((m) => m.taskId))

  const rows: { item: HistoryItem; at: Timestamp }[] = [
    ...ended.map((summary) => ({
      item: { kind: 'session' as const, day: summary.session.day, summary },
      at: summary.session.startedAt,
    })),
    ...manual
      .filter((m) => contexts.has(m.taskId))
      .map((entry) => ({
        item: {
          kind: 'manual' as const,
          day: entry.day,
          entry,
          context: contexts.get(entry.taskId)!,
        },
        at: entry.createdAt,
      })),
  ]
  rows.sort((a, b) => (a.item.day === b.item.day ? b.at - a.at : a.item.day < b.item.day ? 1 : -1))
  return {
    current: current ? await summarize(current, now) : null,
    items: rows.map((r) => r.item),
  }
}

// ---------- Bandeau de chrono (4.4) ----------

export interface BannerState {
  sessionId: string
  /** Chrono en cours, ou `null` si la session est en pause. */
  running: { taskId: string; label: string; durationSec: DurationSec } | null
  /** Tâche à relancer avec « Reprendre » : la dernière chronométrée, sinon la première de la session. */
  resumeTaskId: string | null
}

export async function getBannerState(now: Timestamp = Date.now()): Promise<BannerState | null> {
  const session = await getCurrentSession()
  if (!session) return null
  const segments = await db.timeSegments.filter((s) => s.sessionId === session.id).toArray()
  const open = segments.find((s) => s.endedAt === null)
  let running: BannerState['running'] = null
  if (open) {
    const task = await db.tasks.get(open.taskId)
    running = {
      taskId: open.taskId,
      label: task?.label ?? '',
      durationSec: await getSessionTaskDuration(session.id, open.taskId, now),
    }
  }
  const last = segments.sort((a, b) => b.startedAt - a.startedAt)[0]
  const first = (await db.sessionTasks.where('sessionId').equals(session.id).sortBy('order'))[0]
  return { sessionId: session.id, running, resumeTaskId: last?.taskId ?? first?.taskId ?? null }
}

// ---------- Ajouts manuels récents (4.6) ----------

/** Derniers ajouts manuels, du plus récent au plus ancien (ordre de saisie). */
export async function listManualEntries(
  limit = 20,
): Promise<{ entry: ManualEntry; context: TaskContext }[]> {
  const entries = (await db.manualEntries.toArray())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
  const contexts = await taskContexts(entries.map((e) => e.taskId))
  return entries
    .filter((e) => contexts.has(e.taskId))
    .map((entry) => ({ entry, context: contexts.get(entry.taskId)! }))
}

/** Entrées de temps réel de tâches données, sur toute la durée (bilan d'un projet, 6.3). */
export async function listRealEntriesForTasks(
  taskIds: readonly string[],
  now: Timestamp,
): Promise<RealEntry[]> {
  const sessionTasks = await db.sessionTasks
    .where('taskId')
    .anyOf([...taskIds])
    .toArray()
  const sessions = new Map(
    (await db.sessions.bulkGet([...new Set(sessionTasks.map((st) => st.sessionId))]))
      .filter((s): s is Session => !!s)
      .map((s) => [s.id, s]),
  )
  const segments = await db.timeSegments
    .where('[sessionId+taskId]')
    .anyOf(sessionTasks.map((st) => [st.sessionId, st.taskId]))
    .toArray()
  const entries: RealEntry[] = []
  for (const st of sessionTasks) {
    const session = sessions.get(st.sessionId)
    if (!session) continue
    const own = segments.filter((s) => s.sessionId === st.sessionId && s.taskId === st.taskId)
    const durationSec = taskDuration(st, own, now)
    if (durationSec !== null) entries.push({ taskId: st.taskId, day: session.day, durationSec })
  }
  const manual = await db.manualEntries
    .where('taskId')
    .anyOf([...taskIds])
    .toArray()
  for (const m of manual) entries.push({ taskId: m.taskId, day: m.day, durationSec: m.durationSec })
  return entries
}
