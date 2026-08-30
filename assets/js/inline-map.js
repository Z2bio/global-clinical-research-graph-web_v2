import { CONFIG } from './config.js'
import { buildFacilityPoints, mapMetrics } from './geo.js'
import { geocodeMissingChinaFacilities, ResearchMapController } from './map.js'
import { SOURCE_DEFINITIONS } from './federated.js'
import { getLocale } from './i18n.js'

const $ = (selector, root = document) => root.querySelector(selector)
let studies = []
let locatedStudies = []
let controller = null
let chinaFirst = true
let viewMode = localStorage.getItem('crg-results-view-v23') || (window.innerWidth >= 1080 ? 'split' : 'list')
let renderToken = 0

function esc(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')
}

function sourceShort(sourceKey) { return SOURCE_DEFINITIONS[sourceKey]?.short || sourceKey }

function setMode(mode, { persist = true } = {}) {
  if (window.innerWidth <= 1080 && mode === 'split') mode = 'list'
  viewMode = mode
  const layout = $('#results-map-layout')
  if (!layout) return
  layout.classList.remove('mode-list', 'mode-split', 'mode-map')
  layout.classList.add(`mode-${mode}`)
  document.querySelectorAll('[data-results-view]').forEach((button) => button.classList.toggle('active', button.dataset.resultsView === mode))
  if (persist) localStorage.setItem('crg-results-view-v23', mode)
  if (mode !== 'list') requestAnimationFrame(render)
}

function facilityPanel(point) {
  const panel = $('#inline-map-facility')
  if (!panel) return
  if (!point) { panel.hidden = true; panel.innerHTML = ''; return }
  const en = getLocale() === 'en-US'
  panel.hidden = false
  const rows = (point.studies || []).slice(0, 10).map((study) => `
    <li>
      <a href="#/study/${encodeURIComponent(study.nctId)}" data-inline-linked-study="${esc(study.nctId)}">${esc(study.briefTitle)}</a>
      <small>${esc(study.statusLabel || '')} · ${esc((study.sourceRecords || []).map((r) => sourceShort(r.sourceKey)).join(' / '))}</small>
    </li>`).join('')
  panel.innerHTML = `
    <button class="map-panel-close" type="button" data-inline-close-facility aria-label="Close">×</button>
    <div class="map-facility-kicker">${en ? 'Site / Facility' : '执行中心 / Facility'}</div>
    <h3>${esc(point.name)}</h3>
    <p>${esc([point.city, point.state, point.country].filter(Boolean).join(' · ') || '—')}</p>
    <div class="map-facility-summary"><span>${en ? 'Linked studies' : '关联研究'}<b>${point.studyCount}</b></span><span>${en ? 'Sources' : '来源'}<b>${esc((point.sourceKeys || []).map(sourceShort).join(' / ') || '—')}</b></span></div>
    <ol>${rows}</ol>`
}

function providerStatus(status = {}) {
  const host = $('#inline-map-status')
  if (!host) return
  const en = getLocale() === 'en-US'
  if (status.mode === 'amap') {
    host.className = 'map-provider-status compact ready'
    host.innerHTML = `<strong>AMap / 高德地图</strong><span>${en ? 'Interactive map ready' : '交互地图已启用'}</span>`
  } else {
    host.className = 'map-provider-status compact warning'
    host.innerHTML = `<strong>${en ? 'Map key not configured' : '地图 Key 未配置'}</strong><span>${en ? 'Coordinate preview is active. Configure an AMap Web JS API key for the production basemap.' : '当前为坐标分布预览；配置高德 Web JS API Key 后显示正式地图。'}</span>`
  }
}

async function render() {
  const host = $('#inline-map-canvas')
  if (!host || viewMode === 'list') return
  const token = ++renderToken
  locatedStudies = await geocodeMissingChinaFacilities(studies, { limit: CONFIG.map.geocodeBatchLimit })
  if (token !== renderToken) return
  const metrics = mapMetrics(locatedStudies)
  $('#inline-map-study-count').textContent = Number(studies.length).toLocaleString(getLocale())
  $('#inline-map-facility-count').textContent = Number(metrics.facilityCount).toLocaleString(getLocale())
  const points = buildFacilityPoints(locatedStudies, { maxPoints: CONFIG.map.maxRenderedFacilities })
  if (!controller) {
    controller = new ResearchMapController(host, {
      onFacilitySelect: facilityPanel,
      onStatus: providerStatus
    })
  }
  await controller.update(points, { chinaFirst })
}

function highlightStudy(id) {
  document.querySelectorAll('.trial-card.map-highlight').forEach((card) => card.classList.remove('map-highlight'))
  const card = document.querySelector(`.trial-card[data-study-id="${CSS.escape(id)}"]`)
  if (card) {
    card.classList.add('map-highlight')
    setTimeout(() => card.classList.remove('map-highlight'), 2600)
  }
}

function focusStudy(id) {
  const study = locatedStudies.find((item) => item.nctId === id) || studies.find((item) => item.nctId === id)
  if (!study) return
  if (viewMode === 'list') setMode(window.innerWidth > 1080 ? 'split' : 'map')
  requestAnimationFrame(async () => {
    await render()
    const ok = controller?.focusStudy(study)
    if (!ok) {
      const status = $('#inline-map-status')
      if (status) {
        status.className = 'map-provider-status compact warning'
        status.innerHTML = getLocale() === 'en-US' ? '<strong>No locatable coordinates</strong><span>The public site record has no coordinates. With an AMap key configured, the app can also geocode mainland-China institution names.</span>' : '<strong>暂无可定位坐标</strong><span>该研究的公开执行中心暂未提供坐标；配置高德 Key 后系统也会尝试对中国机构名称进行地理编码。</span>'
      }
    }
    $('#inline-map-pane')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function bind() {
  $('#results-view-switch')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-results-view]')
    if (button) setMode(button.dataset.resultsView)
  })
  $('#inline-map-china')?.addEventListener('click', () => {
    chinaFirst = true
    $('#inline-map-china').classList.add('active'); $('#inline-map-world').classList.remove('active')
    render()
  })
  $('#inline-map-world')?.addEventListener('click', () => {
    chinaFirst = false
    $('#inline-map-world').classList.add('active'); $('#inline-map-china').classList.remove('active')
    render()
  })
  document.addEventListener('click', (event) => {
    const focus = event.target.closest('[data-inline-map-focus]')
    if (focus) { event.preventDefault(); focusStudy(focus.dataset.inlineMapFocus) }
    if (event.target.closest('[data-inline-close-facility]')) facilityPanel(null)
    const linked = event.target.closest('[data-inline-linked-study]')
    if (linked) highlightStudy(linked.dataset.inlineLinkedStudy)
  })
  document.addEventListener('crg:studies-updated', (event) => {
    studies = Array.isArray(event.detail?.studies) ? event.detail.studies : []
    if (viewMode !== 'list') render()
  })
  document.addEventListener('crg:language-change', () => { if (viewMode !== 'list') render() })
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 1080 && viewMode === 'split') setMode('list', { persist: false })
  })
}

bind()
setMode(viewMode, { persist: false })
if (window.__CRG_PUBLIC_STATE__?.studies) studies = window.__CRG_PUBLIC_STATE__.studies
