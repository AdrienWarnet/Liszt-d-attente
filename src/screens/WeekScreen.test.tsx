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
    // Lot 9 : Avancement et ligne du jour disent ce qui reste, ou le dépassement (constat neutre).
    expect(screen.getByText('0:20 au-dessus du budget')).toBeInTheDocument()
    expect(row).toHaveTextContent('Réel 1:20 · 1 tâche · 0:20 au-dessus du budget')
    expect(within(row).queryByText(/tâches/)).toBeNull()
  })

  it('lien vers la revue de semaine', async () => {
    const router = renderApp('/semaine')
    await userEvent.click(await screen.findByRole('link', { name: labels.week.review }))
    expect(router.state.location.pathname).toBe('/revue')
  })
})

describe('Temps prévu par projet', () => {
  async function setup() {
    const a = await createProject({ name: 'Ballade' })
    await createProject({ name: 'Déchiffrage' })
    const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']
    for (const day of days) await db.dailyBudgets.put({ day, durationSec: 6840 }) // 5 × 1:54 = 9:30
    return a
  }
  const total = () => screen.getByTestId('planned-total')

  async function typePlanned(project: string, text: string) {
    const input = await screen.findByLabelText(labels.week.plannedOf(project))
    await userEvent.click(input)
    await userEvent.clear(input)
    if (text) await userEvent.type(input, text)
    await userEvent.tab()
  }

  it('projet sans saisie « — », absent du total ; pas de phrase si total null', async () => {
    await setup()
    renderApp('/semaine')
    expect(await screen.findByLabelText(labels.week.plannedOf('Ballade'))).toHaveValue('')
    expect(total()).toHaveTextContent('—')
    expect(screen.queryByText(/(sous|au-dessus|pile).* de la semaine$/)).toBeNull()
    await typePlanned('Ballade', '4:00')
    await vi.waitFor(() => expect(total()).toHaveTextContent('4:00'))
    expect(screen.getByText('5:30 sous le budget de la semaine')).toBeInTheDocument()
  })

  it('prévu 10:00 pour 9:30 de budget : case et phrase en rouge avec ▲ ; 9:00 : aucun rouge', async () => {
    await setup()
    renderApp('/semaine')
    await typePlanned('Ballade', '6:00')
    await typePlanned('Déchiffrage', '4:00')
    await vi.waitFor(() => expect(total()).toHaveTextContent('10:00'))
    expect(total()).toHaveAttribute('data-over')
    const phrase = screen.getByText('▲ 0:30 au-dessus du budget de la semaine')
    expect(phrase).toHaveClass('text-over')

    await typePlanned('Déchiffrage', '3:00')
    await vi.waitFor(() => expect(total()).toHaveTextContent('9:00'))
    expect(total()).not.toHaveAttribute('data-over')
    expect(document.querySelector('.text-over')).toBeNull()
    expect(screen.getByText('0:30 sous le budget de la semaine')).toBeInTheDocument()
  })

  it('la barre du projet compare son réel à son prévu', async () => {
    const p = await setup()
    const s = await createSection(p.id, 'Page 1')
    const t = await createTask(s.id, 'Lignes')
    await addManualEntry(t.id, '2026-11-10', 3600)
    renderApp('/semaine')
    const input = await screen.findByLabelText(labels.week.plannedOf('Ballade'))
    const row = input.parentElement!
    await vi.waitFor(() => expect(row).toHaveTextContent('Réel 1:00'))
  })
})

describe('Reste sur le budget (lot 9)', () => {
  it('Avancement « Reste 1:30 » et ligne du jour « reste 0:30 »', async () => {
    const p = await createProject({ name: 'Ballade' })
    const s = await createSection(p.id, 'Page 1')
    const t = await createTask(s.id, 'Lignes')
    await db.dailyBudgets.put({ day: '2026-11-09', durationSec: 3600 })
    await db.dailyBudgets.put({ day: '2026-11-10', durationSec: 3600 })
    await addManualEntry(t.id, '2026-11-09', 1800)
    renderApp('/semaine')
    expect(await screen.findByText('Reste 1:30')).toBeInTheDocument()
    const row = await screen.findByRole('button', { name: labels.week.dayDetail('lun. 9 nov.') })
    await vi.waitFor(() => expect(row).toHaveTextContent('Réel 0:30 · reste 0:30'))
    const tuesday = screen.getByRole('button', { name: labels.week.dayDetail('mar. 10 nov.') })
    expect(tuesday).toHaveTextContent('Réel — · reste 1:00')
    const wednesday = screen.getByRole('button', { name: labels.week.dayDetail('mer. 11 nov.') })
    expect(wednesday).not.toHaveTextContent('reste')
  })
})
