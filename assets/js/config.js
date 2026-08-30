const RUNTIME = globalThis.__CRG_RUNTIME_CONFIG__ || {}
const MAP_RUNTIME = RUNTIME.map || {}

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
  productVersion: '2.4.0',
  usageMode: 'public-benefit-noncommercial',
  localeKey: 'clinical-research-graph-locale-v1',
  map: Object.freeze({
    provider: 'amap',
    // v2.4 supports runtime injection through runtime-config.js / GitHub Actions variables.
    // For local testing you may still place a domain-restricted AMap Web(JS API) key here.
    amapKey: String(MAP_RUNTIME.amapKey || ''),
    amapSecurityJsCode: String(MAP_RUNTIME.amapSecurityJsCode || ''),
    version: '2.0',
    plugins: ['AMap.MarkerCluster', 'AMap.ToolBar', 'AMap.Scale', 'AMap.Geocoder'],
    style: 'amap://styles/whitesmoke',
    defaultCenterChina: [104.1954, 35.8617],
    defaultZoomChina: 4.2,
    defaultCenterWorld: [18, 22],
    defaultZoomWorld: 2.1,
    showOversea: true,
    enableEnglishMapLabels: Boolean(MAP_RUNTIME.enableEnglishMapLabels),
    clusterGridSize: 64,
    maxRenderedFacilities: 2500,
    selectedZoom: 11,
    fallbackMode: 'coordinate-preview',
    geocodeMissingChinaFacilities: true,
    geocodeBatchLimit: 60
  })
})
