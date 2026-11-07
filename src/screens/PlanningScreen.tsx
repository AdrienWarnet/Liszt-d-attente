import { useParams } from 'react-router'
import { Screen } from '../components/Screen'
import { useToast } from '../components/Toast'
import { ui } from '../components/ui'
import { useNow } from '../components/useNow'
import { formatWeekLabel, formatWeekShort } from '../data/dates'
import { useProjectPlanning } from '../data/hooks'
import { toggleSectionWeek, type SectionPlanning } from '../data/planning'
import type { WeekStart } from '../data/types'
import { labels } from '../labels'
import { ProgressField } from './projects/SectionCard'

const cellBox = 'block h-7 w-[46px] rounded-[7px] border'

function Cells({
  plan,
  weeks,
  kind,
}: {
  plan: SectionPlanning
  weeks: WeekStart[]
  kind: 'initial' | 'revised'
}) {
  const toast = useToast()
  const name = plan.section.name
  if (kind === 'initial') {
    return weeks.map((w) => {
      const on = plan.initialWeeks.includes(w)
      return (
        <td key={w}>
          <span
            role="img"
            aria-label={labels.planning.initialCell(name, formatWeekLabel(w), on)}
            className={`${cellBox} ${on ? 'border-line bg-line' : 'border-line'}`}
          />
        </td>
      )
    })
  }
  return weeks.map((w) => {
    const on = plan.revisedWeeks.includes(w)
    return (
      <td key={w}>
        {/* Case de 46 × 28 px dessinée, zone tactile de 44 px de haut. */}
        <button
          type="button"
          aria-pressed={on}
          aria-label={labels.planning.cell(name, formatWeekLabel(w), on)}
          className="grid h-11 w-[46px] place-items-center"
          onClick={async () => {
            if (await toggleSectionWeek(plan.section.id, w)) toast(labels.planning.firstPlacement)
          }}
        >
          <span className={`${cellBox} ${on ? 'border-felt bg-felt' : 'border-line'}`} />
        </button>
      </td>
    )
  })
}

/** Planning d'un projet (proto `V.planning`) : prévu initial figé, prévu revu modifiable. */
export function PlanningScreen() {
  const { id } = useParams()
  const now = useNow(60_000)
  const planning = useProjectPlanning(id, now)
  const back = `/projets/${id}`

  if (!planning) return <Screen title={labels.planning.title} back={back} />
  const { weeks, currentWeek, sections, project } = planning
  // Nom figé à gauche : largeur fixée sur un bloc interne (une cellule de tableau ignore min/max-width).
  const name = 'sticky left-0 z-[1] bg-screen pr-2'
  const nameText = (text: string) => (
    <div className="w-[102px] truncate text-[13px] font-semibold">{text}</div>
  )
  const kindCell = 'min-w-[44px] pr-1.5 text-[11px] whitespace-nowrap text-muted'

  return (
    <Screen title={labels.planning.title} subtitle={project.name} back={back}>
      <div className="my-2.5 flex gap-3.5 text-xs text-muted">
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-3.5 rounded-[3px] bg-line align-middle" />
          {labels.planning.initial}
        </span>
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-3.5 rounded-[3px] bg-felt align-middle" />
          {labels.planning.revised}
        </span>
      </div>

      <div className="-mx-5 overflow-x-auto px-5">
        <table className="border-separate border-spacing-[3px] text-xs">
          <thead>
            <tr>
              <th />
              <th />
              {weeks.map((w) => (
                <th
                  key={w}
                  className={`min-w-[46px] py-1 text-center font-semibold ${w === currentWeek ? 'text-felt' : 'text-muted'}`}
                >
                  {formatWeekShort(w)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.flatMap((plan) =>
              plan.initialWeeks.length > 0
                ? [
                    <tr key={`${plan.section.id}-i`}>
                      <td rowSpan={2} className={name}>
                        {nameText(plan.section.name)}
                      </td>
                      <td className={kindCell}>{labels.planning.rowInitial}</td>
                      <Cells plan={plan} weeks={weeks} kind="initial" />
                    </tr>,
                    <tr key={`${plan.section.id}-r`}>
                      <td className={kindCell}>{labels.planning.rowRevised}</td>
                      <Cells plan={plan} weeks={weeks} kind="revised" />
                    </tr>,
                  ]
                : [
                    <tr key={plan.section.id}>
                      <td className={name}>{nameText(plan.section.name)}</td>
                      <td className={kindCell}>{labels.planning.rowToPlace}</td>
                      <Cells plan={plan} weeks={weeks} kind="revised" />
                    </tr>,
                  ],
            )}
          </tbody>
        </table>
      </div>
      <p className={ui.fact}>{labels.planning.hint}</p>

      <p className={ui.label}>{labels.planning.progress}</p>
      {sections.map((plan) => (
        <div key={plan.section.id}>
          <div className="mt-2 text-xs text-muted">
            {plan.section.name}
            {plan.changed && plan.initialWeeks.length > 0 && (
              <span className="ml-1.5 rounded-full bg-felt-soft px-[7px] py-0.5 text-[11px] font-bold text-felt">
                {labels.planning.changed}
              </span>
            )}
          </div>
          <ProgressField section={plan.section} placeholder={labels.planning.progressPlaceholder} />
        </div>
      ))}
    </Screen>
  )
}
