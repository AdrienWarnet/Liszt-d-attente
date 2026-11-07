import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { labels } from '../labels'
import { CloseIcon } from './icons'
import { ui } from './ui'

interface SheetProps {
  open: boolean
  title: string
  onClose: () => void
  /** Bouton d'action à droite du pied (« Enregistrer », « Supprimer »…). */
  confirmLabel: string
  onConfirm: () => void
  confirmDisabled?: boolean
  children?: ReactNode
}

/** Feuille modale en bas d'écran (proto) : titre serif, contenu défilant, Annuler / action. */
export function Sheet({
  open,
  title,
  onClose,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  children,
}: SheetProps) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const first = panel.current?.querySelector<HTMLElement>('input, textarea, select')
    ;(first ?? panel.current)?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-20 flex items-end bg-scrim"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="sheet-in mx-auto flex max-h-[86%] w-full max-w-[480px] flex-col rounded-t-[22px] bg-screen text-ink outline-none"
      >
        <header className="flex items-center justify-between px-5 pt-2.5 pb-1.5">
          <h2 className="font-serif text-2xl font-normal">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.common.close}
            className={ui.iconButton}
          >
            <CloseIcon />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto px-5 pb-2">{children}</div>
        <footer className="flex gap-2.5 px-5 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <button type="button" onClick={onClose} className={`${ui.ghost} flex-1`}>
            {labels.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`${ui.primary} flex-1`}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
