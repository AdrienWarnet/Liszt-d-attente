import { useToast } from '../../components/Toast'
import { archiveTask, reactivateTask } from '../../data/projects'
import type { Task } from '../../data/types'
import { labels } from '../../labels'

const mini = 'min-h-11 shrink-0 rounded-lg px-2 text-xs font-semibold'

/** Bouton « Archiver » à droite d'une tâche active (proto, détail projet). */
export function ArchiveButton({ task }: { task: Task }) {
  const toast = useToast()
  return (
    <button
      type="button"
      className={`${mini} text-muted`}
      aria-label={`${labels.projects.archive} ${task.label}`}
      onClick={async () => {
        await archiveTask(task.id)
        toast(labels.projects.taskArchived)
      }}
    >
      {labels.projects.archive}
    </button>
  )
}

/** Bloc repliable « Tâches archivées (n) », masqué si n = 0. */
export function ArchivedTasks({ tasks }: { tasks: Task[] }) {
  const toast = useToast()
  if (tasks.length === 0) return null
  return (
    <details className="mt-1">
      <summary className="flex min-h-11 cursor-pointer items-center text-[13px] text-muted">
        {labels.projects.archivedTasks(tasks.length)}
      </summary>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-2.5 border-t border-line text-sm">
            <span className="min-w-0 flex-1 py-2 text-muted line-through">{task.label}</span>
            <button
              type="button"
              className={`${mini} text-felt`}
              aria-label={`${labels.projects.reactivate} ${task.label}`}
              onClick={async () => {
                await reactivateTask(task.id)
                toast(labels.projects.taskReactivated)
              }}
            >
              {labels.projects.reactivate}
            </button>
          </li>
        ))}
      </ul>
    </details>
  )
}
