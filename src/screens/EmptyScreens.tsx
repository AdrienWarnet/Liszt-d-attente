import { Screen } from '../components/Screen'
import { labels } from '../labels'

// Écrans encore vides : remplis par les epics 3 à 7.

export function ReportScreen() {
  return <Screen title={labels.tabs.review} />
}

export function BackupScreen() {
  return <Screen title={labels.more.backup} back="/plus" />
}
