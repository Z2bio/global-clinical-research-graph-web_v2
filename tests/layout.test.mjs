import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const css = fs.readFileSync(new URL('../assets/css/styles.css', import.meta.url), 'utf8')

test('desktop structured filter sidebar is independently scrollable', () => {
  const rule = css.match(/\.filters-panel\s*\{([\s\S]*?)\}/)?.[1] || ''
  assert.match(rule, /position:\s*sticky/)
  assert.match(rule, /max-height:\s*calc\(100dvh\s*-\s*112px\)/)
  assert.match(rule, /overflow-y:\s*auto/)
  assert.match(rule, /overscroll-behavior:\s*contain/)
  assert.match(rule, /scrollbar-gutter:\s*stable/)
})
