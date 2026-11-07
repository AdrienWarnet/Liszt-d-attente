import { db } from './db'
import { toDay } from './dates'
import type { Timestamp } from './types'
import { labels } from '../labels'

// Sauvegarde (7.1) : export complet et import sûr de toute la base.
// Les `null` restent `null` (JSON les garde tels quels).

export const BACKUP_APP = 'piano'
export const LAST_EXPORT_KEY = 'lastExportAt'

/** Champs obligatoires de chaque table v1 (modèle de données de CLAUDE.md). */
const REQUIRED: Record<string, string[]> = {
  projects: ['id', 'name', 'startDate', 'endDate', 'deletedAt', 'createdAt'],
  sections: ['id', 'projectId', 'name', 'progress', 'order', 'createdAt'],
  tasks: ['id', 'sectionId', 'projectId', 'label', 'status', 'archivedAt', 'createdAt'],
  sessions: ['id', 'startedAt', 'endedAt', 'day'],
  sessionTasks: ['sessionId', 'taskId', 'order', 'correctedDurationSec'],
  timeSegments: ['id', 'sessionId', 'taskId', 'startedAt', 'endedAt'],
  manualEntries: ['id', 'taskId', 'day', 'durationSec', 'createdAt'],
  dailyBudgets: ['day', 'durationSec'],
  projectWeekPlans: ['projectId', 'weekStart', 'durationSec'],
  taskDayPlans: ['taskId', 'day', 'durationSec'],
  sectionPlacements: ['id', 'sectionId', 'weekStart', 'kind'],
  meta: ['key', 'value'],
}
const TABLES = Object.keys(REQUIRED)

export interface BackupFile {
  app: typeof BACKUP_APP
  schemaVersion: number
  exportedAt: Timestamp
  tables: Record<string, Record<string, unknown>[]>
}

/**
 * Export complet. `lastExportAt` n'est pas exporté (recalculé). Par défaut, la date de
 * dernière sauvegarde est mise à jour ; l'écran la met à jour lui-même une fois le
 * fichier vraiment partagé ou téléchargé (`markExported`).
 */
export async function exportData(
  options: { markExported?: boolean; now?: Timestamp } = {},
): Promise<BackupFile> {
  const exportedAt = options.now ?? Date.now()
  const tables: BackupFile['tables'] = {}
  await db.transaction('r', db.tables, async () => {
    for (const name of TABLES) {
      const rows = (await db.table(name).toArray()) as Record<string, unknown>[]
      tables[name] = name === 'meta' ? rows.filter((r) => r.key !== LAST_EXPORT_KEY) : rows
    }
  })
  if (options.markExported ?? true) await markExported(exportedAt)
  return { app: BACKUP_APP, schemaVersion: db.verno, exportedAt, tables }
}

export async function markExported(at: Timestamp): Promise<void> {
  await db.meta.put({ key: LAST_EXPORT_KEY, value: at })
}

export async function getLastExportAt(): Promise<Timestamp | null> {
  const value = (await db.meta.get(LAST_EXPORT_KEY))?.value
  return typeof value === 'number' ? value : null
}

export type BackupError = 'notBackup' | 'newerVersion' | 'invalid'

export type BackupCheck =
  | {
      ok: true
      counts: { projects: number; tasks: number; sessions: number }
      exportedAt: Timestamp
    }
  | { ok: false; error: BackupError }

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Vérifie un fichier de sauvegarde avant import. */
export function validateImport(json: unknown): BackupCheck {
  if (!isObject(json) || json.app !== BACKUP_APP || !isObject(json.tables)) {
    return { ok: false, error: 'notBackup' }
  }
  if (typeof json.schemaVersion !== 'number' || typeof json.exportedAt !== 'number') {
    return { ok: false, error: 'invalid' }
  }
  if (json.schemaVersion > db.verno) return { ok: false, error: 'newerVersion' }
  const tables = json.tables
  for (const name of TABLES) {
    const rows = tables[name]
    if (!Array.isArray(rows)) return { ok: false, error: 'invalid' }
    for (const row of rows) {
      if (!isObject(row) || REQUIRED[name].some((field) => !(field in row))) {
        return { ok: false, error: 'invalid' }
      }
    }
  }
  const count = (name: string) => (tables[name] as unknown[]).length
  return {
    ok: true,
    counts: { projects: count('projects'), tasks: count('tasks'), sessions: count('sessions') },
    exportedAt: json.exportedAt,
  }
}

/**
 * Remplace TOUT le contenu de la base par la sauvegarde, en une seule transaction :
 * en cas d'erreur, rien n'est modifié. La dernière sauvegarde devient la date du fichier.
 */
export async function importData(json: unknown): Promise<void> {
  const check = validateImport(json)
  if (!check.ok) throw new Error(check.error)
  const file = json as BackupFile
  await db.transaction('rw', db.tables, async () => {
    for (const name of TABLES) await db.table(name).clear()
    for (const name of TABLES) await db.table(name).bulkAdd(file.tables[name])
    await markExported(file.exportedAt)
  })
}

/** Nom du fichier : `liszt-d-attente-sauvegarde-AAAA-MM-JJ.json` (lot 4). */
export function backupFileName(at: Timestamp): string {
  return `liszt-d-attente-sauvegarde-${toDay(at)}.json`
}

/** Jours entiers (calendaires, heure locale) écoulés depuis la dernière sauvegarde ; `null` si jamais. */
export function daysSinceExport(lastAt: Timestamp | null, now: Timestamp): number | null {
  if (lastAt === null) return null
  const start = new Date(toDay(lastAt) + 'T00:00')
  const end = new Date(toDay(now) + 'T00:00')
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

/** Rappel discret si aucune sauvegarde depuis plus de 7 jours (ou jamais). */
export const BACKUP_REMINDER_DAYS = 7

/** « il y a 3 jours », « hier », « aujourd'hui » ou « Jamais ». */
export function lastExportText(lastAt: Timestamp | null | undefined, now: Timestamp): string {
  const days = daysSinceExport(lastAt ?? null, now)
  return days === null ? labels.backup.never : labels.backup.ago(days)
}

/** Vrai si un rappel discret est utile : jamais sauvegardé, ou plus de 7 jours. */
export function needsBackupReminder(lastAt: Timestamp | null | undefined, now: Timestamp): boolean {
  const days = daysSinceExport(lastAt ?? null, now)
  return days === null || days > BACKUP_REMINDER_DAYS
}
