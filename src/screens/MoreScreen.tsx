import { Link } from 'react-router'
import { ChevronIcon } from '../components/icons'
import { Screen } from '../components/Screen'
import { useNow } from '../components/useNow'
import { lastExportText, needsBackupReminder } from '../data/backup'
import { useLastExportAt } from '../data/hooks'
import { labels } from '../labels'
import { ThemePicker } from './more/ThemePicker'

const row = 'flex min-h-14 items-center justify-between border-b border-line font-semibold'

export function MoreScreen() {
  const lastAt = useLastExportAt()
  const now = useNow(60_000)
  return (
    <Screen title={labels.tabs.more}>
      <ul>
        <li>
          <Link to="/plus/sauvegarde" className={row}>
            <span className="flex items-center gap-2">
              {labels.more.backup}
              {lastAt !== undefined && needsBackupReminder(lastAt, now) && (
                <i
                  className="size-2 rounded-full bg-felt"
                  role="img"
                  aria-label={labels.backup.reminder}
                />
              )}
            </span>
            <span className="flex items-center gap-1 font-normal text-muted">
              {lastAt !== undefined && lastExportText(lastAt, now)}
              <ChevronIcon />
            </span>
          </Link>
        </li>
        <li>
          <Link to="/sessions" className={row}>
            {labels.history.link}
            <span className="text-muted">
              <ChevronIcon />
            </span>
          </Link>
        </li>
        <li>
          <Link to="/ajout-manuel" className={row}>
            {labels.session.manualAdd}
            <span className="text-muted">
              <ChevronIcon />
            </span>
          </Link>
        </li>
        <li>
          <ThemePicker />
        </li>
        <li className={row}>
          {labels.more.about}
          <span className="font-normal text-muted">
            {labels.more.version} {__APP_VERSION__}
          </span>
        </li>
      </ul>
    </Screen>
  )
}
