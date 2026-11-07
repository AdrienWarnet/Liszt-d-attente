import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db'
import {
  getProjectPlanning,
  getWeekPlanningAllProjects,
  setSectionWeeks,
  toggleSectionWeek,
} from './planning'
import { createProject, createSection, deleteProject, updateSection } from './projects'

const S1 = '2026-11-09'
const S2 = '2026-11-16'
const S3 = '2026-11-23'
const NOW = Date.UTC(2026, 10, 10, 12) // mardi 10 nov.

beforeAll(() => vi.stubEnv('TZ', 'Europe/Paris'))
afterAll(() => vi.unstubAllEnvs())
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
  await Promise.all(db.tables.map((t) => t.clear()))
})
afterEach(() => vi.useRealTimers())

async function setup(projectInput = {}) {
  const p = await createProject({ name: 'Ballade', ...projectInput })
  const a = await createSection(p.id, 'Passages à tempo')
  const b = await createSection(p.id, 'Page 1')
  return { p, a, b }
}

const sectionOf = async (projectId: string, name: string) =>
  (await getProjectPlanning(projectId, NOW))!.sections.find((s) => s.section.name === name)!

describe('placements', () => {
  it('premier placement sur S1, S2 → initial = revu = [S1, S2]', async () => {
    const { p, a } = await setup()
    await setSectionWeeks(a.id, [S2, S1])
    expect(await sectionOf(p.id, 'Passages à tempo')).toMatchObject({
      initialWeeks: [S1, S2],
      revisedWeeks: [S1, S2],
      changed: false,
    })
  })

  it('nouveau placement [S2, S3] → initial reste [S1, S2], revu = [S2, S3], modifié', async () => {
    const { p, a } = await setup()
    await setSectionWeeks(a.id, [S1, S2])
    await setSectionWeeks(a.id, [S2, S3])
    expect(await sectionOf(p.id, 'Passages à tempo')).toMatchObject({
      initialWeeks: [S1, S2],
      revisedWeeks: [S2, S3],
      changed: true,
    })
  })

  it('placement vidé après un initial → revu vide, initial conservé', async () => {
    const { p, a } = await setup()
    await setSectionWeeks(a.id, [S1])
    await setSectionWeeks(a.id, [])
    expect(await sectionOf(p.id, 'Passages à tempo')).toMatchObject({
      initialWeeks: [S1],
      revisedWeeks: [],
    })
  })

  it('section jamais placée → [], [], avancement null ; vider sans initial ne crée rien', async () => {
    const { p, b } = await setup()
    await setSectionWeeks(b.id, [])
    expect(await sectionOf(p.id, 'Page 1')).toMatchObject({
      initialWeeks: [],
      revisedWeeks: [],
      progress: null,
      changed: false,
    })
    expect(await db.sectionPlacements.count()).toBe(0)
  })

  it('case du planning : premier toucher = prévu initial, ensuite seul le revu bouge', async () => {
    const { p, a } = await setup()
    expect(await toggleSectionWeek(a.id, S1)).toBe(true)
    expect(await toggleSectionWeek(a.id, S2)).toBe(false)
    expect(await toggleSectionWeek(a.id, S1)).toBe(false)
    expect(await sectionOf(p.id, 'Passages à tempo')).toMatchObject({
      initialWeeks: [S1],
      revisedWeeks: [S2],
      changed: true,
    })
  })
})

describe('plage de semaines', () => {
  it('rien : semaine courante + 7 semaines', async () => {
    const { p } = await setup()
    const plan = (await getProjectPlanning(p.id, NOW))!
    expect(plan.currentWeek).toBe(S1)
    expect(plan.weeks).toHaveLength(8)
    expect([plan.weeks[0], plan.weeks[7]]).toEqual([S1, '2026-12-28'])
  })

  it('élargie aux placements et aux dates du projet', async () => {
    const { p, a } = await setup({ startDate: '2026-10-21', endDate: '2027-02-03' })
    await setSectionWeeks(a.id, ['2026-10-05'])
    const plan = (await getProjectPlanning(p.id, NOW))!
    expect(plan.weeks[0]).toBe('2026-10-05')
    expect(plan.weeks.at(-1)).toBe('2027-02-01')
    expect(plan.weeks).toContain('2026-10-19')
  })

  it('avancement repris de la section', async () => {
    const { p, a } = await setup()
    await updateSection(a.id, { progress: 'Tempo 80' })
    expect((await sectionOf(p.id, 'Passages à tempo')).progress).toBe('Tempo 80')
  })
})

describe('planning de la semaine, tous projets', () => {
  it('sections du revu sur la semaine, avec « initial » ou « ajouté au revu » ; projets supprimés exclus', async () => {
    const { a, b } = await setup()
    const other = await createProject({ name: 'Sonate' })
    const c = await createSection(other.id, 'Mvt 2')
    await setSectionWeeks(a.id, [S1])
    await setSectionWeeks(b.id, [S2])
    await setSectionWeeks(b.id, [S1, S2])
    await setSectionWeeks(c.id, [S1])
    await deleteProject(other.id)
    const groups = await getWeekPlanningAllProjects(S1)
    expect(
      groups.map((g) => [
        g.project.name,
        g.color,
        g.sections.map((s) => [s.section.name, s.inInitial]),
      ]),
    ).toEqual([
      [
        'Ballade',
        'c0',
        [
          ['Passages à tempo', true],
          ['Page 1', false],
        ],
      ],
    ])
    expect(await getWeekPlanningAllProjects(S3)).toEqual([])
  })
})
