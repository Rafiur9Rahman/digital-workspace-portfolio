/* Remembers the last ROM the user loaded (bytes + name) so the Game Boy Advance
   app auto-loads it next time - no re-upload. Everything is IndexedDB, local to
   this browser. In-game saves and save states are handled separately by
   EmulatorJS in its own IndexedDB stores. */

const DB_NAME = 'gba-app'
const STORE = 'kv'
const LAST_ROM_KEY = 'last-rom'

export interface StoredRom {
  name: string
  bytes: ArrayBuffer
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run<T>(
  mode: IDBTransactionMode,
  op: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = op(tx.objectStore(STORE))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
        tx.oncomplete = () => db.close()
      }),
  )
}

export async function loadLastRom(): Promise<StoredRom | null> {
  try {
    const rom = await run<StoredRom | undefined>('readonly', (s) =>
      s.get(LAST_ROM_KEY),
    )
    return rom ?? null
  } catch {
    return null
  }
}

export async function saveLastRom(name: string, bytes: ArrayBuffer): Promise<void> {
  try {
    await run('readwrite', (s) => s.put({ name, bytes }, LAST_ROM_KEY))
  } catch {
    /* ignore - private mode / storage disabled */
  }
}
