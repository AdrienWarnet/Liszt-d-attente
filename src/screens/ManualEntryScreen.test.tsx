import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { createProject, createSection, createTask } from '../data/projects'
import { getRealTime } from '../data/sessions'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

beforeAll(() => vi.stubEnv('TZ', 'Europe/Paris'))
afterAll(() => vi.unstubAllEnvs())
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.UTC(2026, 10, 12, 17)) // jeudi 12 nov.
  await clearDb()
  const p = await createProject({ name: 'Déchiffrage' })
  const s = await createSection(p.id, 'Clementi')
  await createTask(s.id, 'Sonatine')
})
afterEach(() => vi.useRealTimers())

describe('Ajout manuel (4.6)', () => {
  it('ajouter 0:45 mardi : le temps réel de mardi augmente de 0:45 ; supprimer le retire', async () => {
    renderApp('/plus')
    await userEvent.click(await screen.findByRole('link', { name: labels.session.manualAdd }))
    expect(await screen.findByText(labels.manual.none)).toBeInTheDocument()
    const [task] = await db.tasks.toArray()
    await vi.waitFor(() =>
      expect(screen.getByRole('option', { name: 'Clementi › Sonatine' })).toBeInTheDocument(),
    )
    await userEvent.selectOptions(screen.getByLabelText(labels.manual.task), task.id)
    expect(screen.getByLabelText(labels.manual.day)).toHaveValue('2026-11-12')
    await userEvent.selectOptions(screen.getByLabelText(labels.manual.day), '2026-11-10')
    await userEvent.type(screen.getByLabelText(labels.manual.duration), '45')
    await userEvent.click(screen.getByRole('button', { name: labels.manual.add }))
    expect(await screen.findByRole('status')).toHaveTextContent(labels.manual.added)
    expect(await getRealTime({ days: ['2026-11-10'] })).toBe(45 * 60)
    expect(await screen.findByText('mar. 10 nov.', { selector: 'div' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: labels.manual.remove('Sonatine') }))
    expect(await screen.findByText(labels.manual.none)).toBeInTheDocument()
    expect(await getRealTime({ days: ['2026-11-10'] })).toBeNull()
  })

  it('sans tâche ou avec une durée vide ou 0 : rien n’est ajouté, message', async () => {
    renderApp('/ajout-manuel')
    await userEvent.click(await screen.findByRole('button', { name: labels.manual.add }))
    expect(await screen.findByRole('status')).toHaveTextContent(labels.manual.errChooseTask)
    const [task] = await db.tasks.toArray()
    await vi.waitFor(() =>
      expect(screen.getByRole('option', { name: 'Clementi › Sonatine' })).toBeInTheDocument(),
    )
    await userEvent.selectOptions(screen.getByLabelText(labels.manual.task), task.id)
    await userEvent.click(screen.getByRole('button', { name: labels.manual.add }))
    expect(await screen.findByText(labels.manual.errDuration)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(labels.manual.duration), '0')
    await userEvent.click(screen.getByRole('button', { name: labels.manual.add }))
    expect(await db.manualEntries.count()).toBe(0)
  })

  it('14 jours proposés, d’aujourd’hui à 13 jours en arrière', async () => {
    renderApp('/ajout-manuel')
    const options = (await screen.findByLabelText(labels.manual.day)).querySelectorAll('option')
    expect(options).toHaveLength(14)
    expect(options[0].value).toBe('2026-11-12')
    expect(options[13].value).toBe('2026-10-30')
  })
})
