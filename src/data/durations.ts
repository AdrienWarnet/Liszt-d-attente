import { labels } from '../labels'
import type { DurationSec } from './types'

/**
 * Formate une durée en `h:mm` (ex. `1:05`), précision minute.
 * Arrondi à la minute la plus proche (30 s et plus → minute suivante). `null` → « — ».
 */
export function formatDuration(sec: DurationSec | null): string {
  if (sec === null) return labels.emptyValue
  const totalMinutes = Math.round(Math.abs(sec) / 60)
  const sign = sec < 0 && totalMinutes > 0 ? '-' : ''
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${sign}${hours}:${String(minutes).padStart(2, '0')}`
}

/**
 * Lit une durée saisie et renvoie des secondes, ou `null` si vide / invalide.
 * Formats acceptés : `1:05` (h:mm), `1h05`, `1h`, `65` (minutes).
 */
export function parseDuration(input: string): DurationSec | null {
  const value = input.trim().toLowerCase()
  if (value === '') return null

  const minutesOnly = /^(\d+)$/.exec(value)
  if (minutesOnly) return Number(minutesOnly[1]) * 60

  const match = /^(\d+):(\d{2})$/.exec(value) ?? /^(\d+)\s*h\s*(\d{1,2})?$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = match[2] === undefined ? 0 : Number(match[2])
  if (minutes >= 60) return null
  return (hours * 60 + minutes) * 60
}

/** `null` si toutes les valeurs sont `null` (ou liste vide), sinon somme des non-`null`. */
export function sumNullable(values: readonly (number | null)[]): number | null {
  let total: number | null = null
  for (const v of values) {
    if (v !== null) total = (total ?? 0) + v
  }
  return total
}
