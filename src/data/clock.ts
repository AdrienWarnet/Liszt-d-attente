import type { Timestamp } from './types'

let last = 0

/**
 * `Date.now()` strictement croissant : deux créations dans la même milliseconde
 * (ajout rapide de tâches) gardent leur ordre de création.
 */
export function monotonicNow(): Timestamp {
  last = Math.max(Date.now(), last + 1)
  return last
}
