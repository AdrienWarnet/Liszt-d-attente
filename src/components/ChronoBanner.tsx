import { useNavigate } from 'react-router'
import { formatClock } from '../data/durations'
import { useBannerState } from '../data/hooks'
import { pauseTask, startTask } from '../data/sessions'
import { labels } from '../labels'
import { PauseIcon, PlayIcon } from './icons'
import { useNow } from './useNow'

/**
 * Bandeau du chrono (proto `#band`) sous le titre de chaque écran, sauf l'onglet
 * Session. Masqué sans session en cours. Le toucher ouvre l'onglet Session.
 */
export function ChronoBanner() {
  const now = useNow(1000)
  const state = useBannerState(now)
  const navigate = useNavigate()

  return (
    <div data-slot="chrono-banner" className="shrink-0 empty:hidden">
      {state && (
        <div
          role="button"
          tabIndex={0}
          aria-label={labels.banner.open}
          onClick={() => navigate('/')}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/')}
          className="mx-5 mb-2.5 flex cursor-pointer items-center gap-2.5 rounded-[14px] bg-felt py-1 pr-1 pl-3.5 text-[13px] text-screen"
        >
          <span className="min-w-0 flex-1 truncate">
            {state.running ? `● ${state.running.label}` : labels.banner.paused}
          </span>
          {state.running && (
            <b className="tabular-nums">{formatClock(state.running.durationSec)}</b>
          )}
          {(state.running || state.resumeTaskId) && (
            <button
              type="button"
              aria-label={state.running ? labels.banner.pause : labels.banner.resume}
              onClick={(e) => {
                e.stopPropagation()
                if (state.running) pauseTask()
                else startTask(state.sessionId, state.resumeTaskId!)
              }}
              className="grid size-11 shrink-0 place-items-center rounded-full bg-screen text-felt"
            >
              {state.running ? <PauseIcon /> : <PlayIcon />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
