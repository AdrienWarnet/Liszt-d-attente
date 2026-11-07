import { Link } from 'react-router'
import { ChevronIcon } from '../components/icons'
import { labels } from '../labels'

export function MoreScreen() {
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      <li>
        <Link to="/plus/sauvegarde" className="flex min-h-14 items-center justify-between px-4">
          {labels.more.backup}
          <ChevronIcon />
        </Link>
      </li>
      <li className="flex min-h-14 items-center justify-between px-4">
        {labels.more.about}
        <span className="text-muted">
          {labels.more.version} {__APP_VERSION__}
        </span>
      </li>
    </ul>
  )
}
