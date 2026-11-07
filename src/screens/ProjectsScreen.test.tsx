import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import { createProject, createSection, createTask } from '../data/projects'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

beforeEach(clearDb)

const dialog = () => screen.getByRole('dialog')
const save = () => within(dialog()).getByRole('button', { name: labels.common.save })

describe('Projets', () => {
  it('état vide puis création sans date : la carte n’affiche aucune date', async () => {
    const router = renderApp('/projets')
    expect(await screen.findByText(labels.projects.empty)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: labels.projects.newProject }))
    expect(save()).toBeDisabled()
    await userEvent.type(screen.getByLabelText(labels.projects.name), 'Déchiffrage')
    expect(save()).toBeEnabled()
    await userEvent.click(save())

    // Ouvre le détail du projet créé.
    expect(await screen.findByRole('heading', { name: 'Déchiffrage' })).toBeInTheDocument()
    expect(screen.getByText(labels.projects.noStart)).toBeInTheDocument()
    const [project] = await db.projects.toArray()
    expect(project).toMatchObject({ startDate: null, endDate: null })
    expect(router.state.location.pathname).toBe(`/projets/${project.id}`)

    await userEvent.click(screen.getByRole('button', { name: labels.common.back }))
    const card = await screen.findByRole('link', { name: /Déchiffrage/ })
    expect(card).toHaveTextContent('Déchiffrage0 tâche active')
    expect(card.textContent).not.toMatch(/1970|depuis/)
  })

  it('affiche les dates et le nombre de tâches actives, et ouvre le détail', async () => {
    const p = await createProject({
      name: 'Ballade n°1',
      startDate: '2026-11-03',
      endDate: '2026-12-20',
    })
    const s = await createSection(p.id, 'Page 1')
    await createTask(s.id, 'a')
    await createTask(s.id, 'b')
    const router = renderApp('/projets')
    const card = await screen.findByRole('link', { name: /Ballade/ })
    expect(card).toHaveTextContent("depuis le 3 nov. · jusqu'au 20 déc. · 2 tâches actives")
    await userEvent.click(card)
    expect(router.state.location.pathname).toBe(`/projets/${p.id}`)
    expect(screen.getByText("Depuis le 3 nov. · jusqu'au 20 déc.")).toBeInTheDocument()
  })

  it('erreur sous le champ si la fin est avant le début', async () => {
    renderApp('/projets')
    await userEvent.click(await screen.findByRole('button', { name: labels.projects.newProject }))
    await userEvent.type(screen.getByLabelText(labels.projects.name), 'X')
    await userEvent.type(screen.getByLabelText(labels.projects.startDate), '2026-11-10')
    await userEvent.type(screen.getByLabelText(labels.projects.endDate), '2026-11-09')
    await userEvent.click(save())
    expect(await screen.findByRole('alert')).toHaveTextContent(labels.errors.endBeforeStart)
    expect(await db.projects.count()).toBe(0)
  })

  it('Modifier rouvre la feuille préremplie ; vider une date l’enregistre à null', async () => {
    const p = await createProject({ name: 'Ballade', startDate: '2026-11-03' })
    renderApp(`/projets/${p.id}`)
    await userEvent.click(await screen.findByRole('button', { name: labels.projects.edit }))
    expect(screen.getByLabelText(labels.projects.name)).toHaveValue('Ballade')
    await userEvent.clear(screen.getByLabelText(labels.projects.startDate))
    await userEvent.click(save())
    expect(await screen.findByText(labels.projects.noStart)).toBeInTheDocument()
    expect((await db.projects.get(p.id))?.startDate).toBeNull()
  })
})
