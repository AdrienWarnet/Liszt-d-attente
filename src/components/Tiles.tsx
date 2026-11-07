import type { ReactNode } from 'react'

export interface Tile {
  label: ReactNode
  value: ReactNode
  hint?: string
}

/** Trois chiffres clés du bilan (proto `.tiles`). */
export function Tiles({ tiles }: { tiles: Tile[] }) {
  return (
    <div className="my-1.5 mb-2.5 grid grid-cols-3 gap-2">
      {tiles.map((t, i) => (
        <div key={i} className="min-w-0 rounded-[14px] bg-felt-soft px-3 py-2.5">
          <span className="block text-xs font-semibold text-muted">{t.label}</span>
          <b className="mt-0.5 block text-[22px] font-bold whitespace-nowrap tabular-nums">
            {t.value}
          </b>
          {t.hint && <small className="text-[11px] text-muted">{t.hint}</small>}
        </div>
      ))}
    </div>
  )
}
