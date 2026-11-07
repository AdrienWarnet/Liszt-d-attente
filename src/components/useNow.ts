import { useEffect, useState } from 'react'

/**
 * Heure courante rafraîchie toutes les `intervalMs` et au retour sur l'app.
 * Sert seulement à rafraîchir l'affichage : les durées sont toujours recalculées
 * depuis les horodatages en base.
 */
export function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, intervalMs)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs])
  return now
}
