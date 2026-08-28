import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  matchesClientFilters,
  normalizeStudyList,
  sortStudies
} from '../assets/js/normalizer.js'
import { buildSearchUrl } from '../assets/js/api.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/studies.json'), 'utf8'))

test('normalizes ClinicalTrials.gov v2 response into public-board records', () => {
  const result = normalizeStudyList(fixture)
  assert.equal(result.totalCount, 142)
  assert.equal(result.nextPageToken, 'NEXT_TEST_TOKEN')
  assert.equal(result.studies.length, 2)

  const study = result.studies[0]
  assert.equal(study.nctId, 'NCT01234567')
  assert.equal(study.statusLabel, '招募中')
  assert.equal(study.phaseLabel, 'Ⅲ期')
  assert.equal(study.sponsor.classLabel, '企业')
  assert.equal(study.enrollment.typeLabel, '计划招募人数')
  assert.equal(study.facilities[0].country, 'United States')
  assert.match(study.durationSummary, /3 weeks/i)
  assert.equal(study.eligibility.inclusion.length, 2)
  assert.equal(study.eligibility.exclusion.length, 2)
})

test('builds API query using common Chinese disease translation', () => {
  const url = buildSearchUrl({ query: '肺癌', statusCode: 'RECRUITING' })
  assert.equal(url.searchParams.get('query.term'), 'lung cancer')
  assert.equal(url.searchParams.get('filter.overallStatus'), 'RECRUITING')
  assert.equal(url.searchParams.get('countTotal'), 'true')
})

test('filters and sorts normalized records safely', () => {
  const studies = normalizeStudyList(fixture).studies
  const filtered = studies.filter((study) => matchesClientFilters(study, { country: 'United States', sponsorClass: 'INDUSTRY' }))
  assert.equal(filtered.length, 1)
  assert.equal(filtered[0].nctId, 'NCT01234567')

  const sorted = sortStudies(studies, 'enrollment-desc')
  assert.equal(sorted[0].nctId, 'NCT07654321')
})
