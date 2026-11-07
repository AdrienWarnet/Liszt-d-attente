import type { ReactNode } from 'react'
import { NavLink, Outlet, useMatches } from 'react-router'
import { labels } from '../labels'
import { MoreIcon, ProjectsIcon, ReviewIcon, SessionIcon, WeekIcon } from './icons'

export interface ScreenHandle {
  title: string
}

const tabs: { to: string; label: string; icon: ReactNode; end?: boolean }[] = [
  { to: '/', label: labels.tabs.session, icon: <SessionIcon />, end: true },
  { to: '/semaine', label: labels.tabs.week, icon: <WeekIcon /> },
  { to: '/projets', label: labels.tabs.projects, icon: <ProjectsIcon /> },
  { to: '/bilan', label: labels.tabs.review, icon: <ReviewIcon /> },
  { to: '/plus', label: labels.tabs.more, icon: <MoreIcon /> },
]

export function Layout() {
  const matches = useMatches()
  const handle = matches[matches.length - 1]?.handle as ScreenHandle | undefined

  return (
    <div className="flex h-dvh flex-col bg-surface text-base text-ink">
      <header className="shrink-0 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
        <h1 className="font-serif text-[2rem] leading-tight font-normal">{handle?.title}</h1>
      </header>

      {/* Bandeau du chrono en cours (ticket 4.4) : masqué tant qu'il est vide. */}
      <div data-slot="chrono-banner" className="shrink-0 empty:hidden" />

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        <Outlet />
      </main>

      <nav
        aria-label={labels.mainNavigation}
        className="shrink-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="flex">
          {tabs.map((tab) => (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.8125rem] ${
                    isActive ? 'font-bold text-accent' : 'text-muted'
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
