import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportData, getLastExportAt } from '../data/backup'
import { db } from '../data/db'
import { createProject, createSection, createTask } from '../data/projects'
import { labels } from '../labels'
import { clearDb, renderApp } from '../test/renderApp'

beforeEach(async () => {
  await clearDb()
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  vi.restoreAllMocks()
  // @ts-expect-error nettoyage des doublures de partage
  delete navigator.canShare
  // @ts-expect-error idem
  delete navigator.share
})

async function fill() {
  const p = await createProject({ name: 'Ballade' })
  const s = await createSection(p.id, 'Passages')
  await createTask(s.id, 'm. 23-30')
}

const jsonFile = (content: unknown, name = 'sauvegarde.json') =>
  new File([typeof content === 'string' ? content : JSON.stringify(content)], name, {
    type: 'application/json',
  })

describe('Écran Sauvegarde (7.2)', () => {
  it('Plus : « Jamais » et rappel ; exporter (téléchargement) → « aujourd’hui », plus de rappel', async () => {
    await fill()
    renderApp('/plus')
    const row = await screen.findByRole('link', { name: new RegExp(labels.more.backup) })
    await vi.waitFor(() => expect(row).toHaveTextContent(labels.backup.never))
    expect(within(row).getByRole('img', { name: labels.backup.reminder })).toBeInTheDocument()

    await userEvent.click(row)
    expect(await screen.findByText(labels.backup.intro)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: labels.backup.export }))
    expect(await screen.findByRole('status')).toHaveTextContent(labels.backup.exported)
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(await getLastExportAt()).not.toBeNull()
    await vi.waitFor(() => expect(screen.getByText(labels.backup.ago(0))).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: labels.common.back }))
    const again = await screen.findByRole('link', { name: new RegExp(labels.more.backup) })
    await vi.waitFor(() => expect(again).toHaveTextContent(labels.backup.ago(0)))
    expect(within(again).queryByRole('img', { name: labels.backup.reminder })).toBeNull()
  })

  it('partage disponible : feuille de partage ; partage annulé → pas de date de sauvegarde', async () => {
    const share = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('annulé'), { name: 'AbortError' }))
    Object.assign(navigator, { canShare: () => true, share })
    renderApp('/plus/sauvegarde')
    await userEvent.click(await screen.findByRole('button', { name: labels.backup.export }))
    await vi.waitFor(() => expect(share).toHaveBeenCalledOnce())
    const file = share.mock.calls[0][0].files[0] as File
    expect(file.name).toMatch(/^liszt-d-attente-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/)
    expect(await getLastExportAt()).toBeNull()
  })

  it('fichier invalide → message « pas une sauvegarde » ; rien ne change', async () => {
    await fill()
    renderApp('/plus/sauvegarde')
    await userEvent.upload(
      await screen.findByLabelText(labels.backup.fileInput),
      jsonFile('pas du json'),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(labels.backup.notBackup)
    await userEvent.upload(
      screen.getByLabelText(labels.backup.fileInput),
      jsonFile({ app: 'autre' }),
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await db.projects.count()).toBe(1)
  })

  it('restaurer : résumé, Annuler ne change rien, Restaurer remplace les données', async () => {
    await fill()
    const backup = await exportData({ now: Date.UTC(2026, 10, 6, 12) })
    await createProject({ name: 'Ajouté après la sauvegarde' })
    renderApp('/plus/sauvegarde')
    await userEvent.upload(
      await screen.findByLabelText(labels.backup.fileInput),
      jsonFile(backup, 'ma-sauvegarde.json'),
    )
    const sheet = await screen.findByRole('dialog', { name: labels.backup.restoreTitle })
    expect(sheet).toHaveTextContent(labels.backup.chosenFile('ma-sauvegarde.json'))
    expect(sheet).toHaveTextContent('1 projet, 1 tâche, 0 session — exporté le ven. 6 nov.')
    expect(sheet).toHaveTextContent(labels.backup.warning)
    await userEvent.click(within(sheet).getByRole('button', { name: labels.common.cancel }))
    expect(await db.projects.count()).toBe(2)

    await userEvent.upload(screen.getByLabelText(labels.backup.fileInput), jsonFile(backup))
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: labels.backup.confirm,
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(labels.backup.restored)
    expect((await db.projects.toArray()).map((p) => p.name)).toEqual(['Ballade'])
  })
})
