import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { createProject, createSection, createTask } from '../data/projects'
import { pauseTask, setSessionTasks, startSession, startTask } from '../data/sessions'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

const T0 = Date.UTC(2026, 10, 9, 17, 42)
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(T0)
  await clearDb()
})
afterEach(() => vi.useRealTimers())

async function runningSession() {
  const p = await createProject({ name: 'Ballade' })
  const s = await createSection(p.id, 'Passages')
  const t = await createTask(s.id, 'm. 23-30 main gauche')
  const session = await startSession()
  await setSessionTasks(session.id, [t.id])
  await startTask(session.id, t.id)
  return { session, t }
}

const banner = () => screen.queryByRole('button', { name: labels.banner.open })

describe('Bandeau de chrono (4.4)', () => {
  it('aucun bandeau sans session en cours', async () => {
    renderApp('/projets')
    await screen.findByRole('heading', { name: labels.tabs.projects })
    expect(banner()).toBeNull()
  })

  it('chrono lancé, dans Projets : tâche et temps qui avance ; absent de l’onglet Session', async () => {
    await runningSession()
    vi.setSystemTime(T0 + 12 * 60_000 + 34_000)
    renderApp('/projets')
    expect(await screen.findByRole('button', { name: labels.banner.open })).toHaveTextContent(
      '● m. 23-30 main gauche0:12:34',
    )
    vi.setSystemTime(T0 + 13 * 60_000)
    await vi.waitFor(() => expect(banner()).toHaveTextContent('0:13:00'), { timeout: 3000 })
  })

  it('⏸ met en pause sans changer d’écran ; « Reprendre » relance la dernière tâche', async () => {
    await runningSession()
    const router = renderApp('/bilan')
    await userEvent.click(await screen.findByRole('button', { name: labels.banner.pause }))
    expect(await screen.findByText(labels.banner.paused)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/bilan')
    expect((await db.timeSegments.toArray()).every((s) => s.endedAt !== null)).toBe(true)
    await userEvent.click(screen.getByRole('button', { name: labels.banner.resume }))
    expect(await screen.findByText('● m. 23-30 main gauche')).toBeInTheDocument()
  })

  it('toucher le bandeau ouvre l’onglet Session', async () => {
    await runningSession()
    await pauseTask()
    const router = renderApp('/semaine')
    await userEvent.click(await screen.findByRole('button', { name: labels.banner.open }))
    expect(router.state.location.pathname).toBe('/')
    expect(banner()).toBeNull()
  })
})
