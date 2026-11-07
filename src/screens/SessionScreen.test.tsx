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
    expect(
      await screen.findByRole('button', { name: labels.projects.editTask('Coda') }),
    ).toBeInTheDocument()
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
    expect(await within(sheet()).findByRole('checkbox', { name: 'm. 23-30' })).toBeChecked()
  })
})
