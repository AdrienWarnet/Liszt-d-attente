import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { labels } from '../labels'
import { ChronoBanner } from './ChronoBanner'
import { BackIcon } from './icons'

interface ScreenProps {
  title: string
  subtitle?: string | null
  /** Écran parent si l'historique de l'app est vide (lien ouvert directement). Affiche le bouton retour. */
  back?: string
  /** Masque le bandeau de chrono (onglet Session). */
  hideBanner?: boolean
  children?: ReactNode
}

/** Squelette d'un écran du proto : en-tête, bandeau de chrono, contenu défilant. */
export function Screen({ title, subtitle, back, hideBanner, children }: ScreenProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else if (back) navigate(back, { replace: true })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-end gap-2.5 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-2.5">
        {back !== undefined && (
          <button
            type="button"
            onClick={goBack}
            aria-label={labels.common.back}
            className="-ml-2.5 grid size-11 shrink-0 place-items-center rounded-full"
          >
            <BackIcon />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="font-serif text-[2rem] leading-[1.1] font-normal text-balance">{title}</h1>
          {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
        </div>
      </header>

      {/* Bandeau du chrono en cours (4.4), sauf sur l'onglet Session. */}
      {!hideBanner && <ChronoBanner />}

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">{children}</main>
    </div>
  )
}
