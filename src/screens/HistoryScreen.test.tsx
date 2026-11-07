import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProject, createSection, createTask } from '../data/projects'
import {
  addManualEntry,
  endSession,
  getRealTime,
  setSessionTasks,
  startSession,
  startTask,
} from '../data/sessions'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

const T0 = Date.UTC(2026, 10, 9, 17, 30) // lun. 9 nov. 18:30 à Paris
beforeAll(() => vi.stubEnv('TZ', 'Europe/Paris'))
afterAll(() => vi.unstubAllEnvs())
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(T0)
  await clearDb()
})
afterEach(() => vi.useRealTimers())

async function endedSession() {
  const p = await createProject({ name: 'Ballade' })
  const s = await createSection(p.id, 'Passages')
  const t = await createTask(s.id, 'm. 23-30')
  const session = await startSession()
  await setSessionTasks(session.id, [t.id])
  await startTask(session.id, t.id)
  vi.setSystemTime(T0 + 190 * 60_000) // chrono oublié : 3:10
  await endSession(session.id)
  return { t }
}

describe('Historique et correction (4.5)', () => {
  it('accessible depuis Plus ; corriger 3:10 en 0:40 met à jour la session et le temps réel', async () => {
    await endedSession()
    renderApp('/plus')
    await userEvent.click(await screen.findByRole('link', { name: labels.history.link }))
    const card = (await screen.findByText(labels.history.when('lun. 9', '18:30'))).closest(
      'details',
    )!
    expect(card).toHaveTextContent('3:10')
    await userEvent.click(within(card).getByText(labels.history.when('lun. 9', '18:30')))
    const input = within(card).getByLabelText(labels.history.correctLabel('m. 23-30'))
    expect(input).toHaveValue('3:10')
    await userEvent.click(input)
    await userEvent.clear(input)
    await userEvent.type(input, '0:40{Enter}')
    expect(await screen.findByRole('status')).toHaveTextContent(labels.history.correctedToast)
    expect(await within(card).findByText(labels.history.corrected)).toBeInTheDocument()
    await vi.waitFor(() => expect(card.querySelector('summary')).toHaveTextContent('0:40'))
    expect(await getRealTime({ days: ['2026-11-09'] })).toBe(40 * 60)
    expect(card).toHaveAttribute('open')

    await userEvent.click(
      within(card).getByRole('button', { name: labels.history.undoCorrection('m. 23-30') }),
    )
    await vi.waitFor(() => expect(card.querySelector('summary')).toHaveTextContent('3:10'))
    expect(await getRealTime({ days: ['2026-11-09'] })).toBe(190 * 60)
  })

  it('session en cours à part (non corrigeable), ajouts manuels mêlés, du plus récent au plus ancien', async () => {
    const { t } = await endedSession()
    await addManualEntry(t.id, '2026-11-08', 45 * 60)
    vi.setSystemTime(T0 + 24 * 3600_000) // mardi
    await startSession()
    renderApp('/sessions')
    expect(await screen.findByText(labels.history.inProgress)).toBeInTheDocument()
    const titles = screen.getAllByText(/^(lun|dim)\. \d/).map((e) => e.textContent)
    expect(titles).toEqual([labels.history.when('lun. 9', '18:30'), 'dim. 8'])
    expect(screen.getByText(labels.history.manualTag)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/^Durée de/)).toHaveLength(1)
  })

  it('vider ou saisir une durée illisible ne corrige rien', async () => {
    await endedSession()
    renderApp('/sessions')
    const card = (await screen.findByText(labels.history.when('lun. 9', '18:30'))).closest(
      'details',
    )!
    await userEvent.click(within(card).getByText(labels.history.when('lun. 9', '18:30')))
    const input = within(card).getByLabelText(labels.history.correctLabel('m. 23-30'))
    await userEvent.click(input)
    await userEvent.clear(input)
    await userEvent.tab()
    expect(input).toHaveValue('3:10')
    await userEvent.click(input)
    await userEvent.clear(input)
    await userEvent.type(input, 'abc{Enter}')
    expect(await screen.findByRole('status')).toHaveTextContent(labels.duration.invalid)
    expect(within(card).queryByText(labels.history.corrected)).toBeNull()
  })
})
