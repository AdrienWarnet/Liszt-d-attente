import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  addDays,
  addWeeks,
  formatDayLabel,
  formatWeekLabel,
  parseDay,
  toDay,
  today,
  weekDays,
  weekStart,
} from './dates'

beforeAll(() => {
  vi.stubEnv('TZ', 'Europe/Paris')
})
afterAll(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('fuseau du test', () => {
  it('est bien Europe/Paris (UTC+1 en novembre, UTC+2 en juillet)', () => {
    expect(new Date(2026, 10, 9).getTimezoneOffset()).toBe(-60)
    expect(new Date(2026, 6, 9).getTimezoneOffset()).toBe(-120)
  })
})

describe('toDay', () => {
  it('formate une date locale en YYYY-MM-DD', () => {
    expect(toDay(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('un horodatage à 23:30 heure locale reste ce jour-là', () => {
    // 23:30 à Paris le 9 nov. = 22:30 UTC
    expect(toDay(Date.UTC(2026, 10, 9, 22, 30))).toBe('2026-11-09')
    // 23:30 à Paris le 9 juil. (heure d'été) = 21:30 UTC
    expect(toDay(Date.UTC(2026, 6, 9, 21, 30))).toBe('2026-07-09')
  })

  it('un horodatage à 00:30 heure locale est le nouveau jour (piège toISOString)', () => {
    // 00:30 à Paris le 10 nov. = 23:30 UTC le 9
    const ms = Date.UTC(2026, 10, 9, 23, 30)
    expect(new Date(ms).toISOString().slice(0, 10)).toBe('2026-11-09')
    expect(toDay(ms)).toBe('2026-11-10')
  })
})

describe('today', () => {
  it('renvoie le jour local courant', () => {
    vi.useFakeTimers()
    vi.setSystemTime(Date.UTC(2026, 10, 9, 23, 30)) // 00:30 à Paris le 10
    expect(today()).toBe('2026-11-10')
    vi.useRealTimers()
  })
})

describe('parseDay / addDays', () => {
  it('parseDay renvoie minuit local', () => {
    const d = parseDay('2026-11-09')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 9, 0])
  })

  it('addDays traverse les changements de mois, d’année et d’heure', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26') // passage à l'heure d'hiver le 25
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30') // passage à l'heure d'été le 29
  })
})

describe('weekStart', () => {
  it('d’un lundi renvoie lui-même', () => {
    expect(weekStart('2026-11-09')).toBe('2026-11-09')
  })

  it('d’un dimanche renvoie le lundi précédent', () => {
    expect(weekStart('2026-11-15')).toBe('2026-11-09')
  })

  it('d’un samedi renvoie le lundi de la même semaine', () => {
    expect(weekStart('2026-11-07')).toBe('2026-11-02')
  })

  it('fonctionne sur une semaine à cheval sur deux années', () => {
    expect(weekStart('2027-01-01')).toBe('2026-12-28')
  })
})

describe('weekDays', () => {
  it('renvoie les 7 jours du lundi au dimanche', () => {
    expect(weekDays('2026-11-09')).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ])
  })

  it('reste juste sur la semaine du changement d’heure', () => {
    const days = weekDays('2026-10-19')
    expect(days).toHaveLength(7)
    expect(days[6]).toBe('2026-10-25')
  })
})

describe('addWeeks', () => {
  it('avance et recule de n semaines', () => {
    expect(addWeeks('2026-11-09', 1)).toBe('2026-11-16')
    expect(addWeeks('2026-11-09', -2)).toBe('2026-10-26')
    expect(addWeeks('2026-10-19', 1)).toBe('2026-10-26') // traverse le changement d'heure
    expect(addWeeks('2026-11-09', 0)).toBe('2026-11-09')
  })
})

describe('libellés', () => {
  it('formatDayLabel', () => {
    expect(formatDayLabel('2026-11-09')).toBe('lun. 9 nov.')
    expect(formatDayLabel('2026-11-15')).toBe('dim. 15 nov.')
  })

  it('formatWeekLabel', () => {
    expect(formatWeekLabel('2026-11-09')).toBe('Semaine du 9 nov.')
  })
})
