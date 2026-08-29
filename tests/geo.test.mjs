import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeStudyList } from '../assets/js/normalizer.js'
import { buildFacilityPoints, studyPrimaryLocatedFacility, mapMetrics } from '../assets/js/geo.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/studies.json'), 'utf8'))
const studies = normalizeStudyList(fixture).studies

test('normalizer preserves public registry geoPoint coordinates for map use', () => {
  const facility = studyPrimaryLocatedFacility(studies[0])
  assert.ok(facility)
  assert.equal(facility.latitude, 42.3601)
  assert.equal(facility.longitude, -71.0589)
})

test('buildFacilityPoints aggregates studies by execution site coordinate identity', () => {
  const duplicate = structuredClone(studies[0])
  duplicate.nctId = 'NCT09999999'
  duplicate.briefTitle = 'Second study at same center'
  const points = buildFacilityPoints([studies[0], duplicate, studies[1]])
  assert.equal(points.length, 2)
  const boston = points.find((point) => point.city === 'Boston')
  assert.equal(boston.studyCount, 2)
  assert.deepEqual(boston.lnglat, [-71.0589, 42.3601])
})

test('mapMetrics distinguishes total studies, located studies and unique located sites', () => {
  const metrics = mapMetrics(studies)
  assert.equal(metrics.studyCount, 2)
  assert.equal(metrics.locatedStudyCount, 2)
  assert.equal(metrics.facilityCount, 2)
})
