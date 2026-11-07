import { useState } from 'react'
import { CloseIcon } from '../components/icons'
import { Screen } from '../components/Screen'
import { useToast } from '../components/Toast'
import { ui } from '../components/ui'
import { addDays, formatDayLabel, today } from '../data/dates'
import { formatDuration, parseDuration } from '../data/durations'
import { useActiveTasksGrouped, useManualEntries } from '../data/hooks'
import { addManualEntry, deleteManualEntry } from '../data/sessions'
import { labels } from '../labels'

/** Jours proposés : les 14 derniers, aujourd'hui en premier (décision PO). */
const DAYS_BACK = 14

/** Ajout manuel d'une durée oubliée (proto `V.manuel`). */
export function ManualEntryScreen() {
  const groups = useActiveTasksGrouped()
  const recent = useManualEntries()
  const [days] = useState(() => Array.from({ length: DAYS_BACK }, (_, i) => addDays(today(), -i)))
  const [taskId, setTaskId] = useState('')
  const [day, setDay] = useState(days[0])
  const [duration, setDuration] = useState('')
  const toast = useToast()

  const add = async () => {
    if (!taskId) return toast(labels.manual.errChooseTask)
    const sec = parseDuration(duration)
    if (sec === null || sec <= 0) return toast(labels.manual.errDuration)
    await addManualEntry(taskId, day, sec)
    setTaskId('')
    setDuration('')
    toast(labels.manual.added)
  }

  return (
    <Screen title={labels.manual.title} subtitle={labels.manual.subtitle} back="/">
      <label htmlFor="manual-task" className={ui.label}>
        {labels.manual.task}
      </label>
      <select
        id="manual-task"
        className={ui.input}
        value={taskId}
        onChange={(e) => setTaskId(e.target.value)}
      >
        <option value="">{labels.manual.chooseTask}</option>
        {groups?.map(({ project, sections }) => (
          <optgroup key={project.id} label={project.name}>
            {sections.flatMap(({ section, tasks }) =>
              tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {labels.history.path(section.name, task.label)}
                </option>
              )),
            )}
          </optgroup>
        ))}
      </select>

      <label htmlFor="manual-day" className={ui.label}>
        {labels.manual.day}
      </label>
      <select
        id="manual-day"
        className={ui.input}
        value={day}
        onChange={(e) => setDay(e.target.value)}
      >
        {days.map((d) => (
          <option key={d} value={d}>
            {formatDayLabel(d)}
          </option>
        ))}
      </select>

      <label htmlFor="manual-duration" className={ui.label}>
        {labels.manual.duration}
      </label>
      <input
        id="manual-duration"
        inputMode="numeric"
        className={ui.input}
        placeholder={labels.manual.durationPlaceholder}
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
      />

      <button type="button" className={`${ui.primary} mt-4`} onClick={add}>
        {labels.manual.add}
      </button>

      <p className={ui.label}>{labels.manual.recent}</p>
      {recent?.length === 0 && <p className={ui.fact}>{labels.manual.none}</p>}
      {recent?.map(({ entry, context }, i) => (
        <div
          key={entry.id}
          className={`flex items-center gap-2.5 py-2.5 text-sm ${i ? 'border-t border-line' : ''}`}
        >
          <div className="min-w-0 flex-1">
            {context.task.label}
            <div className={ui.crumb}>{formatDayLabel(entry.day)}</div>
          </div>
          <span className="font-semibold tabular-nums">{formatDuration(entry.durationSec)}</span>
          <button
            type="button"
            className={ui.iconButton}
            aria-label={labels.manual.remove(context.task.label)}
            onClick={() => deleteManualEntry(entry.id)}
          >
            <CloseIcon />
          </button>
        </div>
      ))}
    </Screen>
  )
}
