import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Bar } from '../components/Bar'
import { DurationInput } from '../components/DurationInput'
import { CloseIcon } from '../components/icons'
import { ProjectGroupHeader } from '../components/ProjectGroupHeader'
import { Screen } from '../components/Screen'
import { Sheet } from '../components/Sheet'
import { TaskChecklist } from '../components/TaskChecklist'
import { ui } from '../components/ui'
import { useNow } from '../components/useNow'
import {
  formatDayLabel,
  formatDayShort,
  formatDayTitle,
  formatWeekLabel,
  formatWeekdayShort,
  parseDay,
  weekStart,
} from '../data/dates'
import { formatDuration } from '../data/durations'
import { useActiveTasksGrouped, useDayOverview, useDayTasks, useWeekOverview } from '../data/hooks'
import type { Day } from '../data/types'
import {
  formatGap,
  formatRemaining,
  planTaskOnDay,
  setDailyBudget,
  setDayPlannedTasks,
  unplanTaskOnDay,
  type WeekDayRow,
} from '../data/week'
import { labels } from '../labels'

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Clavier des 7 jours (touches de piano du proto). */
function DayKeys({ days, selected }: { days: WeekDayRow[]; selected: Day }) {
  const navigate = useNavigate()
  return (
    <div className="my-1 mb-3.5 grid grid-cols-7 gap-1">
      {days.map((d) => {
        const on = d.day === selected
        return (
          <button
            key={d.day}
            type="button"
            aria-pressed={on}
            aria-label={labels.day.keyLabel(formatDayLabel(d.day))}
            onClick={() => navigate(`/semaine/jour/${d.day}`, { replace: true })}
            className={`relative flex h-[92px] flex-col items-center justify-end gap-0.5 rounded-b-[10px] border pb-2 text-xs ${
              on ? 'border-ebony bg-ebony text-screen' : 'border-line bg-key'
            }`}
          >
            {d.isToday && (
              <span className="absolute top-2 size-1.5 rounded-full bg-felt" aria-hidden="true" />
            )}
            {formatWeekdayShort(d.day)}
            <b className="text-[15px]">{parseDay(d.day).getDate()}</b>
            <i
              className={`text-[11px] not-italic tabular-nums ${on ? 'opacity-70' : 'text-muted'}`}
            >
              {formatDuration(d.budget)}
            </i>
          </button>
        )
      })}
    </div>
  )
}

function PlanSheet({
  day,
  planned,
  onClose,
}: {
  day: Day
  planned: string[]
  onClose: () => void
}) {
  const groups = useActiveTasksGrouped()
  const [checked, setChecked] = useState(() => new Set(planned))
  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  return (
    <Sheet
      open
      title={labels.day.planTitle(formatDayShort(day))}
      onClose={onClose}
      confirmLabel={labels.common.save}
      onConfirm={async () => {
        await setDayPlannedTasks(day, [...checked])
        onClose()
      }}
    >
      {groups && <TaskChecklist groups={groups} checked={checked} onToggle={toggle} />}
    </Sheet>
  )
}

/** Vue Jour (proto `V.jour`) : budget, réel, tâches prévues groupées par projet. */
export function DayScreen() {
  const { day = '' } = useParams()
  const valid = DAY_PATTERN.test(day)
  const ws = valid ? weekStart(day) : ''
  const now = useNow(30_000)
  const week = useWeekOverview(ws, now)
  const overview = useDayOverview(day, now)
  const dayTasks = useDayTasks(day, now)
  const plan = dayTasks?.planned
  const [planning, setPlanning] = useState(false)

  if (!valid) return <Navigate to="/semaine" replace />

  const plannedGap = overview && formatGap(overview.planned, overview.budget)
  // Le réel du jour compte les tâches prévues ET imprévues. Lot 9 : « Reste 0:20 ».
  const realGap = overview && formatRemaining(overview.real, overview.budget)
  const plannedIds = plan?.flatMap((g) => g.items.map((i) => i.task.id)) ?? []

  return (
    <Screen title={formatDayTitle(day)} subtitle={formatWeekLabel(ws)} back={`/semaine?w=${ws}`}>
      {week && <DayKeys days={week.days} selected={day} />}

      {overview && (
        <div className={ui.card}>
          <div className="flex items-center justify-between gap-3 py-1.5">
            <span>{labels.day.budget}</span>
            <DurationInput
              value={overview.budget}
              label={labels.week.budgetOf(formatDayLabel(day))}
              onCommit={(v) => setDailyBudget(day, v)}
            />
          </div>
          {/* Lot 8 (revu par le PO) : la carte ne montre que Budget et Réel, avec l'écart du réel. */}
          <div className="flex items-center justify-between gap-3 py-1.5" data-testid="day-real">
            <span>{labels.day.real}</span>
            <span className="text-right">
              <span className="font-semibold tabular-nums">{formatDuration(overview.real)}</span>
              {realGap && <small className="block text-xs text-muted">{realGap}</small>}
            </span>
          </div>
          <div className="pb-1.5">
            <Bar value={overview.real} reference={overview.budget} />
          </div>
        </div>
      )}

      <p className={ui.label}>{labels.day.plannedTasks}</p>
      {plan?.length === 0 && <p className={ui.fact}>{labels.day.noPlannedTasks}</p>}
      {plan?.map((group) => (
        <div key={group.project.id}>
          <ProjectGroupHeader project={group.project} color={group.color} />
          {group.items.map(({ task, section, plannedSec: durationSec, realSec, archived }, i) => (
            <div
              key={task.id}
              className={`flex items-center gap-2.5 py-2.5 text-sm ${i ? 'border-t border-line' : ''}`}
            >
              <div className="min-w-0 flex-1">
                {task.label}
                {archived && <span className="text-muted"> {labels.day.archived}</span>}
                <div className={ui.crumb}>
                  {section.name}
                  {realSec !== null && ` · ${labels.day.done(formatDuration(realSec))}`}
                </div>
              </div>
              <DurationInput
                value={durationSec}
                label={labels.day.plannedOf(task.label)}
                onCommit={(v) => planTaskOnDay(task.id, day, v)}
              />
              <button
                type="button"
                className={ui.iconButton}
                aria-label={labels.day.unplan(task.label)}
                onClick={() => unplanTaskOnDay(task.id, day)}
              >
                <CloseIcon />
              </button>
            </div>
          ))}
        </div>
      ))}

      <button type="button" className={`${ui.link} block`} onClick={() => setPlanning(true)}>
        {labels.day.planTasks}
      </button>

      {/* Prévu du jour face au budget : seul cas en rouge (R12). */}
      {overview && (overview.planned !== null || plannedGap) && (
        <p className={ui.fact} data-testid="day-facts">
          {overview.planned !== null && labels.day.planned(formatDuration(overview.planned))}
          {overview.planned !== null && plannedGap && ' · '}
          {plannedGap &&
            (overview.plannedOverBudget ? (
              <span className="font-bold text-over">▲ {plannedGap}</span>
            ) : (
              plannedGap
            ))}
        </p>
      )}

      {/* Lot 7 : tâches travaillées ce jour sans être prévues (statut recalculé à chaque affichage). */}
      {dayTasks && dayTasks.unplanned.length > 0 && (
        <section aria-label={labels.day.unplanned}>
          <p className={ui.label}>{labels.day.unplanned}</p>
          <p className={ui.fact}>{labels.day.unplannedHint}</p>
          {dayTasks.unplanned.map((group) => (
            <div key={group.project.id}>
              <ProjectGroupHeader project={group.project} color={group.color} />
              {group.items.map(({ task, section, realSec, archived }, i) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-2.5 py-2.5 text-sm ${i ? 'border-t border-line' : ''}`}
                >
                  <div className="min-w-0 flex-1">
                    {task.label}
                    {archived && <span className="text-muted"> {labels.day.archived}</span>}
                    <div className={ui.crumb}>
                      {section.name} · {labels.day.done(formatDuration(realSec))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-felt"
                    aria-label={labels.day.addToPlanLabel(task.label)}
                    onClick={() => planTaskOnDay(task.id, day, null)}
                  >
                    {labels.day.addToPlan}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {planning && <PlanSheet day={day} planned={plannedIds} onClose={() => setPlanning(false)} />}
    </Screen>
  )
}
