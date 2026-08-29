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
  const china = points.filter((point) => isChinaCountry(point.country))
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
  return [...converted, ...others]
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
    await this.init()
    if (this.mode === 'amap') return this.updateAmap(points, { chinaFirst })
    return this.updatePreview(points, { chinaFirst })
  }

  async updateAmap(points, { chinaFirst }) {
    const AMap = this.AMap
    if (this.cluster) {
      try { this.cluster.setMap(null) } catch {}
      this.cluster = null
    }
    if (!points.length) {
      this.map.setZoomAndCenter(CONFIG.map.defaultZoomChina, CONFIG.map.defaultCenterChina)
      return
    }
    const converted = await convertChinaGpsPoints(AMap, points)
    this.renderedPoints = converted
    const data = converted.map((point) => ({ ...point, lnglat: point.mapLnglat || point.lnglat }))
    const total = Math.max(1, data.length)
    this.cluster = new AMap.MarkerCluster(this.map, data, {
      gridSize: CONFIG.map.clusterGridSize,
      renderClusterMarker: (context) => {
        const size = Math.round(34 + Math.min(28, Math.pow(context.count / total, 0.25) * 52))
        const div = document.createElement('div')
        div.className = 'crg-map-cluster'
        div.style.width = `${size}px`
        div.style.height = `${size}px`
        div.style.lineHeight = `${size}px`
        div.textContent = context.count
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
    const chinaPoints = converted.filter((point) => isChinaCountry(point.country))
    const target = chinaFirst && chinaPoints.length ? chinaPoints : converted
    this.fitPoints(target)
  }

  fitPoints(points) {
    if (!this.map || !points.length) return
    if (points.length === 1) {
      this.map.setZoomAndCenter(CONFIG.map.selectedZoom, points[0].mapLnglat || points[0].lnglat)
      return
    }
    const lngs = points.map((p) => (p.mapLnglat || p.lnglat)[0])
    const lats = points.map((p) => (p.mapLnglat || p.lnglat)[1])
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs), minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const center = [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
    const span = Math.max(maxLng - minLng, maxLat - minLat)
    let zoom = span > 120 ? 2.2 : span > 60 ? 3 : span > 25 ? 4 : span > 10 ? 5 : span > 4 ? 6 : span > 1 ? 8 : 10
    if (points.some((p) => isChinaCountry(p.country)) && points.every((p) => isChinaCountry(p.country))) zoom = Math.max(zoom, 4)
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
      this.updatePreview(this.points, { chinaFirst: false, selectedPointId: point.id })
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

  updatePreview(points, { selectedPointId = this.selectedPointId } = {}) {
    const host = this.container.querySelector('.coordinate-preview-host') || this.container
    const width = 1000, height = 560
    const project = ([lng, lat]) => [((lng + 180) / 360) * width, ((90 - lat) / 180) * height]
    const bins = new Map()
    for (const point of points) {
      const [x, y] = project(point.lnglat)
      const key = `${Math.round(x / 28)}:${Math.round(y / 28)}`
      if (!bins.has(key)) bins.set(key, { x, y, points: [] })
      bins.get(key).points.push(point)
    }
    const grid = []
    for (let x = 100; x < width; x += 100) grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}"/>`)
    for (let y = 70; y < height; y += 70) grid.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}"/>`)
    const dots = [...bins.values()].map((bin) => {
      const count = bin.points.length
      const selected = bin.points.some((point) => point.id === selectedPointId)
      const radius = Math.min(24, 7 + Math.sqrt(count) * 4)
      const ids = bin.points.map((point) => point.id).join('||')
      return `<g class="preview-point ${selected ? 'selected' : ''}" data-preview-ids="${escapeHtml(ids)}" transform="translate(${bin.x.toFixed(1)},${bin.y.toFixed(1)})">
        <circle r="${radius}"/><text y="4" text-anchor="middle">${count}</text>
      </g>`
    }).join('')
    host.innerHTML = `<div class="coordinate-preview-label">${escapeHtml(t('coordinatePreview'))}</div>
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="${escapeHtml(t('coordinatePreview'))}">
        <g class="preview-grid">${grid.join('')}</g>
        <text class="preview-region" x="710" y="210">CHINA / 中国</text>
        <text class="preview-region" x="190" y="190">AMERICAS</text>
        <text class="preview-region" x="520" y="150">EUROPE</text>
        ${dots}
      </svg>`
    host.querySelectorAll('[data-preview-ids]').forEach((element) => {
      element.addEventListener('click', () => {
        const ids = element.dataset.previewIds.split('||')
        const point = points.find((item) => ids.includes(item.id))
        if (point) this.selectPoint(point, { openInfo: false })
      })
    })
  }

  destroy() {
    try { this.cluster?.setMap(null) } catch {}
    try { this.map?.destroy() } catch {}
    this.map = null
    this.cluster = null
    this.mode = 'uninitialized'
  }
}
