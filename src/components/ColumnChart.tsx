import { formatDuration } from '../data/durations'
import type { DurationSec } from '../data/types'
import { formatGap, type GapRef } from '../data/week'
import { labels } from '../labels'

export interface ChartColumn {
  label: string
  full: string
  real: DurationSec | null
  /** Référence : budget du jour ou temps prévu de la semaine. */
  reference: DurationSec | null
}

interface ColumnChartProps {
  columns: ChartColumn[]
  selected: number
  onSelect: (index: number) => void
  kind: GapRef
}

// Géométrie du proto (`colChart`) : viewBox 340 × 150.
const W = 340
const H = 150
const LEFT = 26
const BASE = 128
const TOP = 12

/** Colonne à coins hauts arrondis. */
function topRounded(x: number, y: number, w: number, h: number, className: string) {
  if (h <= 4) return <rect className={className} x={x} y={y} width={w} height={Math.max(0, h)} />
  return (
    <path
      className={className}
      d={`M${x},${y + h}V${y + 4}q0,-4 4,-4h${w - 8}q4,0 4,4V${y + h}z`}
    />
  )
}

/**
 * Graphique en colonnes du bilan (SVG maison) : la référence est une colonne claire en
 * pointillés, le réel la remplit, la part au-dessus de la référence est en `ink`.
 */
export function ColumnChart({ columns, selected, onSelect, kind }: ColumnChartProps) {
  const words = labels.report.chart
  const refWord = kind === 'budget' ? words.budgetLegend : words.plannedLegend
  const peak = Math.max(3600, ...columns.map((c) => Math.max(c.real ?? 0, c.reference ?? 0)))
  const hours = Math.ceil(peak / 3600)
  const step = hours > 6 ? 2 : 1
  const max = Math.ceil(hours / step) * step * 3600
  const y = (v: number) => BASE - (v / max) * (BASE - TOP)
  const cw = (W - LEFT) / columns.length
  const bw = Math.min(28, cw * 0.6)

  const grid = []
  for (let h = 0; h <= max / 3600; h += step) {
    grid.push(
      <g key={h}>
        <line className="stroke-line" x1={LEFT} x2={W} y1={y(h * 3600)} y2={y(h * 3600)} />
        <text className="fill-muted text-[10px]" x={LEFT - 6} y={y(h * 3600) + 3} textAnchor="end">
          {words.hours(h)}
        </text>
      </g>,
    )
  }

  const current = columns[selected]
  const gap = current && formatGap(current.real, current.reference, kind)

  return (
    <div>
      {current && (
        <div className="my-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-xl bg-felt-soft px-3 py-2 text-[13px] tabular-nums">
          <b className="w-full">{current.full}</b>
          <span>
            {words.realLegend} <strong className="text-base">{formatDuration(current.real)}</strong>
            {' · '}
            {refWord} <strong className="text-base">{formatDuration(current.reference)}</strong>
          </span>
          <em className="text-xs text-muted not-italic">
            {gap ??
              (current.reference === null
                ? kind === 'budget'
                  ? words.noBudget
                  : words.noPlan
                : '')}
          </em>
        </div>
      )}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={words.aria(refWord.toLowerCase())}
        className="block h-auto w-full"
      >
        {grid}
        {columns.map((c, i) => {
          const x = LEFT + cw * i + cw / 2 - bw / 2
          const r = c.real ?? 0
          const b = c.reference
          const inBudget = b !== null ? Math.min(r, b) : r
          const on = i === selected
          return (
            <g key={i} data-selected={on || undefined}>
              <g className={on ? '' : 'opacity-45'}>
                {b !== null &&
                  b > 0 &&
                  topRounded(
                    x,
                    y(b),
                    bw,
                    BASE - y(b),
                    'fill-felt-soft stroke-felt [stroke-dasharray:3_2]',
                  )}
                {r > 0 &&
                  (b !== null && r > b ? (
                    <>
                      <rect
                        className="fill-felt"
                        x={x}
                        y={y(inBudget)}
                        width={bw}
                        height={BASE - y(inBudget)}
                      />
                      {topRounded(x, y(r), bw, Math.max(0, y(inBudget) - y(r) - 2), 'fill-ink')}
                    </>
                  ) : (
                    topRounded(x, y(inBudget), bw, BASE - y(inBudget), 'fill-felt')
                  ))}
              </g>
              {on && c.real !== null && (
                <text
                  className="fill-ink text-[10px] font-bold"
                  x={x + bw / 2}
                  y={y(Math.max(r, b ?? 0)) - 5}
                  textAnchor="middle"
                >
                  {formatDuration(c.real)}
                </text>
              )}
              <text
                className={`text-[10px] ${on ? 'fill-ink font-bold' : 'fill-muted'}`}
                x={x + bw / 2}
                y={H - 6}
                textAnchor="middle"
              >
                {c.label}
              </text>
              <rect
                className="cursor-pointer fill-transparent outline-none"
                x={LEFT + cw * i}
                y={0}
                width={cw}
                height={H}
                role="button"
                tabIndex={0}
                aria-label={c.full}
                aria-pressed={on}
                onClick={() => onSelect(i)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(i)}
              />
            </g>
          )
        })}
      </svg>
      <div className="mt-1.5 flex flex-wrap gap-3.5 text-xs text-muted">
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-3 rounded-[3px] bg-felt align-middle" />
          {words.realLegend}
        </span>
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-3 rounded-[3px] border border-dashed border-felt bg-felt-soft align-middle" />
          {refWord}
        </span>
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-3 rounded-[3px] bg-ink align-middle" />
          {kind === 'budget' ? words.overBudget : words.overPlanned}
        </span>
      </div>
    </div>
  )
}
