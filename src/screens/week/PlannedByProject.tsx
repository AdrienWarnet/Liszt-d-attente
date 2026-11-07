import { Bar } from '../../components/Bar'
import { DurationInput, durationBox } from '../../components/DurationInput'
import { ui } from '../../components/ui'
import { formatDuration } from '../../data/durations'
import type { WeekStart } from '../../data/types'
import { formatGap, setProjectWeekPlan, type WeekOverview } from '../../data/week'
import { labels } from '../../labels'

/** Carte « Temps prévu par projet » de l'onglet Semaine (proto). Rouge seulement si prévu > budget (R12). */
export function PlannedByProject({ overview, ws }: { overview: WeekOverview; ws: WeekStart }) {
  const { projects, plannedTotal, plannedOverBudget, week } = overview
  const gap = formatGap(plannedTotal, week.budget)

  return (
    <>
      <p className={ui.label}>{labels.week.plannedByProject}</p>
      <div className={ui.card}>
        {projects.map(({ project, planned, real }, i) => (
          <div
            key={project.id}
            className={`flex items-center gap-2.5 py-2.5 ${i ? 'border-t border-line' : ''}`}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
              <span className="flex justify-between gap-2 text-sm font-semibold">
                <span className="truncate">{project.name}</span>
                <small className="font-medium text-muted tabular-nums">
                  {labels.week.projectReal(formatDuration(real))}
                </small>
              </span>
              <Bar value={real} reference={planned} />
            </div>
            <DurationInput
              value={planned}
              label={labels.week.plannedOf(project.name)}
              onCommit={(v) => setProjectWeekPlan(project.id, ws, v)}
            />
          </div>
        ))}

        <div className="flex items-center gap-2.5 border-t border-line py-2.5">
          <div className="flex min-w-0 flex-1 justify-between gap-2 text-sm font-semibold">
            <span>{labels.week.plannedTotal}</span>
            <small className="font-medium text-muted tabular-nums">
              {labels.week.weekBudgetSmall(formatDuration(week.budget))}
            </small>
          </div>
          <span
            data-testid="planned-total"
            data-over={plannedOverBudget || undefined}
            className={`${durationBox} ${
              plannedOverBudget ? 'bg-over-soft text-over ring-[1.5px] ring-over ring-inset' : ''
            }`}
          >
            {formatDuration(plannedTotal)}
          </span>
        </div>

        {gap && (
          <p className={`${ui.fact} mb-1`}>
            {plannedOverBudget ? (
              <span className="font-bold text-over">▲ {labels.week.ofTheWeek(gap)}</span>
            ) : (
              labels.week.ofTheWeek(gap)
            )}
          </p>
        )}
      </div>
    </>
  )
}
