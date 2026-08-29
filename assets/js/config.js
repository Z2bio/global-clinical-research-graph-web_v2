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
  productVersion: '2.2.1',
  localeKey: 'clinical-research-graph-locale-v1',
  map: Object.freeze({
    provider: 'amap',
    // GitHub Pages 演示：在下方填写高德 Web(JS API) Key 与安全密钥 JsCode。
    // 正式生产环境建议按高德官方文档使用代理服务器保存安全密钥，不要长期明文暴露在前端。
    amapKey: '',
    amapSecurityJsCode: '',
    version: '2.0',
    plugins: ['AMap.MarkerCluster', 'AMap.ToolBar', 'AMap.Scale'],
    style: 'amap://styles/whitesmoke',
    defaultCenterChina: [104.1954, 35.8617],
    defaultZoomChina: 4.2,
    defaultCenterWorld: [18, 22],
    defaultZoomWorld: 2.1,
    showOversea: true,
    // 高德英文底图属于多语言地图能力，需要相应权限；UI 英文切换不依赖此权限。
    enableEnglishMapLabels: false,
    clusterGridSize: 64,
    maxRenderedFacilities: 2500,
    selectedZoom: 11,
    fallbackMode: 'coordinate-preview'
  })
})
