import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { isValidationError } from './errors'
import {
  archiveTask,
  archiveTasks,
  createProject,
  createSection,
  createTask,
  deleteProject,
  listActiveTasksGrouped,
  listProjects,
  listSectionsWithTasks,
  reactivateTask,
  updateProject,
  updateSection,
  updateTask,
} from './projects'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

async function expectCode(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toSatisfy((e) => isValidationError(e) && e.code === code)
}

describe('projets', () => {
  it('sans dates → startDate et endDate valent null (pas "", pas 0)', async () => {
    const p = await createProject({ name: '  Déchiffrage ', startDate: '', endDate: undefined })
    const stored = await db.projects.get(p.id)
    expect(stored).toMatchObject({
      name: 'Déchiffrage',
      startDate: null,
      endDate: null,
      deletedAt: null,
    })
  })

  it('refuse un nom vide et une fin avant le début', async () => {
    await expectCode(createProject({ name: '   ' }), 'nameRequired')
    await expectCode(
      createProject({ name: 'X', startDate: '2026-11-10', endDate: '2026-11-09' }),
      'endBeforeStart',
    )
    expect(await db.projects.count()).toBe(0)
  })

  it('modifie un projet avec les mêmes validations ; vider une date → null', async () => {
    const p = await createProject({ name: 'Ballade', startDate: '2026-11-02' })
    await updateProject(p.id, { name: 'Ballade n°1', startDate: '' })
    expect(await db.projects.get(p.id)).toMatchObject({ name: 'Ballade n°1', startDate: null })
    await expectCode(updateProject(p.id, { name: '' }), 'nameRequired')
  })

  it('liste par date de création, avec le nombre de tâches actives', async () => {
    const b = await createProject({ name: 'B' })
    const a = await createProject({ name: 'A' })
    const s = await createSection(b.id, 'Page 1')
    await createTask(s.id, 't1')
    const t2 = await createTask(s.id, 't2')
    await archiveTask(t2.id)
    const list = await listProjects()
    expect(list.map((x) => x.project.name)).toEqual(['B', 'A'])
    expect(list[0].activeTaskCount).toBe(1)
    expect(list[1]).toMatchObject({ project: { id: a.id }, activeTaskCount: 0 })
  })

  it('un projet supprimé disparaît des listes mais ses tâches restent en base', async () => {
    const p = await createProject({ name: 'Sonate' })
    const s = await createSection(p.id, 'Mvt 2')
    const t = await createTask(s.id, 'Exposition')
    await deleteProject(p.id)
    expect(await listProjects()).toEqual([])
    expect(await listActiveTasksGrouped()).toEqual([])
    expect(await db.tasks.get(t.id)).toBeDefined()
    expect((await db.projects.get(p.id))?.deletedAt).toEqual(expect.any(Number))
  })
})

describe('couleurs de projet', () => {
  it('c0 à c5 par ordre de création, puis c0 ; supprimer ne change rien', async () => {
    const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
    const ids: string[] = []
    for (const name of names) ids.push((await createProject({ name })).id)
    const colors = () => listProjects().then((l) => l.map((x) => x.color))
    expect(await colors()).toEqual(['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c0'])
    await deleteProject(ids[0])
    expect(await colors()).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c0'])
  })
})

describe('sections', () => {
  it('ordre croissant, avancement vide → null', async () => {
    const p = await createProject({ name: 'P' })
    const s1 = await createSection(p.id, 'Passages à tempo')
    const s2 = await createSection(p.id, 'Page 1')
    expect([s1.order, s2.order]).toEqual([0, 1])
    expect(s1.progress).toBeNull()
    await updateSection(s1.id, { progress: 'Tempo 80' })
    expect((await db.sections.get(s1.id))?.progress).toBe('Tempo 80')
    await updateSection(s1.id, { progress: '   ' })
    expect((await db.sections.get(s1.id))?.progress).toBeNull()
  })

  it('refuse une section dans un projet supprimé', async () => {
    const p = await createProject({ name: 'P' })
    await deleteProject(p.id)
    await expectCode(createSection(p.id, 'S'), 'projectDeleted')
  })
})

describe('tâches', () => {
  it('copie projectId depuis la section, active, archivedAt null', async () => {
    const p = await createProject({ name: 'P' })
    const s = await createSection(p.id, 'S')
    const t = await createTask(s.id, ' m. 23-30 ')
    expect(t).toMatchObject({
      projectId: p.id,
      label: 'm. 23-30',
      status: 'active',
      archivedAt: null,
    })
  })

  it('refuse une section inexistante, un projet supprimé ou un libellé vide', async () => {
    await expectCode(createTask('inconnue', 'x'), 'notFound')
    const p = await createProject({ name: 'P' })
    const s = await createSection(p.id, 'S')
    await expectCode(createTask(s.id, ''), 'labelRequired')
    await deleteProject(p.id)
    await expectCode(createTask(s.id, 'x'), 'projectDeleted')
  })

  it('archivée → hors des tâches actives ; réactivée → revient à sa place', async () => {
    const p = await createProject({ name: 'P' })
    const s = await createSection(p.id, 'S')
    const t1 = await createTask(s.id, 'un')
    await createTask(s.id, 'deux')
    await archiveTask(t1.id)
    let [section] = await listSectionsWithTasks(p.id)
    expect(section.activeTasks.map((t) => t.label)).toEqual(['deux'])
    expect(section.archivedTasks.map((t) => t.label)).toEqual(['un'])
    expect((await db.tasks.get(t1.id))?.archivedAt).toEqual(expect.any(Number))
    await reactivateTask(t1.id)
    ;[section] = await listSectionsWithTasks(p.id)
    expect(section.activeTasks.map((t) => t.label)).toEqual(['un', 'deux'])
    expect((await db.tasks.get(t1.id))?.archivedAt).toBeNull()
  })

  it('archivage en série : tout ou rien', async () => {
    const p = await createProject({ name: 'P' })
    const s = await createSection(p.id, 'S')
    const a = await createTask(s.id, 'a')
    const b = await createTask(s.id, 'b')
    await expectCode(archiveTasks([a.id, 'inconnue']), 'notFound')
    expect((await db.tasks.get(a.id))?.status).toBe('active')
    await archiveTasks([a.id, b.id])
    expect((await db.tasks.toArray()).every((t) => t.status === 'archived')).toBe(true)
  })

  it('modifie le libellé ; refuse un libellé vide', async () => {
    const p = await createProject({ name: 'P' })
    const s = await createSection(p.id, 'S')
    const t = await createTask(s.id, 'old')
    await updateTask(t.id, { label: 'new' })
    expect((await db.tasks.get(t.id))?.label).toBe('new')
    await expectCode(updateTask(t.id, { label: ' ' }), 'labelRequired')
  })
})

describe('listActiveTasksGrouped', () => {
  it('groupe projet → section, garde les sections vides, ignore les archivées', async () => {
    const p = await createProject({ name: 'Ballade' })
    const s1 = await createSection(p.id, 'Passages')
    await createSection(p.id, 'Vide')
    await createTask(s1.id, 'a')
    const arch = await createTask(s1.id, 'b')
    await archiveTask(arch.id)
    const [group] = await listActiveTasksGrouped()
    expect(group.color).toBe('c0')
    expect(group.sections.map((x) => [x.section.name, x.tasks.map((t) => t.label)])).toEqual([
      ['Passages', ['a']],
      ['Vide', []],
    ])
  })
})
