import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import { archiveTask, createProject, createSection, createTask } from '../data/projects'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

beforeEach(clearDb)

describe('Détail projet (consultation, lot 5)', () => {
  it('sans section : invite à en ajouter, lien vers l’écran d’édition', async () => {
    const p = await createProject({ name: 'Ballade' })
    const router = renderApp(`/projets/${p.id}`)
    expect(await screen.findByText(labels.projects.noSection)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: labels.editor.fillProject }))
    expect(router.state.location.pathname).toBe(`/projets/${p.id}/modifier`)
  })

  it('affiche sections et tâches dans l’ordre, sans champ de saisie de tâche', async () => {
    const p = await createProject({ name: 'Ballade' })
    const s1 = await createSection(p.id, 'Passages')
    const s2 = await createSection(p.id, 'Page 1')
    await createTask(s1.id, 'm. 23-30')
    await createTask(s1.id, 'm. 45-52')
    await createTask(s2.id, 'Lignes 3 et 4')
    renderApp(`/projets/${p.id}`)
    const first = await screen.findByRole('region', { name: 'Passages' })
    expect(
      within(first)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['m. 23-30', 'm. 45-52'])
    expect(screen.getByRole('region', { name: 'Page 1' })).toHaveTextContent('Lignes 3 et 4')
    expect(screen.queryByPlaceholderText(labels.projects.addTask)).toBeNull()
    expect(screen.getByRole('link', { name: labels.projects.edit })).toHaveAttribute(
      'href',
      `/projets/${p.id}/modifier`,
    )
  })

  it('avancement enregistré à la sortie du champ ; vidé → null', async () => {
    const p = await createProject({ name: 'Ballade' })
    const s = await createSection(p.id, 'Page 1')
    renderApp(`/projets/${p.id}`)
    const field = await screen.findByLabelText(labels.projects.progressLabel('Page 1'))
    await userEvent.type(field, 'Tempo 80')
    await userEvent.tab()
    expect((await db.sections.get(s.id))?.progress).toBe('Tempo 80')
    await userEvent.clear(field)
    await userEvent.tab()
    expect((await db.sections.get(s.id))?.progress).toBeNull()
  })

  it('tâches archivées : compteur et réactivation à leur place', async () => {
    const p = await createProject({ name: 'Ballade' })
    const s = await createSection(p.id, 'Page 1')
    const a = await createTask(s.id, 'Lignes 1 et 2')
    await createTask(s.id, 'Lignes 3 et 4')
    await archiveTask(a.id)
    renderApp(`/projets/${p.id}`)
    const section = await screen.findByRole('region', { name: 'Page 1' })
    await userEvent.click(await within(section).findByText(labels.projects.archivedTasks(1)))
    await userEvent.click(
      within(section).getByRole('button', { name: `${labels.projects.reactivate} Lignes 1 et 2` }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(labels.projects.taskReactivated)
    await within(section).findByText('Lignes 1 et 2', { selector: 'li' })
    expect(
      within(section)
        .getAllByRole('listitem')
        .map((li) => li.textContent)
        .slice(0, 2),
    ).toEqual(['Lignes 1 et 2', 'Lignes 3 et 4'])
  })
})

describe('Supprimer un projet', () => {
  it('Annuler ne change rien', async () => {
    const p = await createProject({ name: 'Sonate' })
    renderApp(`/projets/${p.id}`)
    await userEvent.click(await screen.findByRole('button', { name: labels.projects.delete }))
    const dialog = screen.getByRole('dialog', { name: labels.projects.deleteTitle('Sonate') })
    expect(dialog).toHaveTextContent(labels.projects.deleteText)
    await userEvent.click(within(dialog).getByRole('button', { name: labels.common.cancel }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect((await db.projects.get(p.id))?.deletedAt).toBeNull()
  })

  it('Supprimer ramène à Projets, sans le projet, qui reste en base', async () => {
    const p = await createProject({ name: 'Sonate' })
    const s = await createSection(p.id, 'Mvt 2')
    await createTask(s.id, 'Exposition')
    const router = renderApp(`/projets/${p.id}`)
    await userEvent.click(await screen.findByRole('button', { name: labels.projects.delete }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: labels.projects.delete }))
    expect(await screen.findByRole('status')).toHaveTextContent(labels.projects.deleted)
    expect(router.state.location.pathname).toBe('/projets')
    expect(await screen.findByText(labels.projects.empty)).toBeInTheDocument()
    expect((await db.projects.get(p.id))?.deletedAt).toEqual(expect.any(Number))
    expect(await db.tasks.count()).toBe(1)
  })
})
