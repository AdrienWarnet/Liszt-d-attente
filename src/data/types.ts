/** Jour en heure locale, au format `YYYY-MM-DD`. */
export type Day = string
/** Lundi d'une semaine, au format `YYYY-MM-DD`. */
export type WeekStart = string
/** Horodatage en millisecondes (epoch). */
export type Timestamp = number
/** Durée en secondes entières. */
export type DurationSec = number

export interface Project {
  id: string
  name: string
  startDate: Day | null
  endDate: Day | null
  /** Suppression logique : le temps passé reste compté. */
  deletedAt: Timestamp | null
  createdAt: Timestamp
}

export interface Section {
  id: string
  projectId: string
  name: string
  progress: string | null
  order: number
  createdAt: Timestamp
}

export type TaskStatus = 'active' | 'archived'

export interface Task {
  id: string
  sectionId: string
  /** Dénormalisé depuis la section. */
  projectId: string
  label: string
  status: TaskStatus
  archivedAt: Timestamp | null
  createdAt: Timestamp
}

export interface Session {
  id: string
  startedAt: Timestamp
  endedAt: Timestamp | null
  /** Jour de démarrage, même si la session dépasse minuit. */
  day: Day
}

export interface SessionTask {
  sessionId: string
  taskId: string
  order: number
  /** Si non `null`, remplace la somme des segments. */
  correctedDurationSec: DurationSec | null
}

export interface TimeSegment {
  id: string
  sessionId: string
  taskId: string
  startedAt: Timestamp
  endedAt: Timestamp | null
}

export interface ManualEntry {
  id: string
  taskId: string
  day: Day
  durationSec: DurationSec
  createdAt: Timestamp
}

export interface DailyBudget {
  day: Day
  durationSec: DurationSec | null
}

export interface ProjectWeekPlan {
  projectId: string
  weekStart: WeekStart
  durationSec: DurationSec | null
}

/** La ligne existe = tâche marquée « prévue » ce jour-là. */
export interface TaskDayPlan {
  taskId: string
  day: Day
  durationSec: DurationSec | null
}

export type PlacementKind = 'initial' | 'revised'

export interface SectionPlacement {
  id: string
  sectionId: string
  weekStart: WeekStart
  kind: PlacementKind
}

export interface Meta {
  key: string
  value: unknown
}
