import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router'
import { labels } from '../labels'
import { MoreIcon, ProjectsIcon, ReviewIcon, SessionIcon, WeekIcon } from './icons'

const tabs: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: '/', label: labels.tabs.session, icon: <SessionIcon />, end: true },
  { to: '/semaine', label: labels.tabs.week, icon: <WeekIcon /> },
  { to: '/projets', label: labels.tabs.projects, icon: <ProjectsIcon /> },
  { to: '/bilan', label: labels.tabs.review, icon: <ReviewIcon /> },
  { to: '/plus', label: labels.tabs.more, icon: <MoreIcon /> },
]

/** Cadre de l'app : l'écran courant (voir `Screen`) au-dessus de la barre d'onglets. */
export function Layout() {
  return (
    <div className="flex h-dvh flex-col bg-screen text-base text-ink">
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>

      <nav
        aria-label={labels.mainNavigation}
        className="shrink-0 border-t border-line bg-screen pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex">
          {tabs.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.8125rem] ${
                    isActive ? 'font-bold text-felt' : 'text-muted'
                  }`
                }
              >
                {tab.icon}
                {tab.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
