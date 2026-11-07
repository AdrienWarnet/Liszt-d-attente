import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import {
  listActiveTasksGrouped,
  listProjects,
  listSectionsWithTasks,
  projectColorMap,
} from './projects'

// Hooks de lecture : se mettent à jour seuls quand la base change.
// `undefined` = chargement en cours.

export function useProjects() {
  return useLiveQuery(listProjects)
}

export function useProject(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return null
    const all = await db.projects.toArray()
    const project = all.find((p) => p.id === id)
    if (!project) return null
    return { project, color: projectColorMap(all).get(id)! }
  }, [id])
}

export function useSectionsWithTasks(projectId: string | undefined) {
  return useLiveQuery(async () => (projectId ? listSectionsWithTasks(projectId) : []), [projectId])
}

export function useActiveTasksGrouped() {
  return useLiveQuery(listActiveTasksGrouped)
}
