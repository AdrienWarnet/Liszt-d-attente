import { Dexie, type EntityTable, type Table } from 'dexie'
import type {
  DailyBudget,
  ManualEntry,
  Meta,
  Project,
  ProjectWeekPlan,
  Section,
  SectionPlacement,
  Session,
  SessionTask,
  Task,
  TaskDayPlan,
  TimeSegment,
} from './types'

export const DB_NAME = 'piano'

export class PianoDB extends Dexie {
  projects!: EntityTable<Project, 'id'>
  sections!: EntityTable<Section, 'id'>
  tasks!: EntityTable<Task, 'id'>
  sessions!: EntityTable<Session, 'id'>
  sessionTasks!: Table<SessionTask, [string, string]>
  timeSegments!: EntityTable<TimeSegment, 'id'>
  manualEntries!: EntityTable<ManualEntry, 'id'>
  dailyBudgets!: EntityTable<DailyBudget, 'day'>
  projectWeekPlans!: Table<ProjectWeekPlan, [string, string]>
  taskDayPlans!: Table<TaskDayPlan, [string, string]>
  sectionPlacements!: EntityTable<SectionPlacement, 'id'>
  meta!: EntityTable<Meta, 'key'>

  constructor(name: string = DB_NAME) {
    super(name)
    this.version(1).stores({
      projects: 'id, deletedAt',
      sections: 'id, projectId',
      tasks: 'id, sectionId, projectId, status',
      sessions: 'id, day, endedAt',
      sessionTasks: '[sessionId+taskId], sessionId, taskId',
      timeSegments: 'id, [sessionId+taskId], endedAt',
      manualEntries: 'id, taskId, day',
      dailyBudgets: 'day',
      projectWeekPlans: '[projectId+weekStart], weekStart',
      taskDayPlans: '[taskId+day], day',
      sectionPlacements: 'id, sectionId, [sectionId+kind]',
      meta: 'key',
    })
  }
}

export const db = new PianoDB()
