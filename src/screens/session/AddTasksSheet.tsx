import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { TaskChecklist } from '../../components/TaskChecklist'
import { useToast } from '../../components/Toast'
import { ui } from '../../components/ui'
import { today } from '../../data/dates'
import { useActiveTasksGrouped, useDayPlan, useSessionView } from '../../data/hooks'
import type { ActiveTasksGroup } from '../../data/projects'
import { addTasksToSession, createTaskInSession } from '../../data/sessions'
import type { PlannedTask } from '../../data/week'
import { labels } from '../../labels'

interface Props {
  sessionId: string
  onClose: () => void
}

/** Feuille « Ajouter des tâches » (proto `SH.addTasks`). */
export function AddTasksSheet({ sessionId, onClose }: Props) {
  const [now] = useState(() => Date.now())
  const groups = useActiveTasksGrouped()
  const plan = useDayPlan(today())
  const view = useSessionView(sessionId, now)
  if (!groups || !plan || !view) return null
  const inSession = view.groups.flatMap((g) => g.items.map((i) => i.task.id))
  const planned = plan.flatMap((g) => g.items).filter((i) => !i.archived)
  return (
    <SheetContent
      sessionId={sessionId}
      onClose={onClose}
      groups={groups}
      planned={planned}
      initial={inSession}
    />
  )
}

function SheetContent({
  sessionId,
  onClose,
  groups,
  planned,
  initial,
}: Props & { groups: ActiveTasksGroup[]; planned: PlannedTask[]; initial: string[] }) {
  // Lot 6 : la feuille ne fait qu'ajouter. Les tâches déjà dans la session sont cochées et
  // grisées ; on les retire depuis la session (✕, tant qu'elles sont à 0:00:00).
  const [inSession] = useState(() => new Set(initial))
  const [checked, setChecked] = useState(() => new Set<string>())
  const [sectionId, setSectionId] = useState('')
  const [label, setLabel] = useState('')
  const toast = useToast()
  const plannedIds = new Set(planned.map((p) => p.task.id))

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const confirm = async () => {
    if (label.trim() !== '' && sectionId === '') {
      toast(labels.session.chooseSection)
      return
    }
    await addTasksToSession(sessionId, [...checked])
    if (label.trim() !== '') await createTaskInSession(sessionId, sectionId, label)
    onClose()
  }

  const check = (id: string, text: string, crumb?: string) => (
    <label
      key={id}
      className="flex min-h-11 cursor-pointer items-center gap-3 border-t border-line py-2.5"
    >
      <input
        type="checkbox"
        className="size-[22px] shrink-0 accent-felt"
        checked={inSession.has(id) || checked.has(id)}
        disabled={inSession.has(id)}
        onChange={() => toggle(id)}
      />
      <span className="min-w-0 flex-1">
        {text}
        {crumb && <span className={`${ui.crumb} block`}>{crumb}</span>}
        {inSession.has(id) && (
          <span className="block text-xs text-muted">{labels.session.alreadyIn}</span>
        )}
      </span>
    </label>
  )

  return (
    <Sheet
      open
      title={labels.session.addTasksTitle}
      onClose={onClose}
      confirmLabel={labels.session.addToSession}
      onConfirm={confirm}
    >
      {planned.length > 0 && (
        <div>
          <div className="mt-4 mb-0.5 text-sm font-bold">{labels.session.plannedToday}</div>
          {planned.map((p) =>
            check(p.task.id, p.task.label, `${p.project.name} › ${p.section.name}`),
          )}
        </div>
      )}
      <TaskChecklist
        groups={groups}
        checked={checked}
        onToggle={toggle}
        exclude={plannedIds}
        locked={inSession}
        lockedHint={labels.session.alreadyIn}
      />

      <div className="mt-4 mb-1 text-sm font-bold">{labels.session.createTask}</div>
      <select
        className={ui.input}
        aria-label={labels.session.sectionRequired}
        value={sectionId}
        onChange={(e) => setSectionId(e.target.value)}
      >
        <option value="">{labels.session.sectionRequired}</option>
        {groups.map(({ project, sections }) => (
          <optgroup key={project.id} label={project.name}>
            {sections.map(({ section }) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <input
        className={`${ui.input} mt-2`}
        aria-label={labels.session.newTaskLabel}
        placeholder={labels.session.taskLabelPlaceholder}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
    </Sheet>
  )
}
