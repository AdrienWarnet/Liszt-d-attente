/**
 * Demande au navigateur un stockage persistant pour limiter le risque
 * d'effacement des données locales. Ignore silencieusement un refus ou
 * une API absente. Renvoie l'état final (`null` si l'API est absente).
 */
export async function requestPersistentStorage(
  storage: StorageManager | undefined = globalThis.navigator?.storage,
): Promise<boolean | null> {
  if (!storage?.persist || !storage.persisted) return null
  try {
    if (!(await storage.persisted())) await storage.persist()
    const persisted = await storage.persisted()
    if (import.meta.env.DEV) console.info('[storage] persisted =', persisted)
    return persisted
  } catch {
    return null
  }
}
