import { describe, expect, it } from 'vitest'
import { formatDuration, parseDuration, sumNullable } from './durations'

describe('formatDuration', () => {
  it('valeur absente (null) → « — »', () => {
    expect(formatDuration(null)).toBe('—')
  })

  it('zéro saisi → « 0:00 » (différent de null)', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  it('formate en h:mm', () => {
    expect(formatDuration(3900)).toBe('1:05')
    expect(formatDuration(600)).toBe('0:10')
    expect(formatDuration(36000)).toBe('10:00')
    expect(formatDuration(27 * 3600)).toBe('27:00')
  })

  it('arrondit à la minute la plus proche', () => {
    expect(formatDuration(29)).toBe('0:00')
    expect(formatDuration(30)).toBe('0:01')
    expect(formatDuration(59)).toBe('0:01')
    expect(formatDuration(3929)).toBe('1:05')
    expect(formatDuration(3959)).toBe('1:06')
    expect(formatDuration(3570)).toBe('1:00') // 59 min 30 s → passe à l'heure suivante
  })

  it('un écart négatif de moins de 30 s s’affiche « 0:00 », sans signe', () => {
    expect(formatDuration(-20)).toBe('0:00')
  })

  it('garde le signe d’un écart négatif', () => {
    expect(formatDuration(-4800)).toBe('-1:20')
  })
})

describe('parseDuration', () => {
  it('vide → null', () => {
    expect(parseDuration('')).toBeNull()
    expect(parseDuration('   ')).toBeNull()
  })

  it('« 1:05 », « 65 » et « 1h05 » valent tous 1 h 05', () => {
    expect(parseDuration('1:05')).toBe(3900)
    expect(parseDuration('65')).toBe(3900)
    expect(parseDuration('1h05')).toBe(3900)
  })

  it('accepte les variantes courantes', () => {
    expect(parseDuration(' 1H05 ')).toBe(3900)
    expect(parseDuration('1 h 05')).toBe(3900)
    expect(parseDuration('1h5')).toBe(3900)
    expect(parseDuration('2h')).toBe(7200)
    expect(parseDuration('0:45')).toBe(2700)
  })

  it('zéro saisi → 0 (pas null)', () => {
    expect(parseDuration('0')).toBe(0)
    expect(parseDuration('0:00')).toBe(0)
  })

  it('invalide → null', () => {
    expect(parseDuration('abc')).toBeNull()
    expect(parseDuration('1:75')).toBeNull()
    expect(parseDuration('1h75')).toBeNull()
    expect(parseDuration('1:5')).toBeNull()
    expect(parseDuration('-10')).toBeNull()
    expect(parseDuration('1.5')).toBeNull()
    expect(parseDuration('h05')).toBeNull()
  })

  it('aller-retour avec formatDuration', () => {
    expect(formatDuration(parseDuration('1:05'))).toBe('1:05')
    expect(formatDuration(parseDuration(''))).toBe('—')
  })
})

describe('sumNullable', () => {
  it('toutes null → null', () => {
    expect(sumNullable([null, null])).toBeNull()
  })

  it('liste vide → null', () => {
    expect(sumNullable([])).toBeNull()
  })

  it('au moins une valeur saisie → somme des valeurs saisies', () => {
    expect(sumNullable([null, 600])).toBe(600)
    expect(sumNullable([300, null, 600])).toBe(900)
  })

  it('un zéro saisi compte comme une valeur', () => {
    expect(sumNullable([null, 0])).toBe(0)
  })
})
