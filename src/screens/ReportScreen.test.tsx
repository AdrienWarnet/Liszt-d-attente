import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setSectionWeeks } from '../data/planning'
import {
  archiveTask,
  createProject,
  createSection,
  createTask,
  deleteProject,
} from '../data/projects'
import { addManualEntry, startSession, startTask } from '../data/sessions'
import { setDailyBudget, setProjectWeekPlan } from '../data/week'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

const H = 3600
const WEEK = '2026-11-09'
const T0 = Date.UTC(2026, 10, 10, 17) // mardi 10 nov. 18:00

beforeAll(() => vi.stubEnv('TZ', 'Europe/Paris'))
afterAll(() => vi.unstubAllEnvs())
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(T0)
  await clearDb()
})
afterEach(() => vi.useRealTimers())

async function setup() {
  const ballade = await createProject({ name: 'Ballade' })
  const sonate = await createProject({ name: 'Sonate' })
  const s1 = await createSection(ballade.id, 'Passages')
  const s2 = await createSection(sonate.id, 'Mvt 2')
  const a = await createTask(s1.id, 'm. 23-30')
  const b = await createTask(s1.id, 'Coda')
  const c = await createTask(s2.id, 'Exposition')
  await setDailyBudget(WEEK, 1.5 * H)
  await setDailyBudget('2026-11-10', 1 * H)
  await addManualEntry(a.id, WEEK, 2 * H)
  await addManualEntry(b.id, '2026-11-10', 1 * H)
  await addManualEntry(c.id, '2026-11-10', 1 * H)
  await setProjectWeekPlan(ballade.id, WEEK, 4 * H)
  await archiveTask(b.id)
  await deleteProject(sonate.id)
  await setSectionWeeks(s1.id, [WEEK])
  return { ballade, a }
}

const panel = (name: string) => screen.getByRole('region', { name })

describe('Écran Bilan hebdo (6.4)', () => {
  it('semaine vide : message, pas de tableau de bord', async () => {
    renderApp('/bilan')
    expect(await screen.findByText(labels.report.empty)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: labels.report.byDay })).toBeNull()
  })

  it('tuiles, phrase d’écart, aucun « 0:00 » pour une valeur non saisie, aucun rouge', async () => {
    await setup()
    renderApp('/bilan')
    expect(
      await screen.findByText(labels.report.realGap('1:30 au-dessus du budget')),
    ).toBeInTheDocument()
    expect(screen.getByText(labels.report.plannedProjects).nextSibling).toHaveTextContent('4:00')
    expect(
      screen.getByText(labels.report.budget, { selector: 'span.block' }).nextSibling,
    ).toHaveTextContent('2:30')
    expect(document.querySelector('.text-over, .bg-over, .bg-over-soft')).toBeNull()
  })

  it('graphique par jour : aujourd’hui sélectionné ; toucher lundi change l’encart', async () => {
    await setup()
    renderApp('/bilan')
    const chart = await screen.findByRole('region', { name: labels.report.byDay })
    expect(within(chart).getByText('mar. 10 nov.')).toBeInTheDocument()
    expect(chart).toHaveTextContent('1:00 au-dessus du budget')
    await userEvent.click(within(chart).getByRole('button', { name: 'lun. 9 nov.' }))
    expect(within(chart).getByRole('button', { name: 'lun. 9 nov.' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(chart).toHaveTextContent('0:30 au-dessus du budget')
    await userEvent.click(within(chart).getByRole('button', { name: 'mer. 11 nov.' }))
    expect(chart).toHaveTextContent(labels.report.chart.noBudget)
  })

  it('par projet : répartition, % du prévu, supprimé, archivée, sections et tâches repliées', async () => {
    await setup()
    renderApp('/bilan')
    const byProject = await screen.findByRole('region', { name: labels.report.byProject })
    expect(byProject).toHaveTextContent('Ballade 75 %')
    expect(byProject).toHaveTextContent('Sonate 25 %')
    const [ballade, sonate] = within(byProject).getAllByTestId('report-project')
    expect(ballade).toHaveTextContent('3:00 / 4:00 prévu')
    expect(ballade).toHaveTextContent(labels.report.plannedPct(75))
    expect(sonate).toHaveTextContent(labels.day.deleted)
    expect(sonate).toHaveTextContent(labels.report.noProjectPlan)
    expect(within(sonate).queryByRole('link', { name: labels.report.projectReport })).toBeNull()
    const tasks = within(ballade).getByText(labels.report.seeTasks(2)).closest('details')!
    expect(tasks).not.toHaveAttribute('open')
    await userEvent.click(within(ballade).getByText(labels.report.seeTasks(2)))
    expect(tasks).toHaveAttribute('open')
    expect(within(tasks).getByText(labels.day.archived)).toBeInTheDocument()
    expect(tasks).toHaveTextContent('m. 23-30Passages2:00')
  })

  it('chrono en cours : réel en direct, le bloc ouvert le reste après 10 s', async () => {
    const { a } = await setup()
    const s = await startSession()
    await startTask(s.id, a.id)
    renderApp('/bilan')
    expect(await screen.findByText(/La session en cours est comptée en direct/)).toBeInTheDocument()
    const byProject = panel(labels.report.byProject)
    const [ballade] = within(byProject).getAllByTestId('report-project')
    await userEvent.click(within(ballade).getByText(labels.report.seeTasks(2)))
    vi.setSystemTime(T0 + 30 * 60_000)
    await vi.waitFor(
      () =>
        expect(within(byProject).getAllByTestId('report-project')[0]).toHaveTextContent(
          '3:30 / 4:00 prévu',
        ),
      { timeout: 8000 },
    )
    expect(within(ballade).getByText(labels.report.seeTasks(2)).closest('details')).toHaveAttribute(
      'open',
    )
  }, 15000)

  it('planning de la semaine et lien vers le bilan du projet', async () => {
    const { ballade } = await setup()
    renderApp('/bilan')
    const planning = await screen.findByRole('region', { name: labels.report.planningOfWeek })
    expect(planning).toHaveTextContent(`Passages${labels.report.inInitial}`)
    expect(screen.getByRole('link', { name: labels.report.projectReport })).toHaveAttribute(
      'href',
      `/projets/${ballade.id}/bilan`,
    )
  })
})
