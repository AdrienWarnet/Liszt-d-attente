import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import { isValidationError } from './errors'
import { archiveTask, createProject, createSection, createTask, deleteProject } from './projects'
import {
  addManualEntry,
  correctSessionTaskDuration,
  createTaskInSession,
  deleteManualEntry,
  endSession,
  getCurrentSession,
  getRealTime,
  getRealTimeByTask,
  getRunningSegment,
  getSessionTaskDuration,
  getSessionView,
  listHistory,
  listSessions,
  pauseTask,
  setSessionTasks,
  startSession,
  startTask,
} from './sessions'

const MIN = 60_000
/** Heure de Paris → ms (novembre = UTC+1). */
const paris = (d: number, h: number, m = 0) => Date.UTC(2026, 10, d, h - 1, m)
const at = (ms: number) => vi.setSystemTime(ms)

beforeAll(() => vi.stubEnv('TZ', 'Europe/Paris'))
afterAll(() => vi.unstubAllEnvs())
beforeEach(async () => {
  // On ne simule que l'horloge : IndexedDB (fake-indexeddb) garde ses vrais timers.
  vi.useFakeTimers({ toFake: ['Date'] })
  at(paris(9, 18))
  await Promise.all(db.tables.map((t) => t.clear()))
})
afterEach(() => vi.useRealTimers())

async function setup() {
  const ballade = await createProject({ name: 'Ballade' })
  const dechiffrage = await createProject({ name: 'Déchiffrage' })
  const s1 = await createSection(ballade.id, 'Passages à tempo')
  const s2 = await createSection(dechiffrage.id, 'Clementi')
  const a = await createTask(s1.id, 'm. 23-30')
  const b = await createTask(s1.id, 'm. 45-52')
  const c = await createTask(s2.id, 'Sonatine')
  return { ballade, dechiffrage, s1, s2, a, b, c }
}

const expectCode = (p: Promise<unknown>, code: string) =>
  expect(p).rejects.toSatisfy((e) => isValidationError(e) && e.code === code)

describe('session', () => {
  it('une seule session en cours ; rattachée au jour de démarrage', async () => {
    const s = await startSession()
    expect(s).toMatchObject({ day: '2026-11-09', endedAt: null })
    expect((await getCurrentSession())?.id).toBe(s.id)
    await expectCode(startSession(), 'sessionInProgress')
    await endSession(s.id)
    expect(await getCurrentSession()).toBeNull()
  })

  it('démarrer A puis B : A est fermé, un seul segment ouvert en base', async () => {
    const { a, b } = await setup()
    const s = await startSession()
    await startTask(s.id, a.id)
    at(paris(9, 18, 10))
    await startTask(s.id, b.id)
    const open = (await db.timeSegments.toArray()).filter((x) => x.endedAt === null)
    expect(open).toHaveLength(1)
    expect(open[0].taskId).toBe(b.id)
    at(paris(9, 18, 15))
    expect(await getSessionTaskDuration(s.id, a.id)).toBe(600)
    expect(await getSessionTaskDuration(s.id, b.id)).toBe(300)
  })

  it('relancer la tâche qui tourne ne change rien ; pause puis reprise cumulent', async () => {
    const { a } = await setup()
    const s = await startSession()
    await startTask(s.id, a.id)
    await startTask(s.id, a.id)
    expect(await db.timeSegments.count()).toBe(1)
    at(paris(9, 18, 5))
    await pauseTask()
    expect(await getRunningSegment()).toBeNull()
    at(paris(9, 18, 30))
    await startTask(s.id, a.id)
    at(paris(9, 18, 32))
    expect(await getSessionTaskDuration(s.id, a.id)).toBe(7 * 60)
  })

  it('le temps est calculé depuis les horodatages (écran verrouillé 2 min)', async () => {
    const { a } = await setup()
    const s = await startSession()
    await startTask(s.id, a.id)
    at(paris(9, 18) + 2 * MIN + 30_000)
    expect(await getSessionTaskDuration(s.id, a.id)).toBe(150)
  })

  it('session du 9 à 23:50 terminée le 10 à 00:40 : tout compte pour le 9 (R18)', async () => {
    const { a } = await setup()
    at(paris(9, 23, 50))
    const s = await startSession()
    await startTask(s.id, a.id)
    at(paris(10, 0, 40))
    await endSession(s.id)
    expect(await getRealTime({ days: ['2026-11-09'] })).toBe(50 * 60)
    expect(await getRealTime({ days: ['2026-11-10'] })).toBeNull()
  })

  it('terminer la session ferme le chrono en cours', async () => {
    const { a } = await setup()
    const s = await startSession()
    await startTask(s.id, a.id)
    at(paris(9, 18, 20))
    await endSession(s.id)
    expect(await getRunningSegment()).toBeNull()
    at(paris(9, 20))
    expect(await getSessionTaskDuration(s.id, a.id)).toBe(20 * 60)
    await expectCode(startTask(s.id, a.id), 'sessionEnded')
  })
})

describe('tâches de la session', () => {
  it('ajout idempotent ; création d’une tâche depuis la session', async () => {
    const { s1, a } = await setup()
    const s = await startSession()
    await setSessionTasks(s.id, [a.id, a.id])
    const t = await createTaskInSession(s.id, s1.id, 'Coda')
    expect((await db.sessionTasks.toCollection().sortBy('order')).map((x) => x.taskId)).toEqual([
      a.id,
      t.id,
    ])
    expect((await db.tasks.get(t.id))?.sectionId).toBe(s1.id)
    await expectCode(createTaskInSession(s.id, 'inconnue', 'x'), 'notFound')
  })

  it('décocher une tâche déjà chronométrée la garde ; à 0 s elle est retirée', async () => {
    const { a, b } = await setup()
    const s = await startSession()
    await setSessionTasks(s.id, [a.id, b.id])
    await startTask(s.id, a.id)
    at(paris(9, 18, 1))
    await pauseTask()
    await setSessionTasks(s.id, [])
    expect((await db.sessionTasks.toArray()).map((x) => x.taskId)).toEqual([a.id])
  })
})

describe('correction', () => {
  it('1 200 s remplace la somme des segments ; null la rétablit', async () => {
    const { a } = await setup()
    const s = await startSession()
    await startTask(s.id, a.id)
    at(paris(9, 19, 10))
    await pauseTask()
    expect(await getSessionTaskDuration(s.id, a.id)).toBe(70 * 60)
    await correctSessionTaskDuration(s.id, a.id, 1200)
    expect(await getSessionTaskDuration(s.id, a.id)).toBe(1200)
    expect(await getRealTime({ days: ['2026-11-09'] })).toBe(1200)
    await correctSessionTaskDuration(s.id, a.id, null)
    expect(await getSessionTaskDuration(s.id, a.id)).toBe(70 * 60)
  })

  it('refusée sur la tâche en train d’être chronométrée ou une durée invalide', async () => {
    const { a } = await setup()
    const s = await startSession()
    await startTask(s.id, a.id)
    await expectCode(correctSessionTaskDuration(s.id, a.id, 600), 'taskRunning')
    await pauseTask()
    await expectCode(correctSessionTaskDuration(s.id, a.id, -1), 'durationInvalid')
    await expectCode(correctSessionTaskDuration(s.id, a.id, 1.5), 'durationInvalid')
  })
})

describe('temps réel', () => {
  it('jour sans donnée = null ; une seule entrée corrigée à 0 s = 0', async () => {
    const { a } = await setup()
    expect(await getRealTime({ days: ['2026-11-09'] })).toBeNull()
    const s = await startSession()
    await setSessionTasks(s.id, [a.id])
    // Tâche ajoutée mais jamais lancée : pas de donnée.
    expect(await getRealTime({ days: ['2026-11-09'] })).toBeNull()
    await correctSessionTaskDuration(s.id, a.id, 0)
    expect(await getRealTime({ days: ['2026-11-09'] })).toBe(0)
  })

  it('chronos + ajouts manuels, par tâche et par projet ; session en cours comptée jusqu’à maintenant', async () => {
    const { ballade, dechiffrage, a, b, c } = await setup()
    await addManualEntry(c.id, '2026-11-08', 45 * 60)
    const s = await startSession()
    await startTask(s.id, a.id)
    at(paris(9, 18, 30))
    await startTask(s.id, b.id)
    at(paris(9, 18, 40))
    const week = ['2026-11-08', '2026-11-09']
    expect(await getRealTime({ days: week })).toBe((30 + 10 + 45) * 60)
    expect(await getRealTime({ days: week, projectId: ballade.id })).toBe(40 * 60)
    expect(await getRealTime({ days: week, projectId: dechiffrage.id })).toBe(45 * 60)
    expect(await getRealTime({ days: week, taskIds: [b.id] })).toBe(10 * 60)
    expect(Object.fromEntries(await getRealTimeByTask(['2026-11-09']))).toEqual({
      [a.id]: 1800,
      [b.id]: 600,
    })
  })

  it('tâche archivée et projet supprimé restent comptés (R21)', async () => {
    const { dechiffrage, a, c } = await setup()
    await addManualEntry(a.id, '2026-11-09', 600)
    await addManualEntry(c.id, '2026-11-09', 900)
    await archiveTask(a.id)
    await deleteProject(dechiffrage.id)
    expect(await getRealTime({ days: ['2026-11-09'] })).toBe(1500)
  })

  it('ajout manuel : durée > 0 obligatoire ; supprimer le retire du temps réel', async () => {
    const { a } = await setup()
    await expectCode(addManualEntry(a.id, '2026-11-09', 0), 'durationInvalid')
    await expectCode(addManualEntry('inconnue', '2026-11-09', 60), 'notFound')
    const m = await addManualEntry(a.id, '2026-11-09', 2700)
    expect(await getRealTime({ days: ['2026-11-09'] })).toBe(2700)
    await deleteManualEntry(m.id)
    expect(await getRealTime({ days: ['2026-11-09'] })).toBeNull()
  })
})

describe('vues', () => {
  it('session en cours : tâches groupées par projet, tâche en cours repérée', async () => {
    const { a, b, c } = await setup()
    const s = await startSession()
    await setSessionTasks(s.id, [a.id, c.id, b.id])
    await startTask(s.id, b.id)
    at(paris(9, 18, 5))
    const view = await getSessionView(s.id)
    expect(view?.taskCount).toBe(3)
    expect(view?.totalSec).toBe(300)
    expect(
      view?.groups.map((g) => [
        g.project.name,
        g.color,
        g.items.map((i) => [i.task.label, i.running]),
      ]),
    ).toEqual([
      [
        'Ballade',
        'c0',
        [
          ['m. 23-30', false],
          ['m. 45-52', true],
        ],
      ],
      ['Déchiffrage', 'c1', [['Sonatine', false]]],
    ])
  })

  it('historique : session en cours à part, puis sessions et ajouts manuels du plus récent au plus ancien', async () => {
    const { a, c } = await setup()
    at(paris(7, 10))
    const old = await startSession()
    await startTask(old.id, a.id)
    at(paris(7, 10, 30))
    await endSession(old.id)
    at(paris(9, 8))
    await addManualEntry(c.id, '2026-11-08', 600)
    at(paris(9, 18))
    const cur = await startSession()
    const h = await listHistory()
    expect(h.current?.session.id).toBe(cur.id)
    expect(h.items.map((i) => [i.kind, i.day])).toEqual([
      ['manual', '2026-11-08'],
      ['session', '2026-11-07'],
    ])
    const first = h.items[1]
    expect(first.kind === 'session' && first.summary.totalSec).toBe(1800)
    expect((await listSessions({ from: '2026-11-08' })).map((x) => x.session.id)).toEqual([cur.id])
  })
})

describe('bandeau', () => {
  it('rien sans session ; tâche en cours et son temps ; en pause → reprendre la dernière', async () => {
    const { getBannerState } = await import('./sessions')
    const { a, b } = await setup()
    expect(await getBannerState()).toBeNull()
    const s = await startSession()
    expect(await getBannerState()).toEqual({ sessionId: s.id, running: null, resumeTaskId: null })
    await setSessionTasks(s.id, [a.id, b.id])
    expect((await getBannerState())?.resumeTaskId).toBe(a.id)
    await startTask(s.id, b.id)
    at(paris(9, 18, 12))
    expect((await getBannerState())?.running).toEqual({
      taskId: b.id,
      label: 'm. 45-52',
      durationSec: 720,
    })
    await pauseTask()
    expect(await getBannerState()).toMatchObject({ running: null, resumeTaskId: b.id })
  })
})
