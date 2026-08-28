import { CONFIG } from './config.js'

const memoryStore = new Map()

function safeParse(value, fallback) {
  try { return JSON.parse(value) } catch { return fallback }
}

function readValue(key) {
  try {
    const value = localStorage.getItem(key)
    return value === null ? memoryStore.get(key) ?? null : value
  } catch {
    return memoryStore.get(key) ?? null
  }
}

function writeValue(key, value) {
  memoryStore.set(key, value)
  try { localStorage.setItem(key, value) } catch { /* memory fallback */ }
}

function removeValue(key) {
  memoryStore.delete(key)
  try { localStorage.removeItem(key) } catch { /* memory fallback */ }
}

function storageKeys() {
  const keys = new Set(memoryStore.keys())
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key) keys.add(key)
    }
  } catch { /* memory-only mode */ }
  return [...keys]
}

export function getCachedResponse(cacheKey) {
  const raw = readValue(`${CONFIG.cachePrefix}${cacheKey}`)
  if (!raw) return null
  const parsed = safeParse(raw, null)
  if (!parsed || !parsed.savedAt || !parsed.payload) return null
  return {
    ...parsed,
    ageMs: Date.now() - parsed.savedAt,
    fresh: Date.now() - parsed.savedAt <= CONFIG.cacheTtlMs
  }
}

export function saveCachedResponse(cacheKey, payload) {
  const storageKey = `${CONFIG.cachePrefix}${cacheKey}`
  writeValue(storageKey, JSON.stringify({ savedAt: Date.now(), payload }))
  pruneQueryCache()
}

function pruneQueryCache() {
  const entries = storageKeys()
    .filter((key) => key.startsWith(CONFIG.cachePrefix))
    .map((key) => ({ key, savedAt: safeParse(readValue(key), null)?.savedAt || 0 }))
    .sort((a, b) => b.savedAt - a.savedAt)
  entries.slice(CONFIG.maxCachedQueries).forEach((entry) => removeValue(entry.key))
}

export function getFavorites() {
  return safeParse(readValue(CONFIG.favoritesKey), {}) || {}
}

export function saveFavorite(study) {
  const favorites = getFavorites()
  favorites[study.nctId] = {
    savedAt: Date.now(),
    snapshot: study
  }
  writeValue(CONFIG.favoritesKey, JSON.stringify(favorites))
  return favorites
}

export function removeFavorite(nctId) {
  const favorites = getFavorites()
  delete favorites[nctId]
  writeValue(CONFIG.favoritesKey, JSON.stringify(favorites))
  return favorites
}

export function replaceFavoriteSnapshot(study) {
  const favorites = getFavorites()
  if (!favorites[study.nctId]) return favorites
  const previous = favorites[study.nctId].snapshot
  favorites[study.nctId] = {
    ...favorites[study.nctId],
    refreshedAt: Date.now(),
    lastChange: previous && previous.statusCode !== study.statusCode ? {
      detectedAt: Date.now(),
      from: previous.statusLabel,
      to: study.statusLabel
    } : favorites[study.nctId].lastChange || null,
    snapshot: study
  }
  writeValue(CONFIG.favoritesKey, JSON.stringify(favorites))
  return favorites
}

export function clearAllLocalData() {
  storageKeys()
    .filter((key) => key.startsWith(CONFIG.cachePrefix) || key === CONFIG.favoritesKey)
    .forEach(removeValue)
}
