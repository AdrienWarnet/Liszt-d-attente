import { DurationInput } from '../components/DurationInput'
import { Screen } from '../components/Screen'
import { useToast } from '../components/Toast'
import { ui } from '../components/ui'
import { useNow } from '../components/useNow'
import { formatDayShort, formatTimeOfDay } from '../data/dates'
import { formatDuration } from '../data/durations'
import { useHistory } from '../data/hooks'
import { correctSessionTaskDuration, type SessionSummary } from '../data/sessions'
import { labels } from '../labels'

const tag = 'ml-1.5 rounded-full bg-felt-soft px-[7px] py-0.5 text-[11px] font-bold text-felt'

function SessionCard({ summary }: { summary: SessionSummary }) {
  const toast = useToast()
  const { session } = summary
  return (
    <details className={ui.card}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
        <strong>
          {labels.history.when(formatDayShort(session.day), formatTimeOfDay(session.startedAt))}
        </strong>
        <span className="font-semibold tabular-nums">{formatDuration(summary.totalSec)}</span>
      </summary>
      {summary.tasks.map(({ task, section, project, durationSec, corrected }) => (
        <div
          key={task.id}
          className="flex items-center gap-2.5 border-t border-line py-2.5 text-sm"
        >
          <div className="min-w-0 flex-1">
            {task.label}
            {corrected && <span className="text-muted"> {labels.history.corrected}</span>}
            <div className={ui.crumb}>{labels.history.path(project.name, section.name)}</div>
          </div>
          <DurationInput
            value={durationSec}
            label={labels.history.correctLabel(task.label)}
            onCommit={async (v) => {
              if (v === null) return // vider ne corrige rien
              await correctSessionTaskDuration(session.id, task.id, v)
              toast(labels.history.correctedToast)
            }}
          />
          {corrected && (
            <button
              type="button"
              className={ui.iconButton}
              aria-label={labels.history.undoCorrection(task.label)}
              onClick={() => correctSessionTaskDuration(session.id, task.id, null)}
            >
              ↺
            </button>
          )}
        </div>
      ))}
      <p className={ui.fact}>{labels.history.correctHint}</p>
    </details>
  )
}

/** Historique des sessions et des ajouts manuels (proto `V.historique`). */
export function HistoryScreen() {
  const now = useNow(30_000)
  const history = useHistory(now)

  return (
    <Screen title={labels.history.title} subtitle={labels.history.subtitle} back="/">
      {history && !history.current && history.items.length === 0 && (
        <p className={ui.fact}>{labels.history.empty}</p>
      )}
      {history?.current && (
        <div className={ui.card}>
          <strong>
            {labels.history.when(
              formatDayShort(history.current.session.day),
              formatTimeOfDay(history.current.session.startedAt),
            )}
          </strong>
          <span className={tag}>{labels.history.inProgress}</span>
        </div>
      )}
      {history?.items.map((item) =>
        item.kind === 'session' ? (
          <SessionCard key={item.summary.session.id} summary={item.summary} />
        ) : (
          <div key={item.entry.id} className={ui.card}>
            <div className="flex items-center justify-between gap-3 py-1">
              <strong>{formatDayShort(item.day)}</strong>
              <span className={ui.crumb}>{labels.history.manualTag}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <span>{item.context.task.label}</span>
              <span className="font-semibold tabular-nums">
                {formatDuration(item.entry.durationSec)}
              </span>
            </div>
          </div>
        ),
      )}
    </Screen>
  )
}
