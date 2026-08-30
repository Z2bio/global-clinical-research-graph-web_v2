import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('v2.4 exposes collapsible filters and resizable list-map workspaces', () => {
  const html = read('index.html')
  const css = read('assets/css/styles.css')
  assert.match(html, /id="filter-collapse-button"/)
  assert.match(html, /id="filter-expand-rail"/)
  assert.match(html, /id="results-map-resizer"/)
  assert.match(html, /id="map-results-collapse"/)
  assert.match(html, /id="map-workspace-resizer"/)
  assert.match(css, /\.main-grid\.filters-collapsed/)
  assert.match(css, /--results-list-width/)
  assert.match(css, /--map-list-width/)
})

test('v2.4 keeps visible UI labels instead of exposing i18n keys', () => {
  const html = read('index.html')
  const i18n = read('assets/js/i18n.js')
  assert.doesNotMatch(html, />viewList</)
  assert.doesNotMatch(html, />viewSplit</)
  assert.doesNotMatch(html, />viewMap</)
  assert.match(html, /data-i18n="viewList">列表</)
  assert.match(i18n, /Never expose an internal translation key/)
})

test('v2.4 coordinate preview preserves circles and scope buttons are functional', () => {
  const map = read('assets/js/map.js')
  const css = read('assets/css/styles.css')
  assert.match(map, /preserveAspectRatio="xMidYMid meet"/)
  assert.match(map, /chinaFirst && chinaPoints\.length/)
  assert.match(map, /defaultZoomWorld/)
  assert.match(css, /aspect-ratio:1\/1/)
  assert.match(css, /--cluster-size/)
})

test('v2.4 supports runtime map configuration and multi-source backfill sync', () => {
  const config = read('assets/js/config.js')
  const workflow = read('.github/workflows/sync-sources.yml')
  const sync = read('scripts/sync_sources.py')
  assert.match(config, /__CRG_RUNTIME_CONFIG__/)
  assert.match(workflow, /AMAP_WEB_KEY/)
  assert.match(sync, /crawl_public_pages/)
  assert.match(sync, /NMPA_PREFIX_YEARS/)
  assert.match(sync, /sync_who/)
  assert.match(sync, /sync_nmrr/)
})
