import { ProjectGroupHeader } from '../../components/ProjectGroupHeader'
import { ui } from '../../components/ui'
import { useNow } from '../../components/useNow'
import { formatClock } from '../../data/durations'
import { useSessionView } from '../../data/hooks'
import type { Session } from '../../data/types'
import { labels } from '../../labels'

interface Props {
  session: Session
  onAddTasks: () => void
}

/** Session en cours : tâches groupées par projet (proto `V.session`, session en cours). */
export function RunningSession({ session, onAddTasks }: Props) {
  const now = useNow(1000)
  const view = useSessionView(session.id, now)
  if (!view) return null

  return (
    <>
      {view.taskCount === 0 && (
        <p className="py-10 text-center text-muted">{labels.session.empty}</p>
      )}
      {view.groups.map((group) => (
        <div key={group.project.id}>
          <ProjectGroupHeader project={group.project} color={group.color} />
          {group.items.map(({ task, section, durationSec }) => (
            <div key={task.id} className="flex items-center gap-3 border-b border-line py-3.5">
              <div className="min-w-0 flex-1">
                <div className={ui.crumb}>{section.name}</div>
                <div className="mt-0.5 font-semibold">{task.label}</div>
              </div>
              <span className="font-semibold text-muted tabular-nums">
                {formatClock(durationSec)}
              </span>
            </div>
          ))}
        </div>
      ))}

      <button type="button" className={`${ui.secondary} mt-3.5`} onClick={onAddTasks}>
        {labels.session.addTasks}
      </button>
    </>
  )
}
