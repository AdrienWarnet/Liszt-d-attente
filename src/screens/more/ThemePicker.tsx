import { useState } from 'react'
import { labels } from '../../labels'
import { getThemeChoice, setThemeChoice, type ThemeChoice } from '../../theme'

const CHOICES: ThemeChoice[] = ['auto', 'light', 'dark']

/** Choix du thème (lot 2) : Automatique / Clair / Sombre. */
export function ThemePicker() {
  const [choice, setChoice] = useState(getThemeChoice)
  return (
    <div className="border-b border-line py-3">
      <p className="mb-2 font-semibold" id="theme-label">
        {labels.more.theme}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="theme-label"
        className="grid grid-cols-3 gap-1 rounded-[14px] border border-line p-1"
      >
        {CHOICES.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={choice === c}
            onClick={() => {
              setThemeChoice(c)
              setChoice(c)
            }}
            className={`min-h-11 rounded-[10px] text-sm font-semibold ${
              choice === c ? 'bg-ink text-screen' : 'text-muted'
            }`}
          >
            {labels.more.themes[c]}
          </button>
        ))}
      </div>
    </div>
  )
}
