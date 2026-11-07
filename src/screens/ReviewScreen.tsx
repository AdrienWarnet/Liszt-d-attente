import { useState } from 'react'
import { Screen } from '../components/Screen'
import { useToast } from '../components/Toast'
import { ui } from '../components/ui'
import { today, weekDays, weekStart } from '../data/dates'
import { formatDuration } from '../data/durations'
import { useActiveTasksGrouped, useRealTimeByTask } from '../data/hooks'
import { archiveTasks } from '../data/projects'
import { labels } from '../labels'
import { AddTaskInput, ProgressField } from './projects/SectionCard'

/** Revue de semaine (proto `V.revue`) : archiver, ajouter, mettre à jour l'avancement. */
export function ReviewScreen() {
  const groups = useActiveTasksGrouped()
  const [now] = useState(() => Date.now())
  const [days] = useState(() => weekDays(weekStart(today())))
  const realByTask = useRealTimeByTask(days, now)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const toast = useToast()

  const toggle = (taskId: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })

  const archiveSelection = async () => {
    const ids = [...selected]
    await archiveTasks(ids)
    setSelected(new Set())
    toast(labels.review.archived(ids.length))
  }

  return (
    <Screen title={labels.review.title} subtitle={labels.review.subtitle} back="/projets">
      {groups?.length === 0 && <p className={ui.fact}>{labels.review.empty}</p>}

      {groups?.map(({ project, sections }) => (
        <section key={project.id} aria-label={project.name}>
          <h2 className="mt-4 mb-0.5 text-sm font-bold">{project.name}</h2>
          {sections.map(({ section, tasks }) => (
            <div key={section.id}>
              <p className="mt-2 text-xs text-muted">{section.name}</p>
              <ProgressField section={section} placeholder={labels.projects.progressPlaceholder} />
              {tasks.map((task) => (
                <label
                  key={task.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 border-t border-line py-2.5"
                >
                  <input
                    type="checkbox"
                    className="size-[22px] shrink-0 accent-felt"
                    checked={selected.has(task.id)}
                    onChange={() => toggle(task.id)}
                  />
                  <span className="min-w-0 flex-1">{task.label}</span>
                  <span className={`${ui.crumb} tabular-nums`}>
                    {formatDuration(realByTask?.get(task.id) ?? null)}
                  </span>
                </label>
              ))}
              <AddTaskInput section={section} />
            </div>
          ))}
        </section>
      ))}

      <p className={`${ui.fact} mt-3`}>{labels.review.hint}</p>
      <button
        type="button"
        className={`${ui.primary} mt-3`}
        disabled={selected.size === 0}
        onClick={archiveSelection}
      >
        {labels.review.archiveSelection(selected.size)}
      </button>
    </Screen>
  )
}
