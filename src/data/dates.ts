import { labels } from '../labels'
import type { Day, WeekStart } from './types'

// Tous les calculs sont en heure locale du téléphone.
// Ne jamais utiliser toISOString() pour obtenir un jour : il est en UTC.

const pad = (n: number) => String(n).padStart(2, '0')

/** Jour local `YYYY-MM-DD` d'une date ou d'un horodatage (ms). */
export function toDay(date: Date | number): Day {
  const d = typeof date === 'number' ? new Date(date) : date
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Jour local courant. */
export function today(): Day {
  return toDay(Date.now())
}

/** Minuit local du jour donné. */
export function parseDay(day: Day): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Ajoute `n` jours calendaires (insensible aux changements d'heure). */
export function addDays(day: Day, n: number): Day {
  const d = parseDay(day)
  d.setDate(d.getDate() + n)
  return toDay(d)
}

/** Lundi de la semaine contenant `day`. */
export function weekStart(day: Day): WeekStart {
  const offset = (parseDay(day).getDay() + 6) % 7 // lundi = 0 … dimanche = 6
  return addDays(day, -offset)
}

/** Les 7 jours (lundi → dimanche) d'une semaine. */
export function weekDays(start: WeekStart): Day[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Décale une semaine de `n` semaines. */
export function addWeeks(start: WeekStart, n: number): WeekStart {
  return addDays(start, 7 * n)
}

const dayLabelFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const dayMonthFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

/** Ex. « lun. 9 nov. » */
export function formatDayLabel(day: Day): string {
  return dayLabelFormat.format(parseDay(day))
}

/** Ex. « Semaine du 9 nov. » */
export function formatWeekLabel(start: WeekStart): string {
  return `${labels.weekOf} ${dayMonthFormat.format(parseDay(start))}`
}

/** Ex. « 3 nov. » */
export function formatDayMonth(day: Day): string {
  return dayMonthFormat.format(parseDay(day))
}

const dayShortFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' })
const weekdayShortFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const dayTitleFormat = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
})

/** Ex. « lun. 9 » */
export function formatDayShort(day: Day): string {
  return dayShortFormat.format(parseDay(day))
}

/** Ex. « lun » (touches du clavier des jours). */
export function formatWeekdayShort(day: Day): string {
  return weekdayShortFormat.format(parseDay(day)).replace('.', '')
}

/** Ex. « Lundi 9 nov. » (titre de la vue Jour). */
export function formatDayTitle(day: Day): string {
  const text = dayTitleFormat.format(parseDay(day))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Heure locale « 18:42 » d'un horodatage. */
export function formatTimeOfDay(ms: number): string {
  const d = new Date(ms)
  return `${d.getHours()}:${pad(d.getMinutes())}`
}

/** Ex. « 9 nov » (colonnes du planning, sans point). */
export function formatWeekShort(start: WeekStart): string {
  return formatDayMonth(start).replace('.', '')
}
