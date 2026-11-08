import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { createProject, createSection, createTask } from '../data/projects'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

beforeAll(() => vi.stubEnv('TZ', 'Europe/Paris'))
afterAll(() => vi.unstubAllEnvs())
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.UTC(2026, 10, 9, 17, 42)) // lundi 9 nov. 18:42
  await clearDb()
})
afterEach(() => vi.useRealTimers())

async function setup() {
  const ballade = await createProject({ name: 'Ballade' })
  const dechiffrage = await createProject({ name: 'Déchiffrage' })
  const s1 = await createSection(ballade.id, 'Passages')
  const s2 = await createSection(dechiffrage.id, 'Clementi')
  const a = await createTask(s1.id, 'm. 23-30')
  const b = await createTask(s1.id, 'm. 45-52')
  const c = await createTask(s2.id, 'Sonatine')
  return { ballade, s1, a, b, c }
}

const sheet = () => screen.getByRole('dialog', { name: labels.session.addTasksTitle })

async function startAndOpen() {
  await userEvent.click(
    await screen.findByRole('button', { name: new RegExp(labels.session.start) }),
  )
  return screen.findByRole('dialog', { name: labels.session.addTasksTitle })
}

describe('Démarrer une session (4.2)', () => {
  it('prévu aujourd’hui groupé par projet ; démarrer ouvre la feuille ; session sans tâche possible', async () => {
    const { a, b } = await setup()
    await db.taskDayPlans.bulkPut([
      { taskId: a.id, day: '2026-11-09', durationSec: 3600 },
      { taskId: b.id, day: '2026-11-09', durationSec: null },
    ])
    renderApp('/')
    expect(await screen.findByText('lun. 9 nov.')).toBeInTheDocument()
    expect(await screen.findByText('m. 45-52')).toBeInTheDocument()
    expect(screen.getAllByText('Ballade')).toHaveLength(1)
    expect(screen.getByText('1:00')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: new RegExp(labels.session.start) }))
    await screen.findByRole('dialog', { name: labels.session.addTasksTitle })
    expect(
      await screen.findByRole('dialog', { name: labels.session.addTasksTitle }),
    ).toBeInTheDocument()
    expect(within(sheet()).getByText(labels.session.plannedToday)).toBeInTheDocument()
    await userEvent.click(
      within(sheet()).getByRole('button', { name: labels.session.addToSession }),
    )
    expect(await screen.findByText(labels.session.empty)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: new RegExp(labels.session.start) })).toBeNull()
    expect(await db.sessions.count()).toBe(1)
  })

  it('cocher des tâches les ajoute à la session, groupées par projet', async () => {
    await setup()
    renderApp('/')
    await startAndOpen()
    await userEvent.click(await within(sheet()).findByRole('checkbox', { name: 'm. 23-30' }))
    await userEvent.click(within(sheet()).getByRole('checkbox', { name: 'Sonatine' }))
    await userEvent.click(
      within(sheet()).getByRole('button', { name: labels.session.addToSession }),
    )
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText('Sonatine')).toBeInTheDocument()
    expect(screen.getByText('m. 23-30')).toBeInTheDocument()
    expect(screen.getByText('Déchiffrage')).toBeInTheDocument()
    expect(await db.sessionTasks.count()).toBe(2)
  })

  it('créer une tâche sans section est refusé ; avec section elle apparaît dans la session et le projet', async () => {
    const { ballade } = await setup()
    renderApp('/')
    await startAndOpen()
    await within(sheet()).findByRole('checkbox', { name: 'm. 23-30' })
    await userEvent.type(within(sheet()).getByLabelText(labels.session.newTaskLabel), 'Coda')
    await userEvent.click(
      within(sheet()).getByRole('button', { name: labels.session.addToSession }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(labels.session.chooseSection)
    expect(sheet()).toBeInTheDocument()

    await userEvent.selectOptions(
      within(sheet()).getByLabelText(labels.session.sectionRequired),
      'Passages',
    )
    await userEvent.click(
      within(sheet()).getByRole('button', { name: labels.session.addToSession }),
    )
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText('Coda')).toBeInTheDocument()

    cleanup()
    renderApp(`/projets/${ballade.id}`)
    expect(await screen.findByText('Coda', { selector: 'li' })).toBeInTheDocument()
  })

  it('la feuille se rouvre avec les tâches déjà dans la session cochées', async () => {
    await setup()
    renderApp('/')
    await startAndOpen()
    await userEvent.click(await within(sheet()).findByRole('checkbox', { name: 'm. 23-30' }))
    await userEvent.click(
      within(sheet()).getByRole('button', { name: labels.session.addToSession }),
    )
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await userEvent.click(await screen.findByRole('button', { name: labels.session.addTasks }))
    await screen.findByRole('dialog', { name: labels.session.addTasksTitle })
    const box = await within(sheet()).findByRole('checkbox', { name: /m\. 23-30/ })
    expect(box).toBeChecked()
    expect(box).toBeDisabled() // lot 6 : la feuille ne fait qu'ajouter
    expect(within(sheet()).getByText(labels.session.alreadyIn)).toBeInTheDocument()
  })
})

describe('Session en cours (4.3)', () => {
  async function running() {
    const { a, b } = await setup()
    const { startSession, setSessionTasks } = await import('../data/sessions')
    const s = await startSession()
    await setSessionTasks(s.id, [a.id, b.id])
    return s
  }
  const row = (label: string) => screen.getByText(label).closest('div.relative') as HTMLElement
  const at = (min: number) => vi.setSystemTime(Date.UTC(2026, 10, 9, 17, 42 + min))

  it('lancer A, attendre, lancer B : A s’arrête, B tourne ; durées en h:mm:ss', async () => {
    await running()
    renderApp('/')
    expect(await screen.findByText(labels.session.startedAt('18:42'))).toBeInTheDocument()
    expect(screen.getByText(labels.session.taskCount(2))).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: labels.session.play('m. 23-30') }))
    expect(
      await screen.findByRole('button', { name: labels.session.pause('m. 23-30') }),
    ).toBeInTheDocument()
    at(10)
    await userEvent.click(screen.getByRole('button', { name: labels.session.play('m. 45-52') }))
    expect(
      await screen.findByRole('button', { name: labels.session.pause('m. 45-52') }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: labels.session.play('m. 23-30') }),
    ).toBeInTheDocument()
    at(12)
    await vi.waitFor(() => expect(row('m. 45-52')).toHaveTextContent('0:02:00'), { timeout: 3000 })
    expect(row('m. 23-30')).toHaveTextContent('0:10:00')
    expect(row('m. 45-52')).toHaveAttribute('data-running')
    expect(screen.getByLabelText(labels.session.total)).toHaveTextContent('0:12:00')
    expect((await db.timeSegments.toArray()).filter((s) => s.endedAt === null)).toHaveLength(1)
  })

  it('écran verrouillé 2 min, app fermée puis rouverte : le chrono a avancé de 2 min', async () => {
    await running()
    renderApp('/')
    await userEvent.click(
      await screen.findByRole('button', { name: labels.session.play('m. 23-30') }),
    )
    await screen.findByRole('button', { name: labels.session.pause('m. 23-30') })
    cleanup() // l'app est tuée
    at(2)
    renderApp('/')
    await vi.waitFor(() => expect(row('m. 23-30')).toHaveTextContent('0:02:00'))
    expect(
      screen.getByRole('button', { name: labels.session.pause('m. 23-30') }),
    ).toBeInTheDocument()
  })

  it('pause, puis terminer : confirmation avec la durée, chrono fermé, message', async () => {
    await running()
    renderApp('/')
    await userEvent.click(
      await screen.findByRole('button', { name: labels.session.play('m. 23-30') }),
    )
    await screen.findByRole('button', { name: labels.session.pause('m. 23-30') })
    at(72)
    await userEvent.click(screen.getByRole('button', { name: labels.session.end }))
    const confirm = screen.getByRole('dialog', { name: labels.session.endTitle })
    await vi.waitFor(() => expect(confirm).toHaveTextContent(labels.session.endText('1:12')))
    await userEvent.click(within(confirm).getByRole('button', { name: labels.session.endConfirm }))
    expect(await screen.findByRole('status')).toHaveTextContent(labels.session.saved)
    expect(
      await screen.findByRole('button', { name: new RegExp(labels.session.start) }),
    ).toBeInTheDocument()
    expect((await db.timeSegments.toArray()).every((s) => s.endedAt !== null)).toBe(true)
    expect((await db.sessions.toArray())[0].endedAt).not.toBeNull()
  })
})

describe('Session : ajout seul, retrait à 0:00:00, prévu par tâche (lot 6)', () => {
  it('✕ retire une tâche jamais lancée ; pas de ✕ dès qu’elle a du temps', async () => {
    const { a, b } = await setup()
    const { startSession, setSessionTasks } = await import('../data/sessions')
    const s = await startSession()
    await setSessionTasks(s.id, [a.id, b.id])
    renderApp('/')
    await userEvent.click(
      await screen.findByRole('button', { name: labels.session.play('m. 23-30') }),
    )
    await screen.findByRole('button', { name: labels.session.pause('m. 23-30') })
    expect(screen.queryByRole('button', { name: labels.session.removeTask('m. 23-30') })).toBeNull()
    await userEvent.click(
      screen.getByRole('button', { name: labels.session.removeTask('m. 45-52') }),
    )
    await vi.waitFor(() => expect(screen.queryByText('m. 45-52')).toBeNull())
    expect((await db.sessionTasks.toArray()).map((x) => x.taskId)).toEqual([a.id])
  })

  it('affiche le temps prévu du jour et le reste sous la tâche', async () => {
    const { a, b } = await setup()
    await db.taskDayPlans.put({ taskId: a.id, day: '2026-11-09', durationSec: 3600 })
    const { startSession, setSessionTasks, startTask } = await import('../data/sessions')
    const s = await startSession()
    await setSessionTasks(s.id, [a.id, b.id])
    await startTask(s.id, a.id)
    vi.setSystemTime(Date.UTC(2026, 10, 9, 17, 42 + 45))
    renderApp('/')
    const line = await screen.findByTestId('planned-line')
    await vi.waitFor(() => expect(line).toHaveTextContent('prévu 1:00 · reste 0:15'))
    expect(screen.getAllByTestId('planned-line')).toHaveLength(1) // m. 45-52 n'a pas de prévu
    vi.setSystemTime(Date.UTC(2026, 10, 9, 17, 42 + 70))
    await vi.waitFor(
      () =>
        expect(screen.getByTestId('planned-line')).toHaveTextContent(
          'prévu 1:00 · 0:10 au-dessus du prévu',
        ),
      { timeout: 3000 },
    )
  })
})
