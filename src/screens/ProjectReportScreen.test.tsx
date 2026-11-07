import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { setSectionWeeks } from '../data/planning'
import {
  archiveTask,
  createProject,
  createSection,
  createTask,
  updateSection,
} from '../data/projects'
import { addManualEntry } from '../data/sessions'
import { setProjectWeekPlan } from '../data/week'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

const H = 3600
beforeAll(() => vi.stubEnv('TZ', 'Europe/Paris'))
afterAll(() => vi.unstubAllEnvs())
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.UTC(2026, 10, 10, 17)) // mardi 10 nov.
  await clearDb()
})
afterEach(() => vi.useRealTimers())

describe('Écran Bilan d’un projet (6.5)', () => {
  it('depuis le détail : tuiles, graphique par semaine, sections dépliables', async () => {
    const p = await createProject({ name: 'Ballade' })
    const s1 = await createSection(p.id, 'Passages')
    const s2 = await createSection(p.id, 'Page 1')
    const a = await createTask(s1.id, 'm. 23-30')
    const b = await createTask(s2.id, 'Lignes')
    await addManualEntry(a.id, '2026-11-03', 1 * H)
    await addManualEntry(b.id, '2026-11-09', 2 * H)
    await setProjectWeekPlan(p.id, '2026-11-09', 1.5 * H)
    await setSectionWeeks(s1.id, ['2026-11-02', '2026-11-09'])
    await updateSection(s1.id, { progress: 'Tempo 80' })
    await archiveTask(a.id)

    const router = renderApp(`/projets/${p.id}`)
    await userEvent.click(await screen.findByRole('link', { name: labels.projects.report }))
    expect(router.state.location.pathname).toBe(`/projets/${p.id}/bilan`)
    expect(await screen.findByText('Ballade')).toBeInTheDocument()
    expect(screen.getByText(labels.report.realTotal).nextSibling).toHaveTextContent('3:00')
    expect(screen.getByText(labels.report.weeksWorked).previousSibling).toHaveTextContent('2')
    expect(screen.getByText(labels.report.tasksActive).previousSibling).toHaveTextContent('1')

    const chart = screen.getByRole('region', { name: labels.report.byWeek })
    expect(chart).toHaveTextContent('Semaine du 9 nov.')
    expect(chart).toHaveTextContent('0:30 au-dessus du prévu')
    await userEvent.click(within(chart).getByRole('button', { name: 'Semaine du 2 nov.' }))
    expect(chart).toHaveTextContent(labels.report.chart.noPlan)

    const sections = screen.getByRole('region', { name: labels.report.bySection })
    const passages = within(sections).getByText('Passages').closest('details')!
    expect(passages).toHaveTextContent(labels.report.sectionReal('1:00'))
    await userEvent.click(within(sections).getByText('Passages'))
    expect(passages).toHaveAttribute('open')
    expect(passages).toHaveTextContent(labels.report.planningLine('2 → 15 nov.', '2 → 15 nov.'))
    expect(passages).toHaveTextContent('Tempo 80')
    expect(passages).toHaveTextContent(labels.day.archived)
  })

  it('projet sans aucune donnée : sections avec « Réel — »', async () => {
    const p = await createProject({ name: 'Déchiffrage' })
    await createSection(p.id, 'Clementi')
    renderApp(`/projets/${p.id}/bilan`)
    expect(await screen.findByText(labels.report.sectionReal('—'))).toBeInTheDocument()
    expect(screen.getByText(labels.report.realTotal).nextSibling).toHaveTextContent('—')
  })
})
