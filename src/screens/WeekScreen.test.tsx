import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { createProject, createSection, createTask } from '../data/projects'
import { addManualEntry } from '../data/sessions'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

beforeAll(() => vi.stubEnv('TZ', 'Europe/Paris'))
afterAll(() => vi.unstubAllEnvs())
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.UTC(2026, 10, 9, 17)) // lundi 9 nov. 18:00
  await clearDb()
})
afterEach(() => vi.useRealTimers())

const budgetInput = (day: string) => screen.getByLabelText(labels.week.budgetOf(day))
const weekTotal = () =>
  screen.getByText(labels.week.weekBudget).parentElement!.querySelector('span')!.textContent

async function typeBudget(day: string, text: string) {
  const input = await screen.findByLabelText(labels.week.budgetOf(day))
  await userEvent.click(input)
  await userEvent.clear(input)
  if (text) await userEvent.type(input, text)
  await userEvent.tab()
}

describe('Onglet Semaine', () => {
  it('budget : « 1:30 » lundi → total 1:30 ; vidé → « — » ; « 0 » → 0:00', async () => {
    renderApp('/semaine')
    expect(await screen.findByText('Semaine du 9 nov.')).toBeInTheDocument()
    expect(await screen.findByText(labels.week.enterBudget)).toBeInTheDocument()
    expect(weekTotal()).toBe('—')

    await typeBudget('lun. 9 nov.', '1:30')
    await vi.waitFor(() => expect(weekTotal()).toBe('1:30'))
    expect(budgetInput('lun. 9 nov.')).toHaveValue('1:30')

    await typeBudget('lun. 9 nov.', '')
    await vi.waitFor(() => expect(weekTotal()).toBe('—'))
    expect(await db.dailyBudgets.count()).toBe(0)

    await typeBudget('mar. 10 nov.', '0')
    await vi.waitFor(() => expect(weekTotal()).toBe('0:00'))
  })

  it('saisie illisible refusée avec un message ; la valeur précédente revient', async () => {
    renderApp('/semaine')
    await screen.findByText('Semaine du 9 nov.')
    await typeBudget('lun. 9 nov.', '90')
    await vi.waitFor(() => expect(weekTotal()).toBe('1:30'))
    await typeBudget('lun. 9 nov.', 'abc')
    expect(await screen.findByRole('status')).toHaveTextContent(labels.duration.invalid)
    expect(budgetInput('lun. 9 nov.')).toHaveValue('1:30')
  })

  it('navigation sur 3 semaines en arrière et retour : chaque semaine garde ses valeurs', async () => {
    renderApp('/semaine')
    await screen.findByText('Semaine du 9 nov.')
    await typeBudget('lun. 9 nov.', '1:00')
    for (const [label, day] of [
      ['Semaine du 2 nov.', 'lun. 2 nov.'],
      ['Semaine du 26 oct.', 'lun. 26 oct.'],
      ['Semaine du 19 oct.', 'lun. 19 oct.'],
    ]) {
      await userEvent.click(screen.getByRole('button', { name: labels.week.previous }))
      expect(await screen.findByText(label)).toBeInTheDocument()
      await typeBudget(day, '0:45')
    }
    for (const label of ['Semaine du 26 oct.', 'Semaine du 2 nov.', 'Semaine du 9 nov.']) {
      await userEvent.click(screen.getByRole('button', { name: labels.week.next }))
      await screen.findByText(label)
    }
    await vi.waitFor(() => expect(weekTotal()).toBe('1:00'))
    await userEvent.click(screen.getByRole('button', { name: labels.week.previous }))
    await vi.waitFor(() => expect(weekTotal()).toBe('0:45'))
  })

  it('jour courant repéré, réel et tâches prévues sur la ligne, aucun rouge si le réel dépasse', async () => {
    const p = await createProject({ name: 'Ballade' })
    const s = await createSection(p.id, 'Page 1')
    const t = await createTask(s.id, 'Lignes 3 et 4')
    await addManualEntry(t.id, '2026-11-09', 80 * 60)
    await db.dailyBudgets.put({ day: '2026-11-09', durationSec: 3600 })
    await db.taskDayPlans.put({ taskId: t.id, day: '2026-11-09', durationSec: null })
    renderApp('/semaine')
    const row = await screen.findByRole('button', { name: labels.week.dayDetail('lun. 9 nov.') })
    await vi.waitFor(() => expect(row).toHaveTextContent('Réel 1:20 · 1 tâche'))
    expect(row).toHaveTextContent(labels.week.today)
    expect(row.querySelector('[data-over]')).not.toBeNull() // barre `ink`
    expect(document.querySelector('.text-over, .bg-over, .bg-over-soft')).toBeNull()
    expect(screen.getByText(labels.week.real('0:20 au-dessus du budget'))).toBeInTheDocument()
    expect(within(row).queryByText(/tâches/)).toBeNull()
  })

  it('lien vers la revue de semaine', async () => {
    const router = renderApp('/semaine')
    await userEvent.click(await screen.findByRole('link', { name: labels.week.review }))
    expect(router.state.location.pathname).toBe('/revue')
  })
})
