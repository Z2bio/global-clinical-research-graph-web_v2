import { CONFIG } from './config.js'
import { getLocale, t } from './i18n.js'

let amapPromise = null

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

function isChinaCountry(country = '') {
  const value = String(country || '').trim().toLowerCase()
  return value === 'china' || value === '中国' || value.includes('china') || value.includes('中国')
}

function loadAmap() {
  if (window.AMap) return Promise.resolve(window.AMap)
  if (amapPromise) return amapPromise
  const key = CONFIG.map.amapKey?.trim()
  if (!key) return Promise.reject(new Error('AMAP_KEY_MISSING'))
  if (CONFIG.map.amapSecurityJsCode?.trim()) {
    window._AMapSecurityConfig = { securityJsCode: CONFIG.map.amapSecurityJsCode.trim() }
  }
  const plugins = encodeURIComponent(CONFIG.map.plugins.join(','))
  const src = `https://webapi.amap.com/maps?v=${encodeURIComponent(CONFIG.map.version)}&key=${encodeURIComponent(key)}&plugin=${plugins}`
  amapPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-crg-amap]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.AMap), { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.dataset.crgAmap = '1'
    script.onload = () => window.AMap ? resolve(window.AMap) : reject(new Error('AMAP_LOAD_FAILED'))
    script.onerror = () => reject(new Error('AMAP_LOAD_FAILED'))
    document.head.appendChild(script)
  })
  return amapPromise
}

function chunk(items, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function convertChinaGpsPoints(AMap, points) {
  const preconverted = points.filter((point) => isChinaCountry(point.country) && String(point.coordinateSystem || '').toLowerCase() === 'gcj02').map((point) => ({ ...point, mapLnglat: point.lnglat, coordinateConverted: true }))
  const china = points.filter((point) => isChinaCountry(point.country) && String(point.coordinateSystem || '').toLowerCase() !== 'gcj02')
  const others = points.filter((point) => !isChinaCountry(point.country)).map((point) => ({ ...point, mapLnglat: point.lnglat }))
  if (!china.length || typeof AMap.convertFrom !== 'function') {
    return points.map((point) => ({ ...point, mapLnglat: point.lnglat }))
  }
  const converted = []
  for (const batch of chunk(china, 40)) {
    // AMap.convertFrom supports at most 40 coordinate pairs per call.
    const locations = await new Promise((resolve) => {
      AMap.convertFrom(batch.map((point) => point.lnglat), 'gps', (status, result) => {
        if (status === 'complete' && result?.info === 'ok' && Array.isArray(result.locations)) resolve(result.locations)
        else resolve([])
      })
    })
    batch.forEach((point, index) => {
      const loc = locations[index]
      converted.push({
        ...point,
        mapLnglat: loc && typeof loc.getLng === 'function' ? [loc.getLng(), loc.getLat()] : point.lnglat,
        coordinateConverted: Boolean(loc)
      })
    })
  }
  return [...converted, ...preconverted, ...others]
}


function geocodeCacheKey(facility = {}) {
  return `crg-geocode-v1:${[facility.name, facility.city, facility.state, facility.country].filter(Boolean).join('|').toLowerCase()}`
}

function readGeocodeCache(facility) {
  try {
    const raw = localStorage.getItem(geocodeCacheKey(facility))
    if (!raw) return null
    const value = JSON.parse(raw)
    return Array.isArray(value) && value.length === 2 && value.every(Number.isFinite) ? value : null
  } catch { return null }
}

function writeGeocodeCache(facility, lnglat) {
  try { localStorage.setItem(geocodeCacheKey(facility), JSON.stringify(lnglat)) } catch {}
}

export async function geocodeMissingChinaFacilities(studies = [], { limit = CONFIG.map.geocodeBatchLimit || 60 } = {}) {
  if (!CONFIG.map.geocodeMissingChinaFacilities || !CONFIG.map.amapKey?.trim()) return studies
  let AMap
  try { AMap = await loadAmap() } catch { return studies }
  if (!AMap?.Geocoder) return studies
  const geocoder = new AMap.Geocoder({ city: '全国', batch: false })
  let remaining = Math.max(0, Number(limit) || 0)
  const cloned = studies.map((study) => ({ ...study, facilities: (study.facilities || []).map((facility) => ({ ...facility })) }))
  for (const study of cloned) {
    for (const facility of study.facilities || []) {
      if (remaining <= 0) return cloned
      if (!isChinaCountry(facility.country || 'China')) continue
      const lat = Number(facility.latitude), lng = Number(facility.longitude)
      if (Number.isFinite(lat) && Number.isFinite(lng)) continue
      const cached = readGeocodeCache(facility)
      if (cached) {
        facility.longitude = cached[0]; facility.latitude = cached[1]; facility.coordinateSystem = 'gcj02'
        continue
      }
      const address = [facility.address, facility.name, facility.city, facility.state].filter(Boolean).join(' ')
      if (!address.trim()) continue
      remaining -= 1
      const result = await new Promise((resolve) => {
        geocoder.getLocation(address, (status, result) => {
          const loc = status === 'complete' && result?.geocodes?.[0]?.location
          resolve(loc && typeof loc.getLng === 'function' ? [loc.getLng(), loc.getLat()] : null)
        })
      })
      if (result) {
        facility.longitude = result[0]; facility.latitude = result[1]; facility.coordinateSystem = 'gcj02'
        writeGeocodeCache(facility, result)
      }
      await new Promise((resolve) => setTimeout(resolve, 90))
    }
  }
  return cloned
}

function facilityPopupHtml(point) {
  const sourceText = (point.sourceKeys || []).join(' · ') || '—'
  return `<div class="amap-facility-popup">
    <strong>${escapeHtml(point.name)}</strong>
    <span>${escapeHtml([point.city, point.state, point.country].filter(Boolean).join(' · ') || '—')}</span>
    <small>${escapeHtml(t('linkedStudies'))}: ${point.studyCount} · ${escapeHtml(t('sources'))}: ${escapeHtml(sourceText)}</small>
  </div>`
}

export class ResearchMapController {
  constructor(container, { onFacilitySelect = () => {}, onStatus = () => {} } = {}) {
    this.container = container
    this.onFacilitySelect = onFacilitySelect
    this.onStatus = onStatus
    this.mode = 'uninitialized'
    this.map = null
    this.cluster = null
    this.infoWindow = null
    this.points = []
    this.selectedPointId = ''
  }

  async init() {
    if (this.mode !== 'uninitialized') return this.mode
    try {
      const AMap = await loadAmap()
      this.AMap = AMap
      const locale = getLocale()
      const languageCode = CONFIG.map.enableEnglishMapLabels && locale === 'en-US' ? 'en' : 'zh'
      this.container.innerHTML = ''
      this.map = new AMap.Map(this.container, {
        viewMode: '2D',
        zoom: CONFIG.map.defaultZoomChina,
        center: CONFIG.map.defaultCenterChina,
        mapStyle: CONFIG.map.style,
        showOversea: CONFIG.map.showOversea,
        languageCode,
        logoLanguage: locale === 'en-US' ? 'en' : 'zh',
        resizeEnable: true
      })
      try {
        this.map.addControl(new AMap.ToolBar({ position: { top: '84px', right: '18px' } }))
        this.map.addControl(new AMap.Scale({ languageCode: locale === 'en-US' ? 'en' : 'zh', unit: 'metric', highContrast: true }))
      } catch {}
      this.infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -14), closeWhenClickMap: true })
      this.mode = 'amap'
      this.onStatus({ mode: 'amap', ready: true })
      return this.mode
    } catch (error) {
      this.mode = 'coordinate-preview'
      this.container.innerHTML = '<div class="coordinate-preview-host"></div>'
      this.onStatus({ mode: this.mode, ready: true, error: error?.message || String(error) })
      return this.mode
    }
  }

  async update(points = [], { chinaFirst = true } = {}) {
    this.points = points
    this.chinaFirst = Boolean(chinaFirst)
    await this.init()
    if (this.mode === 'amap') return this.updateAmap(points, { chinaFirst: this.chinaFirst })
    return this.updatePreview(points, { chinaFirst: this.chinaFirst })
  }

  async updateAmap(points, { chinaFirst }) {
    const AMap = this.AMap
    if (this.cluster) {
      try { this.cluster.setMap(null) } catch {}
      this.cluster = null
    }
    if (!points.length) {
      this.applyScope(chinaFirst ? 'china' : 'world', [])
      return
    }
    const converted = await convertChinaGpsPoints(AMap, points)
    this.renderedPoints = converted
    const data = converted.map((point) => ({ ...point, lnglat: point.mapLnglat || point.lnglat }))
    const total = Math.max(1, data.length)
    this.cluster = new AMap.MarkerCluster(this.map, data, {
      gridSize: CONFIG.map.clusterGridSize,
      renderClusterMarker: (context) => {
        const count = Number(context.count) || 1
        const size = Math.round(36 + Math.min(30, Math.log2(count + 1) * 7))
        const div = document.createElement('div')
        div.className = 'crg-map-cluster'
        div.style.setProperty('--cluster-size', `${size}px`)
        div.innerHTML = `<span>${count.toLocaleString()}</span>`
        context.marker.setAnchor?.('center')
        context.marker.setContent(div)
      },
      renderMarker: (context) => {
        const div = document.createElement('div')
        div.className = 'crg-map-marker'
        div.innerHTML = '<span></span>'
        context.marker.setAnchor?.('center')
        context.marker.setContent(div)
      }
    })
    this.cluster.on('click', (event) => {
      const members = Array.isArray(event.marker) ? event.marker : []
      if (members.length === 1 && members[0]?.id) {
        const point = this.renderedPoints.find((item) => item.id === members[0].id) || members[0]
        this.selectPoint(point, { openInfo: true })
        return
      }
      if (members.length > 1) {
        const currentZoom = this.map.getZoom()
        this.map.setZoomAndCenter(Math.min(currentZoom + 2, 15), event.lnglat)
      }
    })
    this.applyScope(chinaFirst ? 'china' : 'world', converted)
  }

  applyScope(scope = 'china', points = this.renderedPoints || this.points || []) {
    if (this.mode !== 'amap' || !this.map) return
    const chinaPoints = points.filter((point) => isChinaCountry(point.country))
    if (scope === 'world') {
      // “全球视图”应当真的回到全球视野，而不是在所有记录恰好都位于中国时保持中国局部缩放。
      this.map.setZoomAndCenter(CONFIG.map.defaultZoomWorld, CONFIG.map.defaultCenterWorld)
      return
    }
    if (!chinaPoints.length) {
      this.map.setZoomAndCenter(CONFIG.map.defaultZoomChina, CONFIG.map.defaultCenterChina)
      return
    }
    this.fitPoints(chinaPoints, { minZoom: 3.8, maxZoom: 6.2 })
  }

  fitPoints(points, { minZoom = 2.2, maxZoom = 10 } = {}) {
    if (!this.map || !points.length) return
    if (points.length === 1) {
      this.map.setZoomAndCenter(Math.min(CONFIG.map.selectedZoom, maxZoom), points[0].mapLnglat || points[0].lnglat)
      return
    }
    const lngs = points.map((p) => (p.mapLnglat || p.lnglat)[0])
    const lats = points.map((p) => (p.mapLnglat || p.lnglat)[1])
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs), minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const center = [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
    const span = Math.max(maxLng - minLng, maxLat - minLat)
    let zoom = span > 120 ? 2.2 : span > 60 ? 3 : span > 25 ? 4 : span > 10 ? 5 : span > 4 ? 6 : span > 1 ? 8 : 10
    zoom = Math.max(minZoom, Math.min(maxZoom, zoom))
    this.map.setZoomAndCenter(zoom, center)
  }

  selectPoint(point, { openInfo = true } = {}) {
    if (!point) return
    this.selectedPointId = point.id
    if (this.mode === 'amap') {
      const position = point.mapLnglat || point.lnglat
      this.map.setZoomAndCenter(CONFIG.map.selectedZoom, position)
      if (openInfo && this.infoWindow) {
        this.infoWindow.setContent(facilityPopupHtml(point))
        this.infoWindow.open(this.map, position)
      }
    } else {
      this.updatePreview(this.points, { chinaFirst: this.chinaFirst, selectedPointId: point.id })
    }
    this.onFacilitySelect(point)
  }

  focusStudy(study) {
    if (!study) return false
    const point = (this.renderedPoints || this.points).find((candidate) => candidate.studies?.some((item) => item.nctId === study.nctId))
    if (!point) return false
    this.selectPoint(point, { openInfo: true })
    return true
  }

  updatePreview(points, { chinaFirst = false, selectedPointId = this.selectedPointId } = {}) {
    const host = this.container.querySelector('.coordinate-preview-host') || this.container
    const chinaPoints = points.filter((point) => isChinaCountry(point.country))
    const scopedPoints = chinaFirst && chinaPoints.length ? chinaPoints : points
    // Fallback is a coordinate preview, not an official basemap. Use a scope-specific projection so
    // “中国优先 / 全球” is still visibly functional even before an AMap key is configured.
    const extent = chinaFirst && chinaPoints.length
      ? { minLng: 72, maxLng: 136, minLat: 16, maxLat: 55, width: 960, height: 620, label: 'CHINA / 中国' }
      : { minLng: -180, maxLng: 180, minLat: -60, maxLat: 85, width: 1100, height: 620, label: 'WORLD / 全球' }
    const { minLng, maxLng, minLat, maxLat, width, height } = extent
    const project = ([lng, lat]) => [
      ((lng - minLng) / (maxLng - minLng)) * width,
      ((maxLat - lat) / (maxLat - minLat)) * height
    ]
    const bins = new Map()
    for (const point of scopedPoints) {
      const [lng, lat] = point.lnglat || []
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue
      if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) continue
      const [x, y] = project([lng, lat])
      const key = `${Math.round(x / 34)}:${Math.round(y / 34)}`
      if (!bins.has(key)) bins.set(key, { x, y, points: [] })
      bins.get(key).points.push(point)
    }
    const grid = []
    for (let x = width / 10; x < width; x += width / 10) grid.push(`<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${height}"/>`)
    for (let y = height / 8; y < height; y += height / 8) grid.push(`<line x1="0" y1="${y.toFixed(1)}" x2="${width}" y2="${y.toFixed(1)}"/>`)
    const dots = [...bins.values()].map((bin) => {
      const count = bin.points.length
      const selected = bin.points.some((point) => point.id === selectedPointId)
      const radius = Math.min(28, 9 + Math.log2(count + 1) * 4.5)
      const ids = bin.points.map((point) => point.id).join('||')
      return `<g class="preview-point ${selected ? 'selected' : ''}" data-preview-ids="${escapeHtml(ids)}" transform="translate(${bin.x.toFixed(1)},${bin.y.toFixed(1)})">
        <circle r="${radius}"/><text x="0" y="0" text-anchor="middle" dominant-baseline="central">${count}</text>
      </g>`
    }).join('')
    host.innerHTML = `<div class="coordinate-preview-label">${escapeHtml(t('coordinatePreview'))} · ${escapeHtml(extent.label)}</div>
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-label="${escapeHtml(t('coordinatePreview'))}">
        <g class="preview-grid">${grid.join('')}</g>
        <text class="preview-region" x="${(width*0.5).toFixed(1)}" y="${(height*0.5).toFixed(1)}" text-anchor="middle">${escapeHtml(extent.label)}</text>
        ${dots}
      </svg>`
    host.querySelectorAll('[data-preview-ids]').forEach((element) => {
      element.addEventListener('click', () => {
        const ids = element.dataset.previewIds.split('||')
        const point = scopedPoints.find((item) => ids.includes(item.id))
        if (point) this.selectPoint(point, { openInfo: false })
      })
    })
  }

  resize() {
    if (this.mode === 'amap') {
      try { this.map?.resize?.() } catch {}
      return
    }
    if (this.mode === 'coordinate-preview') this.updatePreview(this.points || [], { chinaFirst: this.chinaFirst })
  }

  destroy() {
    try { this.cluster?.setMap(null) } catch {}
    try { this.map?.destroy() } catch {}
    this.map = null
    this.cluster = null
    this.mode = 'uninitialized'
  }
}
