import { formatWeekLabel } from '../data/dates'
import type { WeekStart } from '../data/types'
import { labels } from '../labels'
import { BackIcon, ChevronIcon } from './icons'

const arrow = 'grid size-11 place-items-center rounded-full border border-line'

/** Navigation « ‹ Semaine du 9 nov. › » du proto. */
export function WeekNav({
  weekStart,
  onMove,
}: {
  weekStart: WeekStart
  onMove: (delta: number) => void
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <button
        type="button"
        className={arrow}
        aria-label={labels.week.previous}
        onClick={() => onMove(-1)}
      >
        <BackIcon />
      </button>
      <strong>{formatWeekLabel(weekStart)}</strong>
      <button
        type="button"
        className={arrow}
        aria-label={labels.week.next}
        onClick={() => onMove(1)}
      >
        <ChevronIcon />
      </button>
    </div>
  )
}
