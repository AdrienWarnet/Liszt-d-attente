import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  backupFileName,
  daysSinceExport,
  exportData,
  getLastExportAt,
  importData,
  validateImport,
  type BackupFile,
} from './backup'
import { db } from './db'
import { setSectionWeeks } from './planning'
import {
  archiveTask,
  createProject,
  createSection,
  createTask,
  deleteProject,
  updateSection,
} from './projects'
import {
  addManualEntry,
  correctSessionTaskDuration,
  endSession,
  setSessionTasks,
  startSession,
  startTask,
} from './sessions'
import { planTaskOnDay, setDailyBudget, setProjectWeekPlan } from './week'

beforeAll(() => vi.stubEnv('TZ', 'Europe/Paris'))
afterAll(() => vi.unstubAllEnvs())
beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

async function fill() {
  const p = await createProject({ name: 'Ballade', startDate: '2026-11-02' })
  const gone = await createProject({ name: 'Sonate' })
  const s = await createSection(p.id, 'Passages')
  const s2 = await createSection(gone.id, 'Mvt 2')
  await updateSection(s.id, { progress: 'Tempo 80' })
  const a = await createTask(s.id, 'm. 23-30')
  const b = await createTask(s.id, 'Coda')
  const c = await createTask(s2.id, 'Exposition')
  await archiveTask(b.id)
  await deleteProject(gone.id)
  const session = await startSession()
  await setSessionTasks(session.id, [a.id, c.id])
  await startTask(session.id, a.id)
  await endSession(session.id)
  await correctSessionTaskDuration(session.id, a.id, 1200)
  await addManualEntry(c.id, '2026-11-09', 600)
  await setDailyBudget('2026-11-09', 5400)
  await setDailyBudget('2026-11-10', 0)
  await setProjectWeekPlan(p.id, '2026-11-09', 4 * 3600)
  await planTaskOnDay(a.id, '2026-11-09', null)
  await setSectionWeeks(s.id, ['2026-11-09'])
  await setSectionWeeks(s.id, ['2026-11-16'])
  await db.meta.put({ key: 'autre', value: { a: 1 } })
}

async function snapshot() {
  const out: Record<string, unknown[]> = {}
  for (const t of db.tables) {
    const rows = await t.toArray()
    out[t.name] = t.name === 'meta' ? rows.filter((r) => r.key !== 'lastExportAt') : rows
  }
  return out
}

describe('export / import (7.1)', () => {
  it('aller-retour : base remplie → export → base vidée → import → contenu identique', async () => {
    await fill()
    const before = await snapshot()
    const file = JSON.parse(JSON.stringify(await exportData({ now: 1_800_000_000_000 })))
    expect(file).toMatchObject({ app: 'piano', schemaVersion: 1, exportedAt: 1_800_000_000_000 })
    expect(file.tables.meta.some((r: { key: string }) => r.key === 'lastExportAt')).toBe(false)
    expect(file.tables.projects[0].endDate).toBeNull()
    await Promise.all(db.tables.map((t) => t.clear()))
    await importData(file)
    expect(await snapshot()).toEqual(before)
    expect(await getLastExportAt()).toBe(1_800_000_000_000)
  })

  it('export : met à jour la date de dernière sauvegarde (sauf si demandé)', async () => {
    expect(await getLastExportAt()).toBeNull()
    await exportData({ now: 1000, markExported: false })
    expect(await getLastExportAt()).toBeNull()
    await exportData({ now: 2000 })
    expect(await getLastExportAt()).toBe(2000)
  })

  it('une session en cours est exportée telle quelle (segment ouvert compris)', async () => {
    await fill()
    const s = await startSession()
    const [t] = await db.tasks.toArray()
    await startTask(s.id, t.id)
    const file = await exportData()
    expect(file.tables.sessions.some((x) => x.endedAt === null)).toBe(true)
    expect(file.tables.timeSegments.some((x) => x.endedAt === null)).toBe(true)
  })

  it('fichier d’une autre app ou version supérieure → refus, base inchangée', async () => {
    await fill()
    const before = await snapshot()
    const file = (await exportData()) as BackupFile
    expect(validateImport({ ...file, app: 'autre' })).toEqual({ ok: false, error: 'notBackup' })
    expect(validateImport('pas du json')).toEqual({ ok: false, error: 'notBackup' })
    expect(validateImport({ ...file, schemaVersion: 2 })).toEqual({
      ok: false,
      error: 'newerVersion',
    })
    const broken = { ...file, tables: { ...file.tables, tasks: [{ id: 'x' }] } }
    expect(validateImport(broken)).toEqual({ ok: false, error: 'invalid' })
    await expect(importData({ ...file, schemaVersion: 2 })).rejects.toThrow()
    expect(await snapshot()).toEqual(before)
  })

  it('erreur au milieu de l’import → base inchangée', async () => {
    await fill()
    const before = await snapshot()
    const file = JSON.parse(JSON.stringify(await exportData()))
    // Deux tâches avec le même identifiant : l'insertion échoue après avoir vidé les tables.
    file.tables.tasks.push({ ...file.tables.tasks[0] })
    await expect(importData(file)).rejects.toThrow()
    expect(await snapshot()).toEqual(before)
  })

  it('résumé avant import : projets, tâches, sessions, date d’export', async () => {
    await fill()
    const check = validateImport(await exportData({ now: 5 }))
    expect(check).toEqual({
      ok: true,
      counts: { projects: 2, tasks: 3, sessions: 1 },
      exportedAt: 5,
    })
  })
})

describe('utilitaires de sauvegarde', () => {
  it('nom de fichier et jours depuis la dernière sauvegarde', () => {
    const mon = Date.UTC(2026, 10, 9, 22, 30) // 23:30 à Paris le 9
    expect(backupFileName(mon)).toBe('liszt-d-attente-sauvegarde-2026-11-09.json')
    expect(daysSinceExport(null, mon)).toBeNull()
    expect(daysSinceExport(mon, mon + 60 * 60_000)).toBe(1) // 00:30 le 10 : hier
    expect(daysSinceExport(mon, mon + 3 * 86_400_000)).toBe(3)
  })
})
