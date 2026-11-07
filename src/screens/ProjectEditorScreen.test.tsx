import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { createProject, createSection, createTask, listSectionsWithTasks } from '../data/projects'
import { addManualEntry } from '../data/sessions'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

beforeEach(clearDb)

const save = () => screen.getByRole('button', { name: labels.common.save })
const structure = async (projectId: string) =>
  (await listSectionsWithTasks(projectId)).map((s) => [
    s.section.name,
    s.activeTasks.map((t) => t.label),
    s.archivedTasks.map((t) => t.label),
  ])

describe('Créer un projet avec ses sections et tâches (lot 5)', () => {
  it('« + Nouveau projet » ouvre l’éditeur ; plusieurs sections et tâches ; rien en base avant Enregistrer', async () => {
    const router = renderApp('/projets')
    await userEvent.click(await screen.findByRole('link', { name: labels.projects.newProject }))
    expect(router.state.location.pathname).toBe('/projets/nouveau')
    expect(save()).toBeDisabled()

    await userEvent.type(screen.getByLabelText(labels.projects.name), 'Ballade n°1')
    const section1 = screen.getByRole('region', { name: labels.editor.sectionLabel(1) })
    await userEvent.type(
      within(section1).getByLabelText(labels.editor.sectionName),
      'Passages à tempo{Enter}',
    )
    // Entrée dans une tâche ajoute la ligne suivante : on enchaîne au clavier.
    await userEvent.keyboard('m. 23-30{Enter}m. 45-52{Enter}Coda')
    await userEvent.click(screen.getByRole('button', { name: labels.editor.addSection }))
    const section2 = screen.getByRole('region', { name: labels.editor.sectionLabel(2) })
    await userEvent.keyboard('Page 1{Enter}Lignes 3 et 4')
    expect(within(section2).getByLabelText(labels.editor.taskLabel('Page 1', 1))).toHaveValue(
      'Lignes 3 et 4',
    )
    expect(await db.projects.count()).toBe(0)

    await userEvent.click(save())
    expect(await screen.findByRole('status')).toHaveTextContent(labels.editor.saved)
    const [project] = await db.projects.toArray()
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/projets/${project.id}`))
    expect(await structure(project.id)).toEqual([
      ['Passages à tempo', ['m. 23-30', 'm. 45-52', 'Coda'], []],
      ['Page 1', ['Lignes 3 et 4'], []],
    ])
    expect(await screen.findByRole('region', { name: 'Passages à tempo' })).toHaveTextContent(
      'Coda',
    )
  })

  it('section sans nom avec des tâches : message, rien n’est créé ; fin avant début : erreur sous le champ', async () => {
    renderApp('/projets/nouveau')
    await userEvent.type(await screen.findByLabelText(labels.projects.name), 'X')
    await userEvent.type(screen.getByLabelText(labels.editor.taskLabel('', 1)), 'une tâche')
    await userEvent.click(save())
    expect(await screen.findByRole('status')).toHaveTextContent(labels.editor.sectionNameRequired)
    await userEvent.type(screen.getByLabelText(labels.projects.startDate), '2026-11-10')
    await userEvent.type(screen.getByLabelText(labels.projects.endDate), '2026-11-09')
    await userEvent.click(save())
    expect(await screen.findByRole('alert')).toHaveTextContent(labels.errors.endBeforeStart)
    expect(await db.projects.count()).toBe(0)
  })

  it('Annuler avec des modifications : confirmation ; Abandonner revient sans rien créer', async () => {
    const router = renderApp('/projets')
    await userEvent.click(await screen.findByRole('link', { name: labels.projects.newProject }))
    await userEvent.type(screen.getByLabelText(labels.projects.name), 'Brouillon')
    await userEvent.click(screen.getByRole('button', { name: labels.common.cancel }))
    const dialog = screen.getByRole('dialog', { name: labels.editor.discardTitle })
    await userEvent.click(within(dialog).getByRole('button', { name: labels.editor.discard }))
    expect(router.state.location.pathname).toBe('/projets')
    expect(await db.projects.count()).toBe(0)
  })
})

describe('Modifier un projet (lot 5)', () => {
  async function existing() {
    const p = await createProject({ name: 'Ballade' })
    const s1 = await createSection(p.id, 'Passages')
    const s2 = await createSection(p.id, 'Page 1')
    const a = await createTask(s1.id, 'm. 23-30')
    await createTask(s1.id, 'm. 45-52')
    await createTask(s2.id, 'Lignes')
    return { p, a }
  }

  it('renomme, ajoute, archive ; retirer puis rétablir ; Enregistrer applique tout d’un coup', async () => {
    const { p } = await existing()
    const router = renderApp(`/projets/${p.id}`)
    await userEvent.click(await screen.findByRole('link', { name: labels.projects.edit }))
    expect(router.state.location.pathname).toBe(`/projets/${p.id}/modifier`)
    const first = await screen.findByRole('region', { name: labels.editor.sectionLabel(1) })
    const label1 = within(first).getByLabelText(labels.editor.taskLabel('Passages', 1))
    expect(label1).toHaveValue('m. 23-30')
    await userEvent.clear(label1)
    await userEvent.type(label1, 'm. 23-30 main gauche')
    await userEvent.click(
      within(first).getByRole('button', { name: labels.editor.archiveTaskLabel('m. 45-52') }),
    )
    expect(within(first).getByText(`(${labels.editor.taskArchived})`)).toBeInTheDocument()
    await userEvent.click(within(first).getByRole('button', { name: labels.editor.addTask }))
    await userEvent.keyboard('Coda')

    const second = screen.getByRole('region', { name: labels.editor.sectionLabel(2) })
    await userEvent.click(
      within(second).getByRole('button', { name: labels.editor.removeTask('Lignes') }),
    )
    expect(within(second).getByText(`(${labels.editor.taskRemoved})`)).toBeInTheDocument()
    await userEvent.click(
      within(second).getByRole('button', { name: labels.editor.restoreLabel('Lignes') }),
    )
    await userEvent.click(
      within(second).getByRole('button', { name: labels.editor.removeSectionLabel('Page 1') }),
    )
    expect(screen.getByText(labels.editor.sectionRemoved('Page 1'))).toBeInTheDocument()

    expect(await structure(p.id)).toEqual([
      ['Passages', ['m. 23-30', 'm. 45-52'], []],
      ['Page 1', ['Lignes'], []],
    ])
    await userEvent.click(save())
    expect(await screen.findByRole('status')).toHaveTextContent(labels.editor.saved)
    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/projets/${p.id}`))
    expect(await structure(p.id)).toEqual([
      ['Passages', ['m. 23-30 main gauche', 'Coda'], ['m. 45-52']],
    ])
  })

  it('retirer une tâche qui a du temps : message, rien n’est enregistré', async () => {
    const { p, a } = await existing()
    await addManualEntry(a.id, '2026-11-09', 600)
    renderApp(`/projets/${p.id}/modifier`)
    const first = await screen.findByRole('region', { name: labels.editor.sectionLabel(1) })
    await userEvent.click(
      within(first).getByRole('button', { name: labels.editor.removeTask('m. 23-30') }),
    )
    await userEvent.click(save())
    expect(await screen.findByRole('status')).toHaveTextContent(
      labels.editor.hasTime('« m. 23-30 »'),
    )
    expect((await structure(p.id))[0][1]).toEqual(['m. 23-30', 'm. 45-52'])
  })
})
