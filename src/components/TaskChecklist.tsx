import type { ActiveTasksGroup } from '../data/projects'

interface TaskChecklistProps {
  groups: readonly ActiveTasksGroup[]
  checked: ReadonlySet<string>
  onToggle: (taskId: string) => void
  /** Tâches déjà proposées ailleurs dans la feuille (ex. « Prévu aujourd'hui »). */
  exclude?: ReadonlySet<string>
  /** Tâches cochées d'office et non décochables (ex. déjà dans la session), avec une mention. */
  locked?: ReadonlySet<string>
  lockedHint?: string
}

/** Tâches actives groupées projet → section, cases à cocher (feuilles du proto). */
export function TaskChecklist({
  groups,
  checked,
  onToggle,
  exclude,
  locked,
  lockedHint,
}: TaskChecklistProps) {
  return (
    <>
      {groups.map(({ project, sections }) => (
        <div
          key={project.id}
          hidden={sections.every((s) => s.tasks.every((t) => exclude?.has(t.id)))}
        >
          <div className="mt-4 mb-0.5 text-sm font-bold">{project.name}</div>
          {sections
            .map(({ section, tasks }) => ({
              section,
              tasks: tasks.filter((t) => !exclude?.has(t.id)),
            }))
            .filter((s) => s.tasks.length > 0)
            .map(({ section, tasks }) => (
              <div key={section.id}>
                <div className="mt-2 text-xs text-muted">{section.name}</div>
                {tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex min-h-11 cursor-pointer items-center gap-3 border-t border-line py-2.5"
                  >
                    <input
                      type="checkbox"
                      className="size-[22px] shrink-0 accent-felt"
                      checked={locked?.has(task.id) || checked.has(task.id)}
                      disabled={locked?.has(task.id)}
                      onChange={() => onToggle(task.id)}
                    />
                    <span className="min-w-0 flex-1">
                      {task.label}
                      {locked?.has(task.id) && lockedHint && (
                        <span className="block text-xs text-muted">{lockedHint}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            ))}
        </div>
      ))}
    </>
  )
}
