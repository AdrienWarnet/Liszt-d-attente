import { Navigate, type RouteObject } from 'react-router'
import { Layout } from './components/Layout'
import { BackupScreen } from './screens/EmptyScreens'
import { DayScreen } from './screens/DayScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { ManualEntryScreen } from './screens/ManualEntryScreen'
import { MoreScreen } from './screens/MoreScreen'
import { PlanningScreen } from './screens/PlanningScreen'
import { ProjectReportScreen } from './screens/ProjectReportScreen'
import { ProjectDetailScreen } from './screens/ProjectDetailScreen'
import { ProjectsScreen } from './screens/ProjectsScreen'
import { ReportScreen } from './screens/ReportScreen'
import { ReviewScreen } from './screens/ReviewScreen'
import { SessionScreen } from './screens/SessionScreen'
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
      { path: 'projets/:id/planning', element: <PlanningScreen /> },
      { path: 'projets/:id/bilan', element: <ProjectReportScreen /> },
      { path: 'revue', element: <ReviewScreen /> },
      { path: 'sessions', element: <HistoryScreen /> },
      { path: 'ajout-manuel', element: <ManualEntryScreen /> },
      { path: 'bilan', element: <ReportScreen /> },
      { path: 'plus', element: <MoreScreen /> },
      { path: 'plus/sauvegarde', element: <BackupScreen /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
