import { CONFIG } from './config.js'
import { normalizeStudy, normalizeStudyList } from './normalizer.js'
import { getCachedResponse, saveCachedResponse } from './storage.js'
import { translateCommonQuery } from './dictionary.js'
import { annotateClinicalTrialsStudy } from './federated.js'

function createAbortSignal(timeoutMs = CONFIG.requestTimeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  return { signal: controller.signal, clear: () => clearTimeout(timeout) }
}

async function fetchJson(url) {
  const abort = createAbortSignal()
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: abort.signal
    })
    if (!response.ok) throw new Error(`官方接口返回 HTTP ${response.status}`)
    return await response.json()
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('请求官方接口超时')
    throw error
  } finally {
    abort.clear()
  }
}

export function buildSearchUrl({ query = '', statusCode = '', pageToken = '' } = {}) {
  const url = new URL(`${CONFIG.apiBase}/studies`)
  url.searchParams.set('format', 'json')
  url.searchParams.set('pageSize', String(CONFIG.pageSize))
  url.searchParams.set('countTotal', 'true')
  url.searchParams.set('sort', CONFIG.defaultSort)
  const translatedQuery = translateCommonQuery(query)
  if (translatedQuery) url.searchParams.set('query.term', translatedQuery)
  if (statusCode) url.searchParams.set('filter.overallStatus', statusCode)
  if (pageToken) url.searchParams.set('pageToken', pageToken)
  return url
}

export function cacheKeyFromUrl(url) {
  const input = url.toString()
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

export async function searchStudies(params = {}, { allowCacheFallback = true } = {}) {
  const url = buildSearchUrl(params)
  const cacheKey = cacheKeyFromUrl(url)
  const cached = getCachedResponse(cacheKey)
  try {
    const raw = await fetchJson(url)
    const normalizedBase = normalizeStudyList(raw)
    const normalized = { ...normalizedBase, studies: normalizedBase.studies.map(annotateClinicalTrialsStudy) }
    saveCachedResponse(cacheKey, normalized)
    return {
      ...normalized,
      source: 'network',
      fetchedAt: Date.now(),
      requestedQuery: params.query || '',
      effectiveQuery: translateCommonQuery(params.query || '')
    }
  } catch (error) {
    if (allowCacheFallback && cached?.payload) {
      return {
        ...cached.payload,
        source: 'cache',
        fetchedAt: cached.savedAt,
        cacheAgeMs: cached.ageMs,
        warning: error.message || '官方接口暂时不可用',
        requestedQuery: params.query || '',
        effectiveQuery: translateCommonQuery(params.query || '')
      }
    }
    throw error
  }
}

export function readCachedSearch(params = {}) {
  const url = buildSearchUrl(params)
  const cached = getCachedResponse(cacheKeyFromUrl(url))
  if (!cached?.payload) return null
  return {
    ...cached.payload,
    source: 'cache-preview',
    fetchedAt: cached.savedAt,
    cacheAgeMs: cached.ageMs,
    requestedQuery: params.query || '',
    effectiveQuery: translateCommonQuery(params.query || '')
  }
}

export async function getStudyById(nctId) {
  const id = String(nctId || '').trim()
  if (!/^NCT\d{8}$/i.test(id)) throw new Error('NCT 编号格式不正确')
  const url = new URL(`${CONFIG.apiBase}/studies/${encodeURIComponent(id.toUpperCase())}`)
  url.searchParams.set('format', 'json')
  const raw = await fetchJson(url)
  return annotateClinicalTrialsStudy(normalizeStudy(raw))
}

export async function getApiVersion() {
  const url = new URL(`${CONFIG.apiBase}/version`)
  try {
    const payload = await fetchJson(url)
    return {
      apiVersion: payload.apiVersion || payload.version || '',
      dataTimestamp: payload.dataTimestamp || ''
    }
  } catch {
    return { apiVersion: '', dataTimestamp: '' }
  }
}
