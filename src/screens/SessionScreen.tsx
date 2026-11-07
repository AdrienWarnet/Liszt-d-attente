import { useState } from 'react'
import { Link } from 'react-router'
import { ProjectGroupHeader } from '../components/ProjectGroupHeader'
import { Screen } from '../components/Screen'
import { ui } from '../components/ui'
import { formatDayLabel, today } from '../data/dates'
import { formatDuration } from '../data/durations'
import { useCurrentSession, useDayPlan } from '../data/hooks'
import { startSession } from '../data/sessions'
import { labels } from '../labels'
import { AddTasksSheet } from './session/AddTasksSheet'
import { RunningSession } from './session/RunningSession'

/** Sans session en cours : démarrer, prévu aujourd'hui, liens (proto `V.session`). */
function IdleSession({ onStarted }: { onStarted: (sessionId: string) => void }) {
  const plan = useDayPlan(today())
  return (
    <>
      <button
        type="button"
        className="my-1.5 flex aspect-[2.2] w-full flex-col items-center justify-center gap-1 rounded-[22px] bg-felt font-serif text-[30px] text-screen"
        onClick={async () => onStarted((await startSession()).id)}
      >
        {labels.session.start}
        <small className="font-sans text-[13px] opacity-80">{labels.session.startHint}</small>
      </button>

      <p className={ui.label}>{labels.session.plannedToday}</p>
      {plan?.length === 0 && <p className={ui.fact}>{labels.session.noPlannedToday}</p>}
      {plan?.map((group) => (
        <div key={group.project.id}>
          <ProjectGroupHeader project={group.project} color={group.color} />
          {group.items.map(({ task, section, durationSec }, i) => (
            <div
              key={task.id}
              className={`flex items-center justify-between gap-2.5 py-2.5 text-sm ${i ? 'border-t border-line' : ''}`}
            >
              <div className="min-w-0">
                {task.label}
                <div className={ui.crumb}>{section.name}</div>
              </div>
              <span className="font-semibold tabular-nums">{formatDuration(durationSec)}</span>
            </div>
          ))}
        </div>
      ))}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to="/ajout-manuel" className={`${ui.chip} inline-flex items-center`}>
          {labels.session.manualAdd}
        </Link>
        <Link to="/sessions" className={`${ui.chip} inline-flex items-center`}>
          {labels.session.history}
        </Link>
      </div>
    </>
  )
}

/** Onglet Session. */
export function SessionScreen() {
  const current = useCurrentSession()
  const [adding, setAdding] = useState<string | null>(null)

  return (
    <Screen title={labels.tabs.session} subtitle={formatDayLabel(today())} hideBanner>
      {current === null && <IdleSession onStarted={setAdding} />}
      {current && <RunningSession session={current} onAddTasks={() => setAdding(current.id)} />}
      {adding && <AddTasksSheet sessionId={adding} onClose={() => setAdding(null)} />}
    </Screen>
  )
}
