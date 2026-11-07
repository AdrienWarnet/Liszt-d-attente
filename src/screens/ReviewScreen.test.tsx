import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { today } from '../data/dates'
import { db } from '../data/db'
import { createProject, createSection, createTask } from '../data/projects'
import { addManualEntry } from '../data/sessions'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

beforeEach(clearDb)

async function setup() {
  const p = await createProject({ name: 'Ballade' })
  const s = await createSection(p.id, 'Passages à tempo')
  const tasks = []
  for (const label of ['m. 23-30', 'm. 45-52', 'Coda', 'Intro'])
    tasks.push(await createTask(s.id, label))
  return { p, s, tasks }
}

describe('Revue de semaine', () => {
  it('accessible depuis Projets ; affiche le temps réel de la semaine à droite', async () => {
    const { tasks } = await setup()
    await addManualEntry(tasks[0].id, today(), 45 * 60)
    renderApp('/projets')
    await userEvent.click(await screen.findByRole('link', { name: labels.projects.reviewLink }))
    const row = (await screen.findByText('m. 23-30')).closest('label')!
    expect(await within(row).findByText('0:45')).toBeInTheDocument()
    expect(within(screen.getByText('Coda').closest('label')!).getByText('—')).toBeInTheDocument()
    expect(screen.getByText(labels.review.hint)).toBeInTheDocument()
  })

  it('cocher 3 tâches et valider les archive toutes les 3', async () => {
    const { tasks } = await setup()
    renderApp('/revue')
    const button = await screen.findByRole('button', { name: labels.review.archiveSelection(0) })
    expect(button).toBeDisabled()
    for (const label of ['m. 23-30', 'm. 45-52', 'Coda']) {
      await userEvent.click(await screen.findByRole('checkbox', { name: new RegExp(label) }))
    }
    await userEvent.click(screen.getByRole('button', { name: labels.review.archiveSelection(3) }))
    expect(await screen.findByRole('status')).toHaveTextContent(labels.review.archived(3))
    const stored = await db.tasks.bulkGet(tasks.map((t) => t.id))
    expect(stored.map((t) => t?.status)).toEqual(['archived', 'archived', 'archived', 'active'])
    expect(screen.queryByText('Coda')).toBeNull()
    expect(screen.getByRole('button', { name: labels.review.archiveSelection(0) })).toBeDisabled()
  })

  it('tâche ajoutée et avancement modifiés ici se retrouvent dans le détail du projet', async () => {
    const { p } = await setup()
    renderApp('/revue')
    await userEvent.type(
      await screen.findByLabelText(labels.projects.addTaskLabel('Passages à tempo')),
      'Mains ensemble{Enter}',
    )
    await screen.findByText('Mains ensemble')
    await userEvent.type(
      screen.getByLabelText(labels.projects.progressLabel('Passages à tempo')),
      'Tempo 80',
    )
    await userEvent.tab()
    cleanup()
    renderApp(`/projets/${p.id}`)
    expect(await screen.findByText('Mains ensemble', { selector: 'li' })).toBeInTheDocument()
    expect(screen.getByLabelText(labels.projects.progressLabel('Passages à tempo'))).toHaveValue(
      'Tempo 80',
    )
  })
})
