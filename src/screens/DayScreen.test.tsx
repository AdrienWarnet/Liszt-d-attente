import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { archiveTask, createProject, createSection, createTask } from '../data/projects'
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

const DAY = '2026-11-10'

async function setup() {
  const ballade = await createProject({ name: 'Ballade' })
  const dechiffrage = await createProject({ name: 'Déchiffrage' })
  const s1 = await createSection(ballade.id, 'Passages')
  const s2 = await createSection(dechiffrage.id, 'Clementi')
  const a = await createTask(s1.id, 'm. 23-30')
  const b = await createTask(s1.id, 'm. 45-52')
  const c = await createTask(s2.id, 'Sonatine')
  return { a, b, c }
}

async function planViaSheet(labelsToCheck: string[]) {
  await userEvent.click(screen.getByRole('button', { name: labels.day.planTasks }))
  const sheet = screen.getByRole('dialog', { name: labels.day.planTitle('mar. 10') })
  for (const l of labelsToCheck) {
    await userEvent.click(await within(sheet).findByRole('checkbox', { name: l }))
  }
  await userEvent.click(within(sheet).getByRole('button', { name: labels.common.save }))
}

describe('Vue Jour', () => {
  it('s’ouvre depuis la ligne du jour ; titre, semaine, clavier des jours', async () => {
    const router = renderApp('/semaine')
    await userEvent.click(
      await screen.findByRole('button', { name: labels.week.dayDetail('mar. 10 nov.') }),
    )
    expect(router.state.location.pathname).toBe(`/semaine/jour/${DAY}`)
    expect(screen.getByRole('heading', { name: 'Mardi 10 nov.' })).toBeInTheDocument()
    expect(screen.getByText('Semaine du 9 nov.')).toBeInTheDocument()
    const key = await screen.findByRole('button', { name: labels.day.keyLabel('jeu. 12 nov.') })
    expect(
      screen.getByRole('button', { name: labels.day.keyLabel('mar. 10 nov.') }),
    ).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(key)
    expect(await screen.findByRole('heading', { name: 'Jeudi 12 nov.' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: labels.common.back }))
    expect(router.state.location.pathname).toBe('/semaine')
  })

  it('prévoir une tâche sans durée : listée, total prévu « — » ; groupée par projet', async () => {
    await setup()
    renderApp(`/semaine/jour/${DAY}`)
    expect(await screen.findByText(labels.day.noPlannedTasks)).toBeInTheDocument()
    await planViaSheet(['m. 23-30', 'Sonatine'])
    expect(await screen.findByLabelText(labels.day.plannedOf('m. 23-30'))).toHaveValue('')
    expect(screen.queryByTestId('day-facts')).toBeNull()
    const headers = screen.getAllByText(/^(Ballade|Déchiffrage)$/)
    expect(headers.map((h) => h.textContent)).toEqual(['Ballade', 'Déchiffrage'])
    expect(screen.getByText('Passages')).toBeInTheDocument()
  })

  it('prévu 2:15 pour 1:30 de budget : « ▲ 0:45 au-dessus du budget » en rouge', async () => {
    const { a, b } = await setup()
    await db.dailyBudgets.put({ day: DAY, durationSec: 5400 })
    await db.taskDayPlans.bulkPut([
      { taskId: a.id, day: DAY, durationSec: 3600 },
      { taskId: b.id, day: DAY, durationSec: 4500 },
    ])
    renderApp(`/semaine/jour/${DAY}`)
    const facts = await screen.findByTestId('day-facts')
    expect(facts).toHaveTextContent('Prévu 2:15 · ▲ 0:45 au-dessus du budget')
    expect(within(facts).getByText('▲ 0:45 au-dessus du budget')).toHaveClass('text-over')

    const input = screen.getByLabelText(labels.day.plannedOf('m. 45-52'))
    await userEvent.click(input)
    await userEvent.clear(input)
    await userEvent.type(input, '15{Enter}')
    await vi.waitFor(() =>
      expect(screen.getByTestId('day-facts')).toHaveTextContent('Prévu 1:15 · 0:15 sous le budget'),
    )
    expect(document.querySelector('.text-over')).toBeNull()
  })

  it('retirer une tâche la supprime du jour, pas du projet', async () => {
    const { a } = await setup()
    await db.taskDayPlans.put({ taskId: a.id, day: DAY, durationSec: null })
    renderApp(`/semaine/jour/${DAY}`)
    await userEvent.click(
      await screen.findByRole('button', { name: labels.day.unplan('m. 23-30') }),
    )
    expect(await screen.findByText(labels.day.noPlannedTasks)).toBeInTheDocument()
    expect(await db.tasks.get(a.id)).toBeDefined()
  })

  it('tâche archivée après avoir été prévue : visible « (archivée) », gardée par la feuille', async () => {
    const { a } = await setup()
    await db.taskDayPlans.put({ taskId: a.id, day: DAY, durationSec: null })
    await archiveTask(a.id)
    renderApp(`/semaine/jour/${DAY}`)
    expect(await screen.findByText(labels.day.archived)).toBeInTheDocument()
    await planViaSheet(['Sonatine'])
    await screen.findByLabelText(labels.day.plannedOf('Sonatine'))
    expect(screen.getByLabelText(labels.day.plannedOf('m. 23-30'))).toBeInTheDocument()
    expect(await db.taskDayPlans.where('day').equals(DAY).count()).toBe(2)
  })

  it('le nombre de tâches de la ligne du jour suit les changements', async () => {
    await setup()
    renderApp(`/semaine/jour/${DAY}`)
    await screen.findByText(labels.day.noPlannedTasks)
    await planViaSheet(['m. 23-30', 'm. 45-52'])
    await screen.findByLabelText(labels.day.plannedOf('m. 45-52'))
    await userEvent.click(screen.getByRole('button', { name: labels.common.back }))
    const row = await screen.findByRole('button', { name: labels.week.dayDetail('mar. 10 nov.') })
    await vi.waitFor(() => expect(row).toHaveTextContent('Réel — · 2 tâches'))
  })
})
