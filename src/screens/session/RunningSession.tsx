import { useState } from 'react'
import { PauseIcon, PlayIcon } from '../../components/icons'
import { ProjectGroupHeader } from '../../components/ProjectGroupHeader'
import { Sheet } from '../../components/Sheet'
import { useToast } from '../../components/Toast'
import { ui } from '../../components/ui'
import { useNow } from '../../components/useNow'
import { formatTimeOfDay } from '../../data/dates'
import { formatClock, formatDuration } from '../../data/durations'
import { useSessionView } from '../../data/hooks'
import { endSession, pauseTask, startTask } from '../../data/sessions'
import type { Session } from '../../data/types'
import { labels } from '../../labels'

interface Props {
  session: Session
  onAddTasks: () => void
}

/**
 * Session en cours (proto `V.session`) : un chrono par tâche, un seul à la fois.
 * Le rafraîchissement chaque seconde ne sert qu'à l'affichage : les durées sont
 * recalculées depuis les horodatages en base.
 */
export function RunningSession({ session, onAddTasks }: Props) {
  const now = useNow(1000)
  const view = useSessionView(session.id, now)
  const [ending, setEnding] = useState(false)
  const toast = useToast()
  if (!view) return null

  return (
    <>
      <div className="flex items-baseline justify-between border-b border-line pt-1 pb-3.5">
        <div>
          <small className="text-muted">
            {labels.session.startedAt(formatTimeOfDay(session.startedAt))}
          </small>
          <strong
            className="block text-[30px] font-semibold tracking-[-0.5px] tabular-nums"
            aria-label={labels.session.total}
          >
            {formatClock(view.totalSec)}
          </strong>
        </div>
        <small className="text-muted">{labels.session.taskCount(view.taskCount)}</small>
      </div>

      {view.taskCount === 0 && (
        <p className="py-10 text-center text-muted">{labels.session.empty}</p>
      )}
      {view.groups.map((group) => (
        <div key={group.project.id}>
          <ProjectGroupHeader project={group.project} color={group.color} />
          {group.items.map(({ task, section, durationSec, running }) => (
            <div
              key={task.id}
              data-running={running || undefined}
              className="relative flex items-center gap-3 border-b border-line py-3.5"
            >
              {running && (
                <span
                  className="absolute inset-y-3 -left-5 w-[3px] rounded-r-[3px] bg-felt"
                  aria-hidden="true"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className={ui.crumb}>{section.name}</div>
                <div className="mt-0.5 font-semibold">{task.label}</div>
              </div>
              <span
                className={`font-semibold tabular-nums ${running ? 'text-felt' : 'text-muted'}`}
              >
                {formatClock(durationSec)}
              </span>
              <button
                type="button"
                aria-label={
                  running ? labels.session.pause(task.label) : labels.session.play(task.label)
                }
                onClick={() => (running ? pauseTask() : startTask(session.id, task.id))}
                className={`grid size-14 shrink-0 place-items-center rounded-full border-[1.5px] ${
                  running ? 'border-felt bg-felt text-screen' : 'border-line'
                }`}
              >
                {running ? <PauseIcon /> : <PlayIcon />}
              </button>
            </div>
          ))}
        </div>
      ))}

      <button type="button" className={`${ui.secondary} mt-3.5`} onClick={onAddTasks}>
        {labels.session.addTasks}
      </button>
      <button type="button" className={`${ui.primary} mt-3`} onClick={() => setEnding(true)}>
        {labels.session.end}
      </button>

      <Sheet
        open={ending}
        title={labels.session.endTitle}
        onClose={() => setEnding(false)}
        confirmLabel={labels.session.endConfirm}
        onConfirm={async () => {
          await endSession(session.id)
          setEnding(false)
          toast(labels.session.saved)
        }}
      >
        <p className={`${ui.fact} text-[15px]`}>
          {labels.session.endText(formatDuration(view.totalSec))}
        </p>
      </Sheet>
    </>
  )
}
