import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createProject, createSection, createTask } from '../data/projects'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

beforeEach(clearDb)

describe('Projets', () => {
  it('état vide : message et bouton « + Nouveau projet »', async () => {
    renderApp('/projets')
    expect(await screen.findByText(labels.projects.empty)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: labels.projects.newProject })).toHaveAttribute(
      'href',
      '/projets/nouveau',
    )
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
})
