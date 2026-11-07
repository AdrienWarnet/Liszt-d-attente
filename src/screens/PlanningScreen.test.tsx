import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject, createSection } from '../data/projects'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

beforeAll(() => vi.stubEnv('TZ', 'Europe/Paris'))
afterAll(() => vi.unstubAllEnvs())
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.UTC(2026, 10, 10, 12)) // mardi 10 nov.
  await clearDb()
})
afterEach(() => vi.useRealTimers())

const W1 = 'Semaine du 9 nov.'
const W2 = 'Semaine du 16 nov.'
const W3 = 'Semaine du 23 nov.'
const revised = (week: string, placed: boolean) =>
  screen.getByRole('button', { name: labels.planning.cell('Passages', week, placed) })
const initial = (week: string, placed: boolean) =>
  screen.getByRole('img', { name: labels.planning.initialCell('Passages', week, placed) })

async function open() {
  const p = await createProject({ name: 'Ballade' })
  await createSection(p.id, 'Passages')
  renderApp(`/projets/${p.id}`)
  await userEvent.click(await screen.findByRole('link', { name: labels.projects.planning }))
  await screen.findByRole('heading', { name: labels.planning.title })
  return p
}

describe('Écran Planning (5.2)', () => {
  it('section jamais placée : une ligne « à placer » ; premier toucher = prévu initial (message)', async () => {
    await open()
    expect(await screen.findByText(labels.planning.rowToPlace)).toBeInTheDocument()
    expect(screen.getByText('Ballade')).toBeInTheDocument()
    await userEvent.click(revised(W1, false))
    expect(await screen.findByRole('status')).toHaveTextContent(labels.planning.firstPlacement)
    expect(await screen.findByText(labels.planning.rowInitial)).toBeInTheDocument()
    expect(initial(W1, true)).toBeInTheDocument()
  })

  it('placer 2 semaines, recharger : initial et revu les affichent ; décaler : initial fixe, « modifié »', async () => {
    const p = await open()
    await userEvent.click(
      await screen.findByRole('button', { name: labels.planning.cell('Passages', W1, false) }),
    )
    await screen.findByText(labels.planning.rowInitial) // la ligne « à placer » est devenue initial + revu
    await userEvent.click(
      await screen.findByRole('button', { name: labels.planning.cell('Passages', W2, false) }),
    )
    await screen.findByRole('button', { name: labels.planning.cell('Passages', W2, true) })
    expect(screen.queryByText(labels.planning.changed)).toBeInTheDocument() // revu [S1,S2] ≠ initial [S1]

    cleanup()
    renderApp(`/projets/${p.id}/planning`)
    await screen.findByRole('button', { name: labels.planning.cell('Passages', W2, true) })
    expect(initial(W1, true)).toBeInTheDocument()
    expect(initial(W2, false)).toBeInTheDocument()

    await userEvent.click(revised(W1, true))
    await userEvent.click(revised(W3, false))
    await screen.findByRole('button', { name: labels.planning.cell('Passages', W3, true) })
    expect(initial(W1, true)).toBeInTheDocument()
    expect(revised(W1, false)).toBeInTheDocument()
    expect(screen.getByText(labels.planning.changed)).toBeInTheDocument()
  })

  it('les cases du prévu initial ne réagissent pas au toucher', async () => {
    await open()
    await userEvent.click(
      await screen.findByRole('button', { name: labels.planning.cell('Passages', W1, false) }),
    )
    await screen.findByText(labels.planning.rowInitial)
    await userEvent.click(initial(W2, false))
    expect(initial(W2, false)).toBeInTheDocument()
    expect(revised(W2, false)).toBeInTheDocument()
  })

  it('semaine courante en vert ; avancement modifiable sous la grille', async () => {
    await open()
    expect((await screen.findByText('9 nov')).className).toContain('text-felt')
    expect(screen.getByLabelText(labels.projects.progressLabel('Passages'))).toHaveAttribute(
      'placeholder',
      labels.planning.progressPlaceholder,
    )
  })
})
