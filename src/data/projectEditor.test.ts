import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { isValidationError } from './errors'
import { setSectionWeeks } from './planning'
import { loadProjectDraft, saveProjectDraft, type ProjectDraft } from './projectEditor'
import { listSectionsWithTasks } from './projects'
import { addManualEntry } from './sessions'
import { planTaskOnDay } from './week'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

const expectCode = (p: Promise<unknown>, code: string, details?: string[]) =>
  expect(p).rejects.toSatisfy(
    (e) =>
      isValidationError(e) &&
      e.code === code &&
      (details === undefined || JSON.stringify(e.details) === JSON.stringify(details)),
  )

const structure = async (projectId: string) =>
  (await listSectionsWithTasks(projectId)).map((s) => [
    s.section.name,
    s.activeTasks.map((t) => t.label),
    s.archivedTasks.map((t) => t.label),
  ])

const newDraft = (): ProjectDraft => ({
  name: ' Ballade n°1 ',
  startDate: '2026-11-02',
  endDate: null,
  sections: [
    {
      name: 'Passages à tempo',
      tasks: [{ label: 'm. 23-30' }, { label: ' m. 45-52 ' }, { label: '' }],
    },
    { name: 'Page 1', tasks: [{ label: 'Lignes 3 et 4' }] },
    { name: '', tasks: [{ label: '  ' }] },
  ],
})

describe('éditeur de projet : création (lot 5)', () => {
  it('crée projet, sections dans l’ordre et plusieurs tâches par section ; lignes vides ignorées', async () => {
    const id = await saveProjectDraft(newDraft())
    expect(await db.projects.get(id)).toMatchObject({
      name: 'Ballade n°1',
      startDate: '2026-11-02',
      endDate: null,
    })
    expect(await structure(id)).toEqual([
      ['Passages à tempo', ['m. 23-30', 'm. 45-52'], []],
      ['Page 1', ['Lignes 3 et 4'], []],
    ])
  })

  it('refus si nom vide, fin avant début, ou section sans nom avec des tâches ; rien n’est créé', async () => {
    await expectCode(saveProjectDraft({ ...newDraft(), name: ' ' }), 'nameRequired')
    await expectCode(saveProjectDraft({ ...newDraft(), endDate: '2026-11-01' }), 'endBeforeStart')
    await expectCode(
      saveProjectDraft({ ...newDraft(), sections: [{ name: '', tasks: [{ label: 'x' }] }] }),
      'sectionNameRequired',
    )
    expect(await db.projects.count()).toBe(0)
  })
})

describe('éditeur de projet : modification (lot 5)', () => {
  it('recharge, renomme, ajoute, retire et archive ; l’archivée sort de l’éditeur', async () => {
    const id = await saveProjectDraft(newDraft())
    const draft = (await loadProjectDraft(id))!
    expect(draft.sections.map((s) => s.tasks.map((t) => t.label))).toEqual([
      ['m. 23-30', 'm. 45-52'],
      ['Lignes 3 et 4'],
    ])
    const [passages, page1] = draft.sections
    passages.name = 'Passages'
    passages.tasks[0].label = 'm. 23-30 main gauche'
    passages.tasks[1].archive = true
    passages.tasks.push({ label: 'Coda' })
    page1.tasks = [] // retire « Lignes 3 et 4 »
    draft.sections.push({ name: 'Page 2', tasks: [{ label: 'Mémoriser' }] })
    await saveProjectDraft(draft)
    expect(await structure(id)).toEqual([
      ['Passages', ['m. 23-30 main gauche', 'Coda'], ['m. 45-52']],
      ['Page 1', [], []],
      ['Page 2', ['Mémoriser'], []],
    ])
    expect((await loadProjectDraft(id))!.sections[0].tasks.map((t) => t.label)).toEqual([
      'm. 23-30 main gauche',
      'Coda',
    ])
  })

  it('retirer une section supprime ses tâches (archivées comprises), placements et jours prévus', async () => {
    const id = await saveProjectDraft(newDraft())
    const draft = (await loadProjectDraft(id))!
    const page1 = (await db.sections.toArray()).find((s) => s.name === 'Page 1')!
    const [lignes] = await db.tasks.where('sectionId').equals(page1.id).toArray()
    await planTaskOnDay(lignes.id, '2026-11-09', null)
    await setSectionWeeks(page1.id, ['2026-11-09'])
    draft.sections = draft.sections.filter((s) => s.name !== 'Page 1')
    await saveProjectDraft(draft)
    expect(await db.sections.get(page1.id)).toBeUndefined()
    expect(await db.tasks.get(lignes.id)).toBeUndefined()
    expect(await db.taskDayPlans.count()).toBe(0)
    expect(await db.sectionPlacements.count()).toBe(0)
  })

  it('retirer une tâche ou une section qui a du temps : refus avec les libellés, rien ne change', async () => {
    const id = await saveProjectDraft(newDraft())

    const t = (await db.tasks.toArray()).find((x) => x.label === 'm. 23-30')!
    await addManualEntry(t.id, '2026-11-09', 600)
    const before = await structure(id)
    const draft = (await loadProjectDraft(id))!
    draft.name = 'Autre nom'
    draft.sections[0].tasks = draft.sections[0].tasks.filter((x) => x.label !== 'm. 23-30')
    await expectCode(saveProjectDraft(draft), 'hasTime', ['m. 23-30'])
    const draft2 = (await loadProjectDraft(id))!
    draft2.sections = draft2.sections.slice(1)
    await expectCode(saveProjectDraft(draft2), 'hasTime', ['m. 23-30'])
    expect(await structure(id)).toEqual(before)
    expect((await db.projects.get(id))?.name).toBe('Ballade n°1')
  })
})
