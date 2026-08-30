import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const css = fs.readFileSync(new URL('../assets/css/styles.css', import.meta.url), 'utf8')
const status = JSON.parse(fs.readFileSync(new URL('../data/source-status.json', import.meta.url), 'utf8'))
const chictr = JSON.parse(fs.readFileSync(new URL('../data/chictr.json', import.meta.url), 'utf8'))
const nmpa = JSON.parse(fs.readFileSync(new URL('../data/nmpa.json', import.meta.url), 'utf8'))

test('v2.3 exposes an always-operable custom filter scrollbar on desktop', () => {
  assert.match(html, /id="filter-scroll-thumb"/)
  assert.match(html, /id="filter-scroll-up"/)
  assert.match(html, /id="filter-scroll-down"/)
  assert.match(css, /\.filter-scrollbar\s*\{/)
  assert.match(css, /\.filters-shell[\s\S]*position:\s*sticky/)
})

test('v2.3 puts list and map in the main public-results workspace', () => {
  assert.match(html, /data-results-view="split"/)
  assert.match(html, /id="inline-map-canvas"/)
  assert.match(html, /id="inline-map-facility"/)
  assert.match(html, /打开完整研究图谱/)
})

test('source health is explicit and seeded China sources are present', () => {
  assert.equal(status.clinicaltrials.status, 'live')
  assert.ok(['seeded', 'ready', 'partial'].includes(status.chictr.status))
  assert.ok(chictr.records.length > 0)
  assert.ok(nmpa.records.length > 0)
  assert.equal(status.who.status, 'authorization-required')
  assert.equal(status.nmrr.status, 'feed-required')
})
