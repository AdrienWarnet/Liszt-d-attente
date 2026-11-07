import { Link } from 'react-router'
import { ChevronIcon } from '../components/icons'
import { Screen } from '../components/Screen'
import { labels } from '../labels'

const row = 'flex min-h-14 items-center justify-between border-b border-line font-semibold'

export function MoreScreen() {
  return (
    <Screen title={labels.tabs.more}>
      <ul>
        <li>
          <Link to="/plus/sauvegarde" className={row}>
            {labels.more.backup}
            <span className="text-muted">
              <ChevronIcon />
            </span>
          </Link>
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
