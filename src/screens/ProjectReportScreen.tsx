import { useState } from 'react'
import { useParams } from 'react-router'
import { ColumnChart } from '../components/ColumnChart'
import { Screen } from '../components/Screen'
import { Tiles } from '../components/Tiles'
import { ui } from '../components/ui'
import { useNow } from '../components/useNow'
import { formatDuration } from '../data/durations'
import { useProjectReport } from '../data/hooks'
import type { ProjectReport } from '../data/report'
import { labels } from '../labels'

const line = 'flex justify-between gap-2.5 text-[13px]'

function Sections({ report }: { report: ProjectReport }) {
  const words = labels.report
  const max = Math.max(1, ...report.sections.map((s) => s.real ?? 0))
  return report.sections.map((s) => (
    <details key={s.section.id} className="border-t border-line py-2.5 first-of-type:border-t-0">
      <summary className="cursor-pointer list-none">
        <div className="mb-1.5 flex justify-between gap-2.5 text-sm">
          <b>{s.section.name}</b>
          <span className="whitespace-nowrap text-muted tabular-nums">
            {words.sectionReal(formatDuration(s.real))}
          </span>
        </div>
        <div className="relative h-3 rounded bg-felt-soft">
          <span
            className="absolute inset-y-0 left-0 rounded"
            style={{
              width: `${((s.real ?? 0) / max) * 100}%`,
              background: `var(--color-${report.color})`,
            }}
          />
        </div>
      </summary>
      <div className="flex flex-col gap-1 pt-2 pl-3.5 text-muted">
        <div className={line}>
          <span className="text-ink">{words.planningLabel}</span>
          <span className="text-right">{words.planningLine(s.initialRange, s.revisedRange)}</span>
        </div>
        <div className={line}>
          <span className="text-ink">{words.progressLabel}</span>
          <span className="text-right">{s.progress ?? labels.emptyValue}</span>
        </div>
        {s.tasks.map((t) => (
          <div key={t.task.id} className={line}>
            <span className="text-ink">
              · {t.task.label}
              {t.archived && <span className="text-muted"> {labels.day.archived}</span>}
            </span>
            <span className="tabular-nums">{formatDuration(t.real)}</span>
          </div>
        ))}
      </div>
    </details>
  ))
}

/** Bilan d'un projet sur toute sa durée (proto `V.bilanProjet`). */
export function ProjectReportScreen() {
  const { id } = useParams()
  const now = useNow(5000)
  const report = useProjectReport(id, now)
  const [selected, setSelected] = useState<number | null>(null)
  const words = labels.report

  return (
    <Screen title={words.projectTitle} subtitle={report?.project.name} back={`/projets/${id}`}>
      {report && (
        <>
          <Tiles
            tiles={[
              { label: words.realTotal, value: formatDuration(report.realTotal) },
              { label: words.weeks, value: report.weeksWorked, hint: words.weeksWorked },
              { label: words.tasks, value: report.activeTaskCount, hint: words.tasksActive },
            ]}
          />
          <section className={ui.panel} aria-label={words.byWeek}>
            <h3 className="text-[15px] font-bold">{words.byWeek}</h3>
            <ColumnChart
              kind="planned"
              selected={selected ?? report.defaultSelectedWeek}
              onSelect={setSelected}
              columns={report.weeks.map((w) => ({
                label: w.shortLabel,
                full: w.fullLabel,
                real: w.real,
                reference: w.planned,
              }))}
            />
            <p className={`${ui.fact} mt-1.5`}>{words.tapWeek}</p>
          </section>
          <section className={ui.panel} aria-label={words.bySection}>
            <h3 className="text-[15px] font-bold">{words.bySection}</h3>
            <p className={ui.fact}>{words.tapSection}</p>
            <Sections report={report} />
          </section>
        </>
      )}
    </Screen>
  )
}
