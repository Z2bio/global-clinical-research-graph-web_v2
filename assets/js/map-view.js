import { CONFIG } from './config.js'
import { SOURCE_DEFINITIONS } from './federated.js'
import { buildFacilityPoints, hasChinaLocation, mapMetrics, studyPrimaryLocatedFacility } from './geo.js'
import { ResearchMapController } from './map.js'
import { getLocale, t, translateDocument } from './i18n.js'

const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
function esc(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;') }

let studies = []
let mapController = null
let chinaFirst = true
let activeFacility = null
let lastMapStatus = null

function translatedSourceName(key) {
  if (key === 'nmrr') return getLocale() === 'en-US' ? 'National Medical Research Registry' : '国家医学研究备案'
  if (key === 'chictr') return 'ChiCTR'
  if (key === 'clinicaltrials') return 'ClinicalTrials.gov'
  if (key === 'who') return 'WHO ICTRP'
  if (key === 'nmpa') return 'NMPA'
  return SOURCE_DEFINITIONS[key]?.short || key
}

function localizedStudyTitle(study) {
  if (getLocale() === 'zh-CN') return study.zhTitle || study.briefTitle || study.officialTitle
  return study.enTitle || study.briefTitle || study.officialTitle
}

function mapStudyCard(study) {
  const facility = studyPrimaryLocatedFacility(study)
  const sourceBadges = (study.sourceRecords || [{ sourceKey: study.sourceKey }]).map((source) => `<span>${esc(translatedSourceName(source.sourceKey))}</span>`).join('')
  const title = localizedStudyTitle(study)
  const loc = facility ? [facility.name, facility.city, facility.country].filter(Boolean).join(' · ') : (getLocale() === 'en-US' ? 'No public coordinates' : '暂无公开坐标')
  return `<article class="map-study-card" data-map-study-id="${esc(study.nctId)}">
    <div class="map-study-card-top"><span class="map-status-dot ${esc(study.statusClass || '')}"></span><strong>${esc(study.statusLabel || '')}</strong><div class="map-source-tags">${sourceBadges}</div></div>
    <h3>${esc(title)}</h3>
    <p class="map-study-meta">${esc(study.registrationPathLabel || '')} · ${esc(study.researchTypeLabel || study.studyTypeLabel || '')} · ${esc(study.developmentStageLabel || study.phaseLabel || '')}</p>
    <div class="map-study-location"><span>◎</span><span>${esc(loc)}</span></div>
    <div class="map-study-actions">
      <button type="button" data-focus-study="${esc(study.nctId)}">${esc(t('focusOnMap'))}</button>
      <a href="#/study/${encodeURIComponent(study.nctId)}">${esc(t('openStudy'))}</a>
    </div>
  </article>`
}

function facilityPanel(point) {
  const panel = $('#map-facility-panel')
  if (!panel) return
  if (!point) { panel.hidden = true; panel.innerHTML = ''; return }
  activeFacility = point
  const studiesHtml = point.studies.slice(0, 8).map((study) => `<li><a href="#/study/${encodeURIComponent(study.nctId)}">${esc(localizedStudyTitle(study))}</a><small>${esc(study.statusLabel || '')} · ${esc(study.nctId)}</small></li>`).join('')
  panel.hidden = false
  panel.innerHTML = `<button class="map-panel-close" type="button" data-close-facility aria-label="Close">×</button>
    <div class="map-facility-kicker">${esc(t('facility'))}</div>
    <h3>${esc(point.name)}</h3>
    <p>${esc([point.city, point.state, point.country].filter(Boolean).join(' · ') || '—')}</p>
    <div class="map-facility-summary"><span>${esc(t('linkedStudies'))}<b>${point.studyCount}</b></span><span>${esc(t('sources'))}<b>${esc(point.sourceKeys.map(translatedSourceName).join(' / ') || '—')}</b></span></div>
    <ol>${studiesHtml}</ol>`
}

function renderMapStatus() {
  const host = $('#map-provider-status')
  if (!host || !lastMapStatus) return
  if (lastMapStatus.mode === 'amap') {
    host.className = 'map-provider-status ready'
    host.innerHTML = `<strong>AMap / 高德地图</strong><span>${getLocale() === 'en-US' ? 'China-ready map mode' : '中国境内地图模式已启用'}</span>`
  } else {
    host.className = 'map-provider-status warning'
    host.innerHTML = `<strong>${esc(t('mapNeedsKeyTitle'))}</strong><span>${esc(t('mapNeedsKeyBody'))}</span>`
  }
}

function renderMetrics() {
  const metrics = mapMetrics(studies)
  $('#map-study-count').textContent = metrics.studyCount.toLocaleString(getLocale())
  $('#map-located-study-count').textContent = metrics.locatedStudyCount.toLocaleString(getLocale())
  $('#map-facility-count').textContent = metrics.facilityCount.toLocaleString(getLocale())
}

async function renderMap() {
  const host = $('#research-map-canvas')
  if (!host) return
  renderMetrics()
  $('#map-study-list').innerHTML = studies.length ? studies.slice(0, 80).map(mapStudyCard).join('') : `<div class="map-empty">${esc(t('noStudies'))}</div>`
  const points = buildFacilityPoints(studies, { maxPoints: CONFIG.map.maxRenderedFacilities })
  $('#map-no-coordinate-note').hidden = points.length > 0
  if (!mapController) {
    mapController = new ResearchMapController(host, {
      onFacilitySelect: facilityPanel,
      onStatus: (status) => { lastMapStatus = status; renderMapStatus() }
    })
  }
  await mapController.update(points, { chinaFirst })
  renderMapStatus()
  translateDocument($('#map-view'))
}

function syncFilterUI() {
  const pairs = [
    ['map-registration-path-filter', 'registration-path-filter'],
    ['map-research-type-filter', 'research-type-filter'],
    ['map-status-filter', 'status-filter'],
    ['map-country-filter', 'country-filter']
  ]
  if ($('#map-search-input') && $('#search-input')) $('#map-search-input').value = $('#search-input').value
  for (const [mapId, mainId] of pairs) {
    const mapEl = document.getElementById(mapId), mainEl = document.getElementById(mainId)
    if (!mapEl || !mainEl) continue
    if (mapId === 'map-country-filter') mapEl.innerHTML = mainEl.innerHTML
    mapEl.value = mainEl.value
  }
  const selectedSources = new Set($$('#source-filter-options input:checked').map((input) => input.value))
  $$('#map-source-options input').forEach((input) => { input.checked = selectedSources.has(input.value) })
}

function setMainSelect(mainId, value) {
  const el = document.getElementById(mainId)
  if (!el) return
  el.value = value
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function bindMapFilters() {
  $('#map-search-form')?.addEventListener('submit', (event) => {
    event.preventDefault()
    const query = $('#map-search-input').value.trim()
    $('#search-input').value = query
    $('#search-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  $('#map-registration-path-filter')?.addEventListener('change', (event) => setMainSelect('registration-path-filter', event.target.value))
  $('#map-research-type-filter')?.addEventListener('change', (event) => setMainSelect('research-type-filter', event.target.value))
  $('#map-status-filter')?.addEventListener('change', (event) => setMainSelect('status-filter', event.target.value))
  $('#map-country-filter')?.addEventListener('change', (event) => setMainSelect('country-filter', event.target.value))
  $('#map-source-options')?.addEventListener('change', (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return
    const checked = $$('#map-source-options input:checked').map((input) => input.value)
    if (!checked.length) { event.target.checked = true; return }
    $$('#source-filter-options input').forEach((input) => { input.checked = checked.includes(input.value) })
    // Dispatch one event; app.js reads the complete set of checked source boxes.
    const first = $('#source-filter-options input')
    first?.dispatchEvent(new Event('change', { bubbles: true }))
  })
  $('#map-reset-filters')?.addEventListener('click', () => $('#reset-filters')?.click())
  $('#map-view-mode-china')?.addEventListener('click', () => { chinaFirst = true; $('#map-view-mode-china').classList.add('active'); $('#map-view-mode-world').classList.remove('active'); renderMap() })
  $('#map-view-mode-world')?.addEventListener('click', () => { chinaFirst = false; $('#map-view-mode-world').classList.add('active'); $('#map-view-mode-china').classList.remove('active'); renderMap() })

  $('#map-study-list')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-focus-study]')
    if (!button) return
    const study = studies.find((item) => item.nctId === button.dataset.focusStudy)
    if (study) mapController?.focusStudy(study)
  })
  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-facility]')) facilityPanel(null)
  })
}

function buildSourceOptions() {
  const host = $('#map-source-options')
  if (!host) return
  host.innerHTML = Object.keys(SOURCE_DEFINITIONS).map((key) => `<label><input type="checkbox" value="${esc(key)}" checked><span>${esc(translatedSourceName(key))}</span></label>`).join('')
}

function initMapView() {
  buildSourceOptions()
  bindMapFilters()
  document.addEventListener('crg:studies-updated', (event) => {
    studies = Array.isArray(event.detail?.studies) ? event.detail.studies : []
    syncFilterUI()
    if (!$('#map-view')?.hidden) renderMap()
  })
  document.addEventListener('crg:language-change', () => {
    buildSourceOptions(); syncFilterUI(); facilityPanel(activeFacility)
    if (mapController) { mapController.destroy(); mapController = null }
    if (!$('#map-view')?.hidden) renderMap()
  })
  window.addEventListener('hashchange', () => {
    if (!$('#map-view')?.hidden) { syncFilterUI(); renderMap() }
  })
  if (window.__CRG_PUBLIC_STATE__?.studies) studies = window.__CRG_PUBLIC_STATE__.studies
  if (!$('#map-view')?.hidden) { syncFilterUI(); renderMap() }
}

initMapView()
