import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import { archiveTask, createProject, createSection, createTask, deleteProject } from './projects'
import { addManualEntry, startSession, startTask } from './sessions'
import {
  barFill,
  formatGap,
  getDayOverview,
  getDayPlan,
  getWeekBudget,
  getWeekOverview,
  isPlannedOverBudget,
  planTaskOnDay,
  setDailyBudget,
  setDayPlannedTasks,
  setProjectWeekPlan,
  unplanTaskOnDay,
} from './week'

const WEEK = '2026-11-09'
const H = 3600
/** Lundi 9 nov. 18:00 à Paris. */
const NOW = Date.UTC(2026, 10, 9, 17, 0)

beforeAll(() => vi.stubEnv('TZ', 'Europe/Paris'))
afterAll(() => vi.unstubAllEnvs())
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  await Promise.all(db.tables.map((t) => t.clear()))
})
afterEach(() => vi.useRealTimers())

async function setup() {
  const ballade = await createProject({ name: 'Ballade' })
  const dechiffrage = await createProject({ name: 'Déchiffrage' })
  const s1 = await createSection(ballade.id, 'Passages')
  const s2 = await createSection(dechiffrage.id, 'Clementi')
  const a = await createTask(s1.id, 'm. 23-30')
  const b = await createTask(s1.id, 'm. 45-52')
  const c = await createTask(s2.id, 'Sonatine')
  return { ballade, dechiffrage, a, b, c }
}

describe('formatGap, isPlannedOverBudget, barFill', () => {
  it('écarts au-dessus / sous / pile, null si une valeur manque', () => {
    expect(formatGap(5400, 4500)).toBe('0:15 au-dessus du budget')
    expect(formatGap(25200, 33600)).toBe('2:20 sous le budget')
    expect(formatGap(4 * H + 30, 4 * H)).toBe('pile dans le budget')
    expect(formatGap(3 * H, 4 * H, 'planned')).toBe('1:00 sous le prévu')
    expect(formatGap(null, 4 * H)).toBeNull()
    expect(formatGap(4 * H, null)).toBeNull()
  })

  it('rouge seulement si prévu − budget ≥ 1 min et les deux saisis', () => {
    expect(isPlannedOverBudget(4.5 * H, 4 * H)).toBe(true)
    expect(isPlannedOverBudget(4 * H + 30, 4 * H)).toBe(false)
    expect(isPlannedOverBudget(4 * H, null)).toBe(false)
    expect(isPlannedOverBudget(null, 4 * H)).toBe(false)
  })

  it('barre : vide sans données, pleine et « au-dessus » si la valeur dépasse', () => {
    expect(barFill(null, null)).toEqual({ percent: 0, over: false })
    expect(barFill(1800, 3600)).toEqual({ percent: 50, over: false })
    expect(barFill(5400, 3600)).toEqual({ percent: 100, over: true })
    expect(barFill(600, null)).toEqual({ percent: 100, over: false })
    expect(barFill(null, 3600)).toEqual({ percent: 0, over: false })
    expect(barFill(600, 0)).toEqual({ percent: 100, over: true })
  })
})

describe('budget', () => {
  it('semaine sans saisie : total null, chaque jour null', async () => {
    const w = await getWeekBudget(WEEK)
    expect(w.total).toBeNull()
    expect(w.days.map((d) => d.durationSec)).toEqual(Array(7).fill(null))
    const o = await getWeekOverview(WEEK, NOW)
    expect(o.week).toEqual({ budget: null, real: null })
    expect(o.days.every((d) => d.budget === null && d.real === null && d.planned === null)).toBe(
      true,
    )
  })

  it('0 saisi reste 0 ; null supprime la ligne', async () => {
    await setDailyBudget('2026-11-10', 0)
    expect((await getWeekBudget(WEEK)).total).toBe(0)
    await setDailyBudget('2026-11-10', null)
    expect(await db.dailyBudgets.count()).toBe(0)
  })
})

describe('temps prévu par tâche et par jour', () => {
  it('tâche prévue sans durée : comptée dans le nombre, pas dans le total (seule → null)', async () => {
    const { a, b } = await setup()
    await planTaskOnDay(a.id, '2026-11-10', null)
    let day = (await getWeekOverview(WEEK, NOW)).days[1]
    expect(day).toMatchObject({ plannedTaskCount: 1, planned: null })
    await planTaskOnDay(b.id, '2026-11-10', 1800)
    day = (await getWeekOverview(WEEK, NOW)).days[1]
    expect(day).toMatchObject({ plannedTaskCount: 2, planned: 1800 })
    await unplanTaskOnDay(b.id, '2026-11-10')
    expect((await getWeekOverview(WEEK, NOW)).days[1].plannedTaskCount).toBe(1)
  })

  it('écart prévu − budget null sans budget ; rouge au-delà d’une minute', async () => {
    const { a } = await setup()
    await planTaskOnDay(a.id, WEEK, 2.25 * H)
    expect(await getDayOverview(WEEK, NOW)).toMatchObject({
      budget: null,
      planned: 2.25 * H,
      plannedOverBudget: false,
    })
    await setDailyBudget(WEEK, 1.5 * H)
    expect((await getDayOverview(WEEK, NOW)).plannedOverBudget).toBe(true)
  })

  it('getDayPlan groupe par projet, garde archivées et projets supprimés', async () => {
    const { dechiffrage, a, b, c } = await setup()
    for (const t of [c, b, a]) await planTaskOnDay(t.id, WEEK, null)
    await archiveTask(b.id)
    await deleteProject(dechiffrage.id)
    const groups = await getDayPlan(WEEK)
    expect(
      groups.map((g) => [
        g.project.name,
        g.color,
        g.items.map((i) => [i.task.label, i.section.name, i.archived]),
      ]),
    ).toEqual([
      [
        'Ballade',
        'c0',
        [
          ['m. 23-30', 'Passages', false],
          ['m. 45-52', 'Passages', true],
        ],
      ],
      ['Déchiffrage', 'c1', [['Sonatine', 'Clementi', false]]],
    ])
    expect(groups[1].project.deletedAt).not.toBeNull()
  })

  it('setDayPlannedTasks ajoute les cochées, retire les actives décochées, jamais une archivée', async () => {
    const { a, b, c } = await setup()
    await planTaskOnDay(a.id, WEEK, 3600)
    await planTaskOnDay(b.id, WEEK, null)
    await archiveTask(b.id)
    await setDayPlannedTasks(WEEK, [c.id])
    const rows = await db.taskDayPlans.where('day').equals(WEEK).toArray()
    expect(rows.map((r) => r.taskId).sort()).toEqual([b.id, c.id].sort())
    // Une tâche déjà prévue garde sa durée si elle reste cochée.
    await planTaskOnDay(c.id, WEEK, 900)
    await setDayPlannedTasks(WEEK, [c.id])
    expect((await db.taskDayPlans.get([c.id, WEEK]))?.durationSec).toBe(900)
  })
})

describe('vue semaine', () => {
  it('réel par jour et par projet, prévu projet, total prévu et rouge', async () => {
    const { ballade, dechiffrage, a, c } = await setup()
    await setDailyBudget(WEEK, 1.5 * H)
    await setDailyBudget('2026-11-10', 1 * H)
    await addManualEntry(c.id, '2026-11-10', 40 * 60)
    const s = await startSession()
    await startTask(s.id, a.id)
    vi.setSystemTime(NOW + 30 * 60_000)
    await setProjectWeekPlan(ballade.id, WEEK, 2 * H)
    await setProjectWeekPlan(dechiffrage.id, WEEK, 1 * H)

    const o = await getWeekOverview(WEEK, Date.now())
    expect(o.week).toEqual({ budget: 2.5 * H, real: 70 * 60 })
    expect(o.days.slice(0, 2).map((d) => [d.real, d.isToday])).toEqual([
      [1800, true],
      [2400, false],
    ])
    expect(o.projects.map((p) => [p.project.name, p.planned, p.real])).toEqual([
      ['Ballade', 2 * H, 1800],
      ['Déchiffrage', 1 * H, 2400],
    ])
    expect(o.plannedTotal).toBe(3 * H)
    expect(o.plannedOverBudget).toBe(true)

    await setProjectWeekPlan(dechiffrage.id, WEEK, null)
    const o2 = await getWeekOverview(WEEK, Date.now())
    expect(o2.plannedTotal).toBe(2 * H)
    expect(o2.plannedOverBudget).toBe(false)
  })

  it('un projet supprimé n’a plus de ligne de temps prévu', async () => {
    const { dechiffrage } = await setup()
    await deleteProject(dechiffrage.id)
    expect((await getWeekOverview(WEEK, NOW)).projects.map((p) => p.project.name)).toEqual([
      'Ballade',
    ])
  })
})

describe('vue Jour : fait et imprévues (lot 7)', () => {
  it('fait sur les tâches prévues ; imprévues = travaillées sans être prévues ; prévue ensuite → plus imprévue', async () => {
    const { getDayTasks } = await import('./week')
    const { a, b, c } = await setup()
    await planTaskOnDay(a.id, WEEK, 3600)
    await addManualEntry(a.id, WEEK, 2700)
    await addManualEntry(c.id, WEEK, 1200)
    await addManualEntry(b.id, '2026-11-10', 600) // autre jour : ignorée
    let d = await getDayTasks(WEEK, NOW)
    expect(
      d.planned.flatMap((g) => g.items.map((i) => [i.task.label, i.plannedSec, i.realSec])),
    ).toEqual([['m. 23-30', 3600, 2700]])
    expect(
      d.unplanned.map((g) => [g.project.name, g.items.map((i) => [i.task.label, i.realSec])]),
    ).toEqual([['Déchiffrage', [['Sonatine', 1200]]]])
    await planTaskOnDay(c.id, WEEK, null)
    d = await getDayTasks(WEEK, NOW)
    expect(d.unplanned).toEqual([])
    expect(
      d.planned.flatMap((g) => g.items.map((i) => [i.task.label, i.plannedSec, i.realSec])),
    ).toEqual([
      ['m. 23-30', 3600, 2700],
      ['Sonatine', null, 1200],
    ])
  })

  it('tâche prévue non travaillée : fait null ; chrono en cours compté', async () => {
    const { getDayTasks } = await import('./week')
    const { a, b } = await setup()
    await planTaskOnDay(a.id, WEEK, null)
    const s = await startSession()
    await startTask(s.id, b.id)
    const d = await getDayTasks(WEEK, NOW + 10 * 60_000)
    expect(d.planned[0].items[0].realSec).toBeNull()
    expect(d.unplanned[0].items[0]).toMatchObject({ realSec: 600 })
  })
})

describe('reste sur le budget (lot 9)', () => {
  it('reste, pile, au-dessus ; null sans budget ; aucun réel = tout le budget reste', async () => {
    const { formatRemaining } = await import('./week')
    expect(formatRemaining(1 * H, 1.5 * H)).toBe('Reste 0:30')
    expect(formatRemaining(1 * H, 1.5 * H, false)).toBe('reste 0:30')
    expect(formatRemaining(null, 1.5 * H)).toBe('Reste 1:30')
    expect(formatRemaining(1.5 * H + 30, 1.5 * H)).toBe('pile dans le budget')
    expect(formatRemaining(2 * H, 1.5 * H)).toBe('0:30 au-dessus du budget')
    expect(formatRemaining(1 * H, null)).toBeNull()
  })
})
