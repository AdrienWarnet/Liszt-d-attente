import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Bar } from '../components/Bar'
import { ColumnChart } from '../components/ColumnChart'
import { Screen } from '../components/Screen'
import { Tiles } from '../components/Tiles'
import { ui } from '../components/ui'
import { useNow } from '../components/useNow'
import { WeekNav } from '../components/WeekNav'
import { addWeeks, today, weekStart } from '../data/dates'
import { formatDuration } from '../data/durations'
import { useWeeklyReport } from '../data/hooks'
import type { ProjectColor } from '../data/projects'
import type { ReportProject, WeeklyReport } from '../data/report'
import { formatGap } from '../data/week'
import { labels } from '../labels'

const colorVar = (color: ProjectColor) => ({ background: `var(--color-${color})` })
const swatch = 'mr-1.5 inline-block size-2.5 rounded-[3px] align-[-1px]'

function ProjectCard({ p }: { p: ReportProject }) {
  const words = labels.report
  const gap =
    p.real !== null && p.planned !== null && p.real > p.planned
      ? formatGap(p.real, p.planned, 'planned')
      : null
  return (
    <div
      className="flex flex-col gap-1.5 border-t border-line pt-3.5 pb-1"
      data-testid="report-project"
    >
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="min-w-0 text-[15px]">
          <i className={swatch} style={colorVar(p.color)} aria-hidden="true" />
          <b>{p.project.name}</b>
          {p.deleted && <span className="text-muted"> {labels.day.deleted}</span>}
        </span>
        <span className="whitespace-nowrap tabular-nums">
          <strong className="text-xl">{formatDuration(p.real)}</strong>
          <small className="text-xs text-muted">
            {p.planned !== null ? words.ofPlanned(formatDuration(p.planned)) : words.noPlannedShort}
          </small>
        </span>
      </div>
      {p.planned !== null && <Bar value={p.real} reference={p.planned} />}
      <p className={ui.fact}>
        {p.planned !== null
          ? words.plannedPct(p.plannedPct ?? 0) + (gap ? ` · ${gap}` : '')
          : words.noProjectPlan}
      </p>

      <details>
        <summary className="flex min-h-11 cursor-pointer items-center text-[13px] font-semibold text-felt">
          {words.seeSections(p.sections.length)}
        </summary>
        <div className="my-1 flex flex-col gap-1.5">
          {p.sections.map((s) => (
            <div
              key={s.section.id}
              className="grid grid-cols-[minmax(0,1.3fr)_1fr_auto] items-center gap-2.5 text-[13px]"
            >
              <span className="truncate">{s.section.name}</span>
              <span className="relative h-1.5 overflow-hidden rounded-[3px] bg-line">
                <i
                  className="absolute inset-y-0 left-0 rounded-[3px]"
                  style={{ ...colorVar(p.color), width: `${s.sharePct ?? 0}%` }}
                />
              </span>
              <span className="font-semibold tabular-nums">{formatDuration(s.real)}</span>
            </div>
          ))}
        </div>
      </details>

      <details>
        <summary className="flex min-h-11 cursor-pointer items-center text-[13px] font-semibold text-felt">
          {words.seeTasks(p.taskCount)}
        </summary>
        {p.sections.flatMap((s) =>
          s.tasks.map((t) => (
            <div
              key={t.task.id}
              className="flex justify-between gap-2.5 border-t border-line py-1.5 text-[13px]"
            >
              <span>
                {t.task.label}
                {t.archived && <span className="text-muted"> {labels.day.archived}</span>}
                <span className={`${ui.crumb} block`}>{s.section.name}</span>
              </span>
              <span className="text-right text-muted tabular-nums">
                {t.planned !== null && words.taskPlanned(formatDuration(t.planned))}
                {formatDuration(t.real)}
              </span>
            </div>
          )),
        )}
      </details>

      {!p.deleted && (
        <Link to={`/projets/${p.project.id}/bilan`} className={`${ui.link} block`}>
          {words.projectReport}
        </Link>
      )}
    </div>
  )
}

function Dashboard({ report }: { report: WeeklyReport }) {
  const words = labels.report
  const [selected, setSelected] = useState<number | null>(null)
  const gap = formatGap(report.week.real, report.week.budget)
  const withReal = report.projects.filter((p) => p.real)

  return (
    <>
      <Tiles
        tiles={[
          {
            label: (
              <>
                {report.live && (
                  <i
                    className="mr-1.5 inline-block size-[7px] rounded-full bg-felt align-middle"
                    aria-label={words.live}
                  />
                )}
                {words.real}
              </>
            ),
            value: formatDuration(report.week.real),
          },
          { label: words.budget, value: formatDuration(report.week.budget) },
          { label: words.plannedProjects, value: formatDuration(report.week.plannedProjects) },
        ]}
      />
      <Bar value={report.week.real} reference={report.week.budget} />
      <p className={`${ui.fact} mt-1.5 mb-3.5`}>
        {gap ? words.realGap(gap) : words.noBudget}
        {report.live && words.liveNote}
      </p>

      <section className={ui.panel} aria-label={words.byDay}>
        <h3 className="text-[15px] font-bold">{words.byDay}</h3>
        <ColumnChart
          kind="budget"
          selected={selected ?? report.defaultSelectedDay}
          onSelect={setSelected}
          columns={report.days.map((d) => ({
            label: d.shortLabel,
            full: d.fullLabel,
            real: d.real,
            reference: d.budget,
          }))}
        />
        <p className={`${ui.fact} mt-1.5`}>{words.tapDay}</p>
      </section>

      <section className={ui.panel} aria-label={words.byProject}>
        <h3 className="text-[15px] font-bold">{words.byProject}</h3>
        {report.week.real ? (
          <>
            <p className={ui.fact}>{words.split}</p>
            <div className="my-1 mb-1.5 flex h-3.5 gap-0.5 overflow-hidden rounded-[5px]">
              {withReal.map((p) => (
                <span
                  key={p.project.id}
                  className="h-full"
                  style={{ ...colorVar(p.color), width: `${p.sharePct}%` }}
                  title={p.project.name}
                />
              ))}
            </div>
            <div className="mb-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted">
              {withReal.map((p) => (
                <span key={p.project.id}>
                  <i className={swatch} style={colorVar(p.color)} aria-hidden="true" />
                  {p.project.name}{' '}
                  <b className="text-ink tabular-nums">{words.percent(p.sharePct ?? 0)}</b>
                </span>
              ))}
            </div>
          </>
        ) : null}
        {report.projects.map((p) => (
          <ProjectCard key={p.project.id} p={p} />
        ))}
      </section>

      <section className={ui.panel} aria-label={words.planningOfWeek}>
        <h3 className="text-[15px] font-bold">{words.planningOfWeek}</h3>
        {report.planning.length === 0 && <p className={ui.fact}>{words.noPlacement}</p>}
        {report.planning.map((g) => (
          <div key={g.project.id}>
            <p className="mt-2.5 mb-1.5 text-xs text-muted">
              <i className={swatch} style={colorVar(g.color)} aria-hidden="true" />
              {g.project.name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {g.sections.map(({ section, inInitial }) => (
                <span
                  key={section.id}
                  className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 text-xs"
                >
                  {section.name}
                  <span className="text-muted">
                    {inInitial ? words.inInitial : words.addedToRevised}
                  </span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  )
}

/** Onglet Bilan : tableau de bord de la semaine (proto `V.bilan`). */
export function ReportScreen() {
  const [params, setParams] = useSearchParams()
  const ws = params.get('w') ?? weekStart(today())
  // Rafraîchi toutes les 5 s (comme le proto) : la session en cours est comptée en direct.
  const now = useNow(5000)
  const report = useWeeklyReport(ws, now)

  return (
    <Screen title={labels.tabs.review}>
      <WeekNav
        weekStart={ws}
        onMove={(d) => setParams({ w: addWeeks(ws, d) }, { replace: true })}
      />
      {report?.isEmpty && (
        <p className="px-2.5 py-10 text-center leading-normal text-muted">{labels.report.empty}</p>
      )}
      {/* `key` : la sélection du graphique repart du jour par défaut quand on change de semaine. */}
      {report && !report.isEmpty && <Dashboard key={ws} report={report} />}
    </Screen>
  )
}
