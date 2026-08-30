import { getLocale, t } from './i18n.js'

const $ = (selector, root = document) => root.querySelector(selector)
const STORAGE = {
  filtersCollapsed: 'crg-v24-filters-collapsed',
  resultsSplit: 'crg-v24-results-split',
  mapListCollapsed: 'crg-v24-map-list-collapsed',
  mapSplit: 'crg-v24-map-split'
}

function read(key, fallback = '') {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
function write(key, value) {
  try { localStorage.setItem(key, String(value)) } catch {}
}
function announceLayoutChange() {
  document.dispatchEvent(new CustomEvent('crg:layout-change'))
}

function initFilterCollapse() {
  const shell = $('#filters-shell')
  const grid = shell?.closest('.main-grid')
  const collapse = $('#filter-collapse-button')
  const expand = $('#filter-expand-rail')
  if (!shell || !grid || !collapse || !expand) return

  const apply = (collapsed, { persist = true } = {}) => {
    const canCollapse = window.innerWidth > 980
    collapsed = Boolean(collapsed && canCollapse)
    grid.classList.toggle('filters-collapsed', collapsed)
    shell.classList.toggle('is-collapsed', collapsed)
    collapse.setAttribute('aria-expanded', String(!collapsed))
    collapse.textContent = collapsed ? t('expand') : t('collapse')
    expand.setAttribute('aria-hidden', String(!collapsed))
    if (persist) write(STORAGE.filtersCollapsed, collapsed ? '1' : '0')
    requestAnimationFrame(announceLayoutChange)
  }

  collapse.addEventListener('click', () => apply(!grid.classList.contains('filters-collapsed')))
  expand.addEventListener('click', () => apply(false))
  document.addEventListener('crg:language-change', () => apply(grid.classList.contains('filters-collapsed'), { persist: false }))
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 980 && grid.classList.contains('filters-collapsed')) apply(false, { persist: false })
  })
  apply(read(STORAGE.filtersCollapsed, '0') === '1', { persist: false })
}

function makeResizable({ container, handle, storageKey, minPx, maxFraction = 0.72, property, side = 'left', resetButton }) {
  if (!container || !handle) return

  const applyStored = () => {
    const raw = Number(read(storageKey, ''))
    if (Number.isFinite(raw) && raw > 0) container.style.setProperty(property, `${raw}px`)
  }
  applyStored()

  let active = false
  const setFromEvent = (event) => {
    const rect = container.getBoundingClientRect()
    let px = side === 'left' ? event.clientX - rect.left : rect.right - event.clientX
    const max = Math.max(minPx, rect.width * maxFraction)
    px = Math.max(minPx, Math.min(max, px))
    container.style.setProperty(property, `${Math.round(px)}px`)
    write(storageKey, Math.round(px))
    announceLayoutChange()
  }
  handle.addEventListener('pointerdown', (event) => {
    if (window.innerWidth <= 1080) return
    active = true
    handle.setPointerCapture?.(event.pointerId)
    handle.classList.add('is-dragging')
    setFromEvent(event)
    event.preventDefault()
  })
  handle.addEventListener('pointermove', (event) => { if (active) setFromEvent(event) })
  const stop = (event) => {
    if (!active) return
    active = false
    handle.releasePointerCapture?.(event.pointerId)
    handle.classList.remove('is-dragging')
  }
  handle.addEventListener('pointerup', stop)
  handle.addEventListener('pointercancel', stop)
  handle.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') {
      container.style.removeProperty(property)
      write(storageKey, '')
    } else {
      const current = parseFloat(getComputedStyle(container).getPropertyValue(property)) || container.getBoundingClientRect().width * .46
      const delta = event.key === 'ArrowLeft' ? -28 : 28
      const rect = container.getBoundingClientRect()
      const next = Math.max(minPx, Math.min(rect.width * maxFraction, current + delta))
      container.style.setProperty(property, `${Math.round(next)}px`)
      write(storageKey, Math.round(next))
    }
    announceLayoutChange()
  })
  resetButton?.addEventListener('click', () => {
    container.style.removeProperty(property)
    write(storageKey, '')
    announceLayoutChange()
  })
}

function initResultsSplit() {
  const layout = $('#results-map-layout')
  const handle = $('#results-map-resizer')
  const reset = $('#results-map-auto-layout')
  makeResizable({
    container: layout,
    handle,
    resetButton: reset,
    storageKey: STORAGE.resultsSplit,
    minPx: 360,
    maxFraction: .68,
    property: '--results-list-width'
  })
  document.addEventListener('crg:language-change', () => {
    if (reset) reset.textContent = t('autoLayout')
  })
  if (reset) reset.textContent = t('autoLayout')
}

function initFullMapWorkspace() {
  const workspace = $('.map-workspace')
  const collapse = $('#map-results-collapse')
  const expand = $('#map-results-expand')
  const handle = $('#map-workspace-resizer')
  if (!workspace || !collapse || !expand || !handle) return

  const applyCollapsed = (collapsed, { persist = true } = {}) => {
    const canCollapse = window.innerWidth > 820
    collapsed = Boolean(collapsed && canCollapse)
    workspace.classList.toggle('map-list-collapsed', collapsed)
    collapse.setAttribute('aria-expanded', String(!collapsed))
    collapse.textContent = collapsed ? t('expand') : t('collapse')
    if (persist) write(STORAGE.mapListCollapsed, collapsed ? '1' : '0')
    requestAnimationFrame(announceLayoutChange)
  }
  collapse.addEventListener('click', () => applyCollapsed(!workspace.classList.contains('map-list-collapsed')))
  expand.addEventListener('click', () => applyCollapsed(false))
  document.addEventListener('crg:language-change', () => applyCollapsed(workspace.classList.contains('map-list-collapsed'), { persist: false }))
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 820 && workspace.classList.contains('map-list-collapsed')) applyCollapsed(false, { persist: false })
  })
  applyCollapsed(read(STORAGE.mapListCollapsed, '0') === '1', { persist: false })

  makeResizable({
    container: workspace,
    handle,
    storageKey: STORAGE.mapSplit,
    minPx: 300,
    maxFraction: .62,
    property: '--map-list-width'
  })
}

export function initWorkspaceLayout() {
  initFilterCollapse()
  initResultsSplit()
  initFullMapWorkspace()
}
