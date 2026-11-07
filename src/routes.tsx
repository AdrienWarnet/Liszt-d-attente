import { Navigate, type RouteObject } from 'react-router'
import { Layout } from './components/Layout'
import { BackupScreen, ReportScreen, SessionScreen, WeekScreen } from './screens/EmptyScreens'
import { MoreScreen } from './screens/MoreScreen'
import { ProjectsScreen } from './screens/ProjectsScreen'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <SessionScreen /> },
      { path: 'semaine', element: <WeekScreen /> },
      { path: 'projets', element: <ProjectsScreen /> },
      { path: 'bilan', element: <ReportScreen /> },
      { path: 'plus', element: <MoreScreen /> },
      { path: 'plus/sauvegarde', element: <BackupScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
