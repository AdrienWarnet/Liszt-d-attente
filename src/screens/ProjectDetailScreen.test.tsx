import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import { createProject, createSection, createTask } from '../data/projects'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

beforeEach(clearDb)

const sectionNames = () => screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))

describe('Détail projet', () => {
  it('sans section : invite à en créer une, aucun champ de tâche', async () => {
    const p = await createProject({ name: 'Ballade' })
    renderApp(`/projets/${p.id}`)
    expect(await screen.findByText(labels.projects.noSection)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(labels.projects.addTask)).toBeNull()
  })

  it('crée 2 sections et 3 tâches à la suite ; tout est conservé dans l’ordre', async () => {
    const p = await createProject({ name: 'Ballade' })
    renderApp(`/projets/${p.id}`)
    const newSection = await screen.findByLabelText(labels.projects.newSection)
    await userEvent.type(newSection, 'Passages à tempo{Enter}')
    await userEvent.type(newSection, 'Page 1{Enter}')
    expect(await screen.findByRole('region', { name: 'Page 1' })).toBeInTheDocument()

    const add = screen.getByLabelText(labels.projects.addTaskLabel('Passages à tempo'))
    await userEvent.type(add, 'm. 23-30{Enter}')
    expect(add).toHaveValue('')
    await userEvent.type(add, 'm. 45-52{Enter}')
    await userEvent.type(
      screen.getByLabelText(labels.projects.addTaskLabel('Page 1')),
      'Lignes 3 et 4{Enter}',
    )
    await screen.findByText('Lignes 3 et 4')

    cleanup() // « recharger »
    renderApp(`/projets/${p.id}`)
    await screen.findByText('Lignes 3 et 4')
    expect(sectionNames()).toEqual(['Passages à tempo', 'Page 1'])
    const first = screen.getByRole('region', { name: 'Passages à tempo' })
    expect(
      within(first)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['m. 23-30', 'm. 45-52'])
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

  it('modifie le libellé d’une tâche sur place ; vide = annulé', async () => {
    const p = await createProject({ name: 'Ballade' })
    const s = await createSection(p.id, 'Page 1')
    const t = await createTask(s.id, 'm. 23')
    renderApp(`/projets/${p.id}`)
    await userEvent.click(
      await screen.findByRole('button', { name: labels.projects.editTask('m. 23') }),
    )
    const input = screen.getByRole('textbox', { name: labels.projects.editTask('m. 23') })
    await userEvent.clear(input)
    await userEvent.type(input, 'm. 23-30{Enter}')
    expect(await screen.findByText('m. 23-30')).toBeInTheDocument()
    expect((await db.tasks.get(t.id))?.label).toBe('m. 23-30')

    await userEvent.click(
      screen.getByRole('button', { name: labels.projects.editTask('m. 23-30') }),
    )
    await userEvent.clear(
      screen.getByRole('textbox', { name: labels.projects.editTask('m. 23-30') }),
    )
    await userEvent.tab()
    expect((await db.tasks.get(t.id))?.label).toBe('m. 23-30')
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
