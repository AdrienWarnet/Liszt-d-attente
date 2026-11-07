import { useState } from 'react'
import { formatDuration, parseDuration } from '../data/durations'
import type { DurationSec } from '../data/types'
import { labels } from '../labels'
import { useToast } from './Toast'

export const durationBox =
  'w-[76px] shrink-0 rounded-[10px] bg-felt-soft px-2.5 py-2.5 text-right font-bold text-felt tabular-nums'

interface DurationInputProps {
  value: DurationSec | null
  /** Appelé à la sortie du champ si la valeur a changé ; `null` = champ vidé (non saisi). */
  onCommit: (value: DurationSec | null) => unknown
  label: string
}

/**
 * Champ durée du proto : affiche `h:mm` ou « — », accepte « 45 », « 1:30 », « 1h30 ».
 * Une saisie illisible est refusée (message bref) et la valeur précédente revient.
 */
export function DurationInput({ value, onCommit, label }: DurationInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const toast = useToast()
  const shown = value === null ? '' : formatDuration(value)

  const commit = () => {
    if (draft === null) return
    setDraft(null)
    if (draft.trim() === '') {
      if (value !== null) onCommit(null)
      return
    }
    const parsed = parseDuration(draft)
    if (parsed === null) toast(labels.duration.invalid)
    else if (parsed !== value) onCommit(parsed)
  }

  return (
    <input
      inputMode="numeric"
      aria-label={label}
      placeholder={labels.emptyValue}
      className={`${durationBox} placeholder:text-felt/60`}
      value={draft ?? shown}
      onFocus={(e) => {
        setDraft(shown)
        e.currentTarget.select()
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  )
}
