export const CONFIG = Object.freeze({
  apiBase: 'https://clinicaltrials.gov/api/v2',
  pageSize: 30,
  cacheTtlMs: 30 * 60 * 1000,
  requestTimeoutMs: 22000,
  cachePrefix: 'clinical-research-graph-cache-v2:',
  favoritesKey: 'clinical-research-graph-favorites-v2',
  maxCachedQueries: 16,
  sourceName: 'ClinicalTrials.gov',
  sourceHome: 'https://clinicaltrials.gov/',
  defaultSort: 'LastUpdatePostDate:desc',
  productName: 'Global + China Clinical Research Graph',
  productVersion: '2.0.0'
})
