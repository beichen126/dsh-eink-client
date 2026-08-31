
const DB_NAME = 'dsh-eink-client'
const DB_VERSION = 3
const STORES = ['settings', 'conversations', 'attachments', 'annotations']

let dbPromise = null
function openDb() {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' })
      if (!db.objectStoreNames.contains('conversations')) db.createObjectStore('conversations', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('attachments')) db.createObjectStore('attachments', { keyPath: 'id' })
      let ann = db.objectStoreNames.contains('annotations') ? req.transaction.objectStore('annotations') : db.createObjectStore('annotations', { keyPath: 'id' })
      if (!ann.indexNames.contains('by_conversation')) ann.createIndex('by_conversation', 'conversationId')
      if (!ann.indexNames.contains('by_message')) ann.createIndex('by_message', 'messageId')
      if (!ann.indexNames.contains('by_conversation_message')) ann.createIndex('by_conversation_message', ['conversationId', 'messageId'])
      const conv = req.transaction.objectStore('conversations')
      if (!conv.indexNames.contains('by_updatedAt')) conv.createIndex('by_updatedAt', 'updatedAt')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}
function asPromise(req) { return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error) }) }
function tx(db, name, mode) { return db.transaction(name, mode).objectStore(name) }
export async function idbGet(store, key) { const db = await openDb(); return asPromise(tx(db, store, 'readonly').get(key)) }
export async function idbGetAll(store) { const db = await openDb(); return asPromise(tx(db, store, 'readonly').getAll()) }
export async function idbGetAllKeys(store) { const db = await openDb(); return asPromise(tx(db, store, 'readonly').getAllKeys()) }
export async function idbPut(store, value) { const db = await openDb(); await asPromise(tx(db, store, 'readwrite').put(value)) }
export async function idbDelete(store, key) { const db = await openDb(); await asPromise(tx(db, store, 'readwrite').delete(key)) }
export async function idbGetAllByIndex(store, index, key) {
  const db = await openDb(); const os = tx(db, store, 'readonly'); return asPromise(os.index(index).getAll(key))
}
export async function idbDeleteByIndex(store, index, key) {
  const db = await openDb(); const os = tx(db, store, 'readwrite')
  const keys = await asPromise(os.index(index).getAllKeys(key))
  for (const k of keys) await asPromise(os.delete(k))
}
export async function idbBatchPut(store, values) { const db = await openDb(); const os = tx(db, store, 'readwrite'); for (const v of values) await asPromise(os.put(v)) }
export async function idbBatchDelete(store, keys) { const db = await openDb(); const os = tx(db, store, 'readwrite'); for (const k of keys) await asPromise(os.delete(k)) }
export async function closeDb() { if (dbPromise) { const db = await dbPromise; db.close(); dbPromise = null } }
