import { Navigate, type RouteObject } from 'react-router'
import { Layout, type ScreenHandle } from './components/Layout'
import { labels } from './labels'
import { MoreScreen } from './screens/MoreScreen'

// Écrans vides pour l'instant : ils sont remplis par les epics 2 à 7.
const empty = null

const screen = (title: string): { handle: ScreenHandle } => ({ handle: { title } })

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: empty, ...screen(labels.tabs.session) },
      { path: 'semaine', element: empty, ...screen(labels.tabs.week) },
      { path: 'projets', element: empty, ...screen(labels.tabs.projects) },
      { path: 'bilan', element: empty, ...screen(labels.tabs.review) },
      { path: 'plus', element: <MoreScreen />, ...screen(labels.tabs.more) },
      { path: 'plus/sauvegarde', element: empty, ...screen(labels.more.backup) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
