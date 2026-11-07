import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const TOAST_MS = 2200

const ToastContext = createContext<(message: string) => void>(() => {})

/** Message bref en bas d'écran (proto), ex. « Tâche archivée ». */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const show = useCallback((text: string) => {
    clearTimeout(timer.current)
    setMessage(text)
    timer.current = setTimeout(() => setMessage(null), TOAST_MS)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <div
          role="status"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+90px)] left-1/2 z-30 -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-[13px] whitespace-nowrap text-screen"
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
