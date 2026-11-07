import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import { setSectionWeeks } from './planning'
import { archiveTask, createProject, createSection, createTask, deleteProject } from './projects'
import { defaultSelection, formatWeekRange, getProjectReport, getWeeklyReport } from './report'
import { addManualEntry, startSession, startTask } from './sessions'
import { planTaskOnDay, setDailyBudget, setProjectWeekPlan } from './week'

const WEEK = '2026-11-09'
const H = 3600
const MON_18H = Date.UTC(2026, 10, 9, 17)

beforeAll(() => vi.stubEnv('TZ', 'Europe/Paris'))
afterAll(() => vi.unstubAllEnvs())
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(MON_18H)
  await Promise.all(db.tables.map((t) => t.clear()))
})
afterEach(() => vi.useRealTimers())

async function setup() {
  const ballade = await createProject({ name: 'Ballade' })
  const dechiffrage = await createProject({ name: 'Déchiffrage' })
  const s1 = await createSection(ballade.id, 'Passages')
  const s2 = await createSection(ballade.id, 'Page 1')
  const s3 = await createSection(dechiffrage.id, 'Clementi')
  const a = await createTask(s1.id, 'm. 23-30')
  const b = await createTask(s2.id, 'Lignes 3 et 4')
  const c = await createTask(s3.id, 'Sonatine')
  return { ballade, dechiffrage, s1, s2, s3, a, b, c }
}

describe('bilan hebdo (6.2)', () => {
  it('semaine vide → vide, budget et réel null, aucun projet', async () => {
    await setup()
    const r = await getWeeklyReport(WEEK, MON_18H)
    expect(r.isEmpty).toBe(true)
    expect(r.week).toEqual({ real: null, budget: null, plannedProjects: null, gap: null })
    expect(r.projects).toEqual([])
    expect(r.live).toBe(false)
  })

  it('jours, projets, parts, % du prévu, sections et tâches', async () => {
    const { ballade, dechiffrage, a, b, c } = await setup()
    await setDailyBudget(WEEK, 1.5 * H)
    await setDailyBudget('2026-11-10', 1 * H)
    await addManualEntry(a.id, WEEK, 2 * H)
    await addManualEntry(b.id, '2026-11-10', 1 * H)
    await addManualEntry(c.id, '2026-11-10', 1 * H)
    await setProjectWeekPlan(ballade.id, WEEK, 4 * H)
    await planTaskOnDay(a.id, WEEK, 1 * H)
    await planTaskOnDay(a.id, '2026-11-11', null)

    const r = await getWeeklyReport(WEEK, MON_18H)
    expect(r.isEmpty).toBe(false)
    expect(r.week).toEqual({ real: 4 * H, budget: 2.5 * H, plannedProjects: 4 * H, gap: 1.5 * H })
    expect(r.days.slice(0, 2).map((d) => [d.shortLabel, d.real, d.budget, d.gap])).toEqual([
      ['lun 9', 2 * H, 1.5 * H, 0.5 * H],
      ['mar 10', 2 * H, 1 * H, 1 * H],
    ])
    expect(r.days[2]).toMatchObject({ real: null, budget: null, gap: null })
    expect(r.defaultSelectedDay).toBe(0)

    const [p1, p2] = r.projects
    expect([
      p1.project.name,
      p1.color,
      p1.real,
      p1.planned,
      p1.sharePct,
      p1.plannedPct,
      p1.gap,
    ]).toEqual(['Ballade', 'c0', 3 * H, 4 * H, 75, 75, -1 * H])
    expect(p1.sections.map((s) => [s.section.name, s.real, s.sharePct])).toEqual([
      ['Passages', 2 * H, 67],
      ['Page 1', 1 * H, 33],
    ])
    expect(p1.sections[0].tasks[0]).toMatchObject({ planned: 1 * H, real: 2 * H, archived: false })
    expect(p1.taskCount).toBe(2)
    expect([p2.project.name, p2.sharePct, p2.planned, p2.plannedPct]).toEqual([
      'Déchiffrage',
      25,
      null,
      null,
    ])
    void dechiffrage
  })

  it('tâche archivée et projet supprimé avec du réel → présents', async () => {
    const { dechiffrage, a, c } = await setup()
    await addManualEntry(a.id, WEEK, 600)
    await addManualEntry(c.id, WEEK, 900)
    await archiveTask(a.id)
    await deleteProject(dechiffrage.id)
    const r = await getWeeklyReport(WEEK, MON_18H)
    expect(r.projects.map((p) => [p.project.name, p.deleted])).toEqual([
      ['Ballade', false],
      ['Déchiffrage', true],
    ])
    expect(r.projects[0].sections[0].tasks[0].archived).toBe(true)
  })

  it('projet avec seulement un prévu : présent ; sans réel ni prévu : absent', async () => {
    const { dechiffrage } = await setup()
    await setProjectWeekPlan(dechiffrage.id, WEEK, 2 * H)
    const r = await getWeeklyReport(WEEK, MON_18H)
    expect(r.projects.map((p) => [p.project.name, p.real, p.plannedPct])).toEqual([
      ['Déchiffrage', null, 0],
    ])
  })

  it('session en cours comptée jusqu’à maintenant, « en direct »', async () => {
    const { a } = await setup()
    const s = await startSession()
    await startTask(s.id, a.id)
    const r = await getWeeklyReport(WEEK, MON_18H + 25 * 60_000)
    expect(r.live).toBe(true)
    expect(r.week.real).toBe(25 * 60)
    expect((await getWeeklyReport('2026-11-02', MON_18H)).live).toBe(false)
  })

  it('planning de la semaine repris du planning', async () => {
    const { s1 } = await setup()
    await setSectionWeeks(s1.id, [WEEK])
    const r = await getWeeklyReport(WEEK, MON_18H)
    expect(
      r.planning.map((g) => [g.project.name, g.sections.map((s) => [s.section.name, s.inInitial])]),
    ).toEqual([['Ballade', [['Passages', true]]]])
  })
})

describe('sélection par défaut', () => {
  it('le repère, sinon la dernière colonne avec données, sinon la première', () => {
    const col = (highlight: boolean, hasData: boolean) => ({ highlight, hasData })
    expect(defaultSelection([col(false, true), col(true, false), col(false, true)])).toBe(1)
    expect(defaultSelection([col(false, true), col(false, true), col(false, false)])).toBe(1)
    expect(defaultSelection([col(false, false), col(false, false)])).toBe(0)
  })
})

describe('bilan projet (6.3)', () => {
  it('formatWeekRange : non placé, une semaine, plage contiguë, liste', () => {
    expect(formatWeekRange([])).toBe('non placé')
    expect(formatWeekRange(['2026-11-09'])).toBe('sem. du 9 nov.')
    expect(formatWeekRange(['2026-11-16', '2026-11-09'])).toBe('9 → 22 nov.')
    expect(formatWeekRange(['2026-10-26', '2026-11-02'])).toBe('26 oct. → 8 nov.')
    expect(formatWeekRange(['2026-11-09', '2026-11-23'])).toBe('9 nov, 23 nov')
  })

  it('projet sans aucun temps : réel total null, sections présentes avec réel null', async () => {
    const { ballade } = await setup()
    const r = (await getProjectReport(ballade.id, MON_18H))!
    expect(r.realTotal).toBeNull()
    expect(r.weeksWorked).toBe(0)
    expect(r.activeTaskCount).toBe(2)
    expect(r.sections.map((s) => [s.section.name, s.real, s.initialRange, s.progress])).toEqual([
      ['Passages', null, 'non placé', null],
      ['Page 1', null, 'non placé', null],
    ])
    expect(r.weeks.map((w) => w.weekStart)).toEqual([WEEK, '2026-11-16'])
    expect(r.defaultSelectedWeek).toBe(0)
  })

  it('réel total, semaines travaillées, plage avec un trou, planning et tâche archivée', async () => {
    const { ballade, s1, a, b } = await setup()
    await addManualEntry(a.id, '2026-10-27', 1 * H) // semaine du 26 oct.
    await addManualEntry(b.id, WEEK, 2 * H)
    await setProjectWeekPlan(ballade.id, '2026-10-26', 3 * H)
    await setSectionWeeks(s1.id, [WEEK, '2026-11-16'])
    await setSectionWeeks(s1.id, [WEEK, '2026-11-16', '2026-11-23'])
    await archiveTask(a.id)
    const r = (await getProjectReport(ballade.id, MON_18H))!
    expect([r.realTotal, r.weeksWorked, r.activeTaskCount]).toEqual([3 * H, 2, 1])
    expect(r.weeks.map((w) => [w.shortLabel, w.real, w.planned])).toEqual([
      ['26 oct', 1 * H, 3 * H],
      ['2 nov', null, null],
      ['9 nov', 2 * H, null],
      ['16 nov', null, null],
    ])
    expect(r.weeks[0].gap).toBe(-2 * H)
    expect(r.defaultSelectedWeek).toBe(2)
    expect(r.sections[0]).toMatchObject({
      real: 1 * H,
      initialRange: '9 → 22 nov.',
      revisedRange: '9 → 29 nov.',
    })
    expect(r.sections[0].tasks[0]).toMatchObject({ real: 1 * H, archived: true })
  })

  it('le temps d’une session compte dans son projet, sur toute la durée', async () => {
    const { ballade, a } = await setup()
    const s = await startSession()
    await startTask(s.id, a.id)
    const r = (await getProjectReport(ballade.id, MON_18H + 30 * 60_000))!
    expect(r.realTotal).toBe(1800)
  })
})
