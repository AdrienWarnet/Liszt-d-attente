import { afterEach, describe, expect, it } from 'vitest'
import { PianoDB } from './db'
import type { Project } from './types'

let testDb: PianoDB

afterEach(async () => {
  await testDb?.delete()
})

describe('PianoDB (fake-indexeddb)', () => {
  it('s’ouvre en version 1 avec toutes les tables', async () => {
    testDb = new PianoDB('piano-test-open')
    await testDb.open()
    expect(testDb.verno).toBe(1)
    expect(testDb.tables.map((t) => t.name).sort()).toEqual(
      [
        'dailyBudgets',
        'manualEntries',
        'meta',
        'projectWeekPlans',
        'projects',
        'sectionPlacements',
        'sections',
        'sessionTasks',
        'sessions',
        'taskDayPlans',
        'tasks',
        'timeSegments',
      ].sort(),
    )
  })

  it('reproduit les clés et index du modèle de données', async () => {
    testDb = new PianoDB('piano-test-schema')
    await testDb.open()
    const schema = Object.fromEntries(
      testDb.tables.map((t) => [
        t.name,
        [t.schema.primKey.keyPath, ...t.schema.indexes.map((i) => i.keyPath)],
      ]),
    )
    expect(schema).toEqual({
      projects: ['id', 'deletedAt'],
      sections: ['id', 'projectId'],
      tasks: ['id', 'sectionId', 'projectId', 'status'],
      sessions: ['id', 'day', 'endedAt'],
      sessionTasks: [['sessionId', 'taskId'], 'sessionId', 'taskId'],
      timeSegments: ['id', ['sessionId', 'taskId'], 'endedAt'],
      manualEntries: ['id', 'taskId', 'day'],
      dailyBudgets: ['day'],
      projectWeekPlans: [['projectId', 'weekStart'], 'weekStart'],
      taskDayPlans: [['taskId', 'day'], 'day'],
      sectionPlacements: ['id', 'sectionId', ['sectionId', 'kind']],
      meta: ['key'],
    })
  })

  it('conserve les valeurs absentes en null (jamais 0)', async () => {
    testDb = new PianoDB('piano-test-null')
    const project: Project = {
      id: crypto.randomUUID(),
      name: 'Déchiffrage',
      startDate: null,
      endDate: null,
      deletedAt: null,
      createdAt: Date.now(),
    }
    await testDb.projects.add(project)
    await testDb.dailyBudgets.put({ day: '2026-11-09', durationSec: null })
    expect(await testDb.projects.get(project.id)).toEqual(project)
    expect(await testDb.dailyBudgets.get('2026-11-09')).toEqual({
      day: '2026-11-09',
      durationSec: null,
    })
  })

  it('lit une ligne par clé composée', async () => {
    testDb = new PianoDB('piano-test-compound')
    await testDb.taskDayPlans.put({ taskId: 't1', day: '2026-11-09', durationSec: null })
    await testDb.sessionTasks.put({
      sessionId: 's1',
      taskId: 't1',
      order: 0,
      correctedDurationSec: null,
    })
    expect(await testDb.taskDayPlans.get(['t1', '2026-11-09'])).toEqual({
      taskId: 't1',
      day: '2026-11-09',
      durationSec: null,
    })
    expect(await testDb.sessionTasks.where('taskId').equals('t1').count()).toBe(1)
  })
})
