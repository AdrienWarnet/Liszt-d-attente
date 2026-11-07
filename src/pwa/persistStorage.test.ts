import { describe, expect, it, vi } from 'vitest'
import { requestPersistentStorage } from './persistStorage'

function fakeStorage(initial: boolean, granted: boolean) {
  let state = initial
  return {
    persisted: vi.fn(async () => state),
    persist: vi.fn(async () => {
      state = granted
      return granted
    }),
  } as unknown as StorageManager & {
    persisted: ReturnType<typeof vi.fn>
    persist: ReturnType<typeof vi.fn>
  }
}

describe('requestPersistentStorage', () => {
  it('demande la persistance si elle n’est pas encore accordée', async () => {
    const storage = fakeStorage(false, true)
    expect(await requestPersistentStorage(storage)).toBe(true)
    expect(storage.persist).toHaveBeenCalledOnce()
    expect(storage.persisted).toHaveBeenCalled()
  })

  it('ne redemande pas si déjà persistant', async () => {
    const storage = fakeStorage(true, true)
    expect(await requestPersistentStorage(storage)).toBe(true)
    expect(storage.persist).not.toHaveBeenCalled()
  })

  it('accepte silencieusement un refus', async () => {
    const storage = fakeStorage(false, false)
    expect(await requestPersistentStorage(storage)).toBe(false)
  })

  it('renvoie null si l’API est absente', async () => {
    expect(await requestPersistentStorage(undefined)).toBeNull()
  })

  it('renvoie null si le navigateur lève une erreur', async () => {
    const storage = fakeStorage(false, true)
    storage.persist.mockRejectedValueOnce(new Error('refus'))
    expect(await requestPersistentStorage(storage)).toBeNull()
  })
})
