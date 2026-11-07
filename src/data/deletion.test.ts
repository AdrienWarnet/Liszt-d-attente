import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { isValidationError } from './errors'
import { setSectionWeeks } from './planning'
import {
  archiveTask,
  createProject,
  createSection,
  createTask,
  deleteSection,
  deleteTask,
  getSectionDeletionInfo,
} from './projects'
import {
  addManualEntry,
  correctSessionTaskDuration,
  pauseTask,
  setSessionTasks,
  startSession,
  startTask,
} from './sessions'
import { planTaskOnDay } from './week'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const expectCode = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e) => isValidationError(e) && e.code === code)

async function setup() {
  const p = await createProject({ name: 'Ballade' })
  const s = await createSection(p.id, 'Page 2')
  const a = await createTask(s.id, 'a')
  const b = await createTask(s.id, 'b')
  return { p, s, a, b }
}

describe('supprimer une tâche (lot 3)', () => {
  it('sans temps : supprimée, avec ses jours prévus et sa place dans une session', async () => {
    const { a, b } = await setup()
    await planTaskOnDay(a.id, '2026-11-09', 600)
    const session = await startSession()
    await setSessionTasks(session.id, [a.id, b.id])
    await deleteTask(a.id)
    expect(await db.tasks.get(a.id)).toBeUndefined()
    expect(await db.taskDayPlans.count()).toBe(0)
    expect((await db.sessionTasks.toArray()).map((st) => st.taskId)).toEqual([b.id])
  })

  it('refusée si un chrono, une correction ou un ajout manuel existe', async () => {
    const { a, b } = await setup()
    const session = await startSession()
    await startTask(session.id, a.id)
    await pauseTask()
    await expectCode(deleteTask(a.id), 'hasTime')
    await setSessionTasks(session.id, [a.id, b.id])
    await correctSessionTaskDuration(session.id, b.id, 0)
    await expectCode(deleteTask(b.id), 'hasTime')
    const { s } = await setup()
    const c = await createTask(s.id, 'c')
    await addManualEntry(c.id, '2026-11-09', 60)
    await expectCode(deleteTask(c.id), 'hasTime')
    expect(await db.tasks.count()).toBe(5)
  })
})

describe('supprimer une section (lot 3)', () => {
  it('sans temps : section, tâches (archivées comprises), jours prévus et placements supprimés', async () => {
    const { p, s, a, b } = await setup()
    await archiveTask(b.id)
    await planTaskOnDay(a.id, '2026-11-09', null)
    await setSectionWeeks(s.id, ['2026-11-09'])
    const other = await createSection(p.id, 'Page 1')
    expect(await getSectionDeletionInfo(s.id)).toEqual({ taskCount: 2, hasTime: false })
    await deleteSection(s.id)
    expect(await db.sections.toArray()).toEqual([other])
    expect(await db.tasks.count()).toBe(0)
    expect(await db.taskDayPlans.count()).toBe(0)
    expect(await db.sectionPlacements.count()).toBe(0)
  })

  it('refusée si une de ses tâches a du temps ; rien n’est supprimé', async () => {
    const { s, b } = await setup()
    await addManualEntry(b.id, '2026-11-09', 300)
    expect(await getSectionDeletionInfo(s.id)).toEqual({ taskCount: 2, hasTime: true })
    await expectCode(deleteSection(s.id), 'hasTime')
    expect(await db.tasks.count()).toBe(2)
    expect(await db.sections.count()).toBe(1)
  })
})
