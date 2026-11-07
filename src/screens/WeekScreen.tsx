import { Link, useNavigate, useSearchParams } from 'react-router'
import { Bar } from '../components/Bar'
import { DurationInput } from '../components/DurationInput'
import { Screen } from '../components/Screen'
import { ui } from '../components/ui'
import { useNow } from '../components/useNow'
import { WeekNav } from '../components/WeekNav'
import { addWeeks, formatDayLabel, formatDayShort, today, weekStart } from '../data/dates'
import { formatDuration } from '../data/durations'
import { useWeekOverview } from '../data/hooks'
import { formatGap, setDailyBudget, type WeekOverview } from '../data/week'
import type { WeekStart } from '../data/types'
import { labels } from '../labels'

function ProgressPanel({ week }: { week: WeekOverview['week'] }) {
  const gap = formatGap(week.real, week.budget)
  return (
    <div className={ui.panel}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-bold">{labels.week.progress}</h3>
        <span className="font-semibold tabular-nums">
          {formatDuration(week.real)} / {formatDuration(week.budget)}
        </span>
      </div>
      <div className="mt-1.5">
        <Bar value={week.real} reference={week.budget} />
      </div>
      <p className={`${ui.fact} mt-1.5`}>
        {week.budget === null ? labels.week.enterBudget : gap && labels.week.real(gap)}
      </p>
    </div>
  )
}

function DailyBudgets({ overview, ws }: { overview: WeekOverview; ws: WeekStart }) {
  const navigate = useNavigate()
  return (
    <>
      <p className={ui.label}>{labels.week.dailyBudgets}</p>
      <div className={ui.card}>
        {overview.days.map((d, i) => (
          <div
            key={d.day}
            className={`flex items-center gap-2.5 py-2.5 ${i ? 'border-t border-line' : ''}`}
          >
            <button
              type="button"
              className="flex min-h-11 min-w-0 flex-1 flex-col gap-[5px] text-left"
              aria-label={labels.week.dayDetail(formatDayLabel(d.day))}
              onClick={() => navigate(`/semaine/jour/${d.day}`, { state: { from: ws } })}
            >
              <span className="flex justify-between gap-2 text-sm font-semibold">
                <span>
                  {formatDayShort(d.day)}
                  {d.isToday && <span className="text-xs text-felt"> · {labels.week.today}</span>}
                </span>
                <small className="font-medium text-muted tabular-nums">
                  {labels.week.dayLine(formatDuration(d.real), d.plannedTaskCount)}
                </small>
              </span>
              <span className="w-full">
                <Bar value={d.real} reference={d.budget} />
              </span>
            </button>
            <DurationInput
              value={d.budget}
              label={labels.week.budgetOf(formatDayLabel(d.day))}
              onCommit={(v) => setDailyBudget(d.day, v)}
            />
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-line pt-2.5 pb-1">
          <strong>{labels.week.weekBudget}</strong>
          <span className="font-semibold tabular-nums">{formatDuration(overview.week.budget)}</span>
        </div>
      </div>
    </>
  )
}

/** Onglet Semaine, vue globale (proto `V.semaine`). */
export function WeekScreen() {
  const [params, setParams] = useSearchParams()
  const ws = params.get('w') ?? weekStart(today())
  const now = useNow(30_000)
  const overview = useWeekOverview(ws, now)

  return (
    <Screen title={labels.tabs.week}>
      <WeekNav
        weekStart={ws}
        onMove={(delta) => setParams({ w: addWeeks(ws, delta) }, { replace: true })}
      />
      {overview && (
        <>
          <ProgressPanel week={overview.week} />
          <DailyBudgets overview={overview} ws={ws} />
        </>
      )}
      <Link to="/revue" className={`${ui.link} block`}>
        {labels.week.review}
      </Link>
    </Screen>
  )
}
