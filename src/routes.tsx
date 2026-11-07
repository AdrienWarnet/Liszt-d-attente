import { Navigate, type RouteObject } from 'react-router'
import { Layout } from './components/Layout'
import { BackupScreen, ReportScreen, SessionScreen } from './screens/EmptyScreens'
import { DayScreen } from './screens/DayScreen'
import { MoreScreen } from './screens/MoreScreen'
import { ProjectDetailScreen } from './screens/ProjectDetailScreen'
import { ProjectsScreen } from './screens/ProjectsScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { WeekScreen } from './screens/WeekScreen'

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <SessionScreen /> },
      { path: 'semaine', element: <WeekScreen /> },
      { path: 'semaine/jour/:day', element: <DayScreen /> },
      { path: 'projets', element: <ProjectsScreen /> },
      { path: 'projets/:id', element: <ProjectDetailScreen /> },
      { path: 'revue', element: <ReviewScreen /> },
      { path: 'bilan', element: <ReportScreen /> },
      { path: 'plus', element: <MoreScreen /> },
      { path: 'plus/sauvegarde', element: <BackupScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
