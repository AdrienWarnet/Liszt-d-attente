import type { DurationSec } from '../data/types'
import { barFill } from '../data/week'

/** Barre « valeur / référence » du proto : `felt`, ou `ink` au-dessus de la référence (constat neutre). */
export function Bar({
  value,
  reference,
}: {
  value: DurationSec | null
  reference: DurationSec | null
}) {
  const { percent, over } = barFill(value, reference)
  return (
    <div className="relative h-2 overflow-hidden rounded bg-line" aria-hidden="true">
      <i
        className={`absolute inset-y-0 left-0 rounded ${over ? 'bg-ink' : 'bg-felt'}`}
        style={{ width: `${percent}%` }}
        data-over={over || undefined}
      />
    </div>
  )
}
