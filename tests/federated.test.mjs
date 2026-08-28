import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSnapshotRecord, filterSnapshotStudies, annotateClinicalTrialsStudy } from '../assets/js/federated.js'
import { mergeExactCrossRegistrations, computeGraphMetrics } from '../assets/js/graph.js'

test('normalizes a ChiCTR snapshot record into the shared study model', () => {
  const study = normalizeSnapshotRecord({
    id: 'ChiCTR2600123456',
    identifiers: { chictr: 'ChiCTR2600123456', clinicaltrials: 'NCT01234567' },
    title: '肺癌研究示例',
    statusCode: 'RECRUITING',
    conditions: ['肺癌'],
    sponsor: { name: '示例医院' },
    facilities: [{ name: '示例医院', city: '北京', country: 'China' }],
    dates: { lastUpdatePosted: '2026-08-28' },
    sourceRecordUrl: 'https://www.chictr.org.cn/'
  }, 'chictr')
  assert.equal(study.sourceKey, 'chictr')
  assert.equal(study.nctId, 'ChiCTR2600123456')
  assert.equal(study.statusLabel, '招募中')
  assert.equal(study.identifiers.clinicaltrials, 'NCT01234567')
  assert.equal(study.facilities[0].country, 'China')
})

test('merges records only when an exact cross-registration identifier is shared', () => {
  const ctg = annotateClinicalTrialsStudy({
    nctId: 'NCT01234567', identifiers: {}, sourceRecordUrl: 'https://clinicaltrials.gov/study/NCT01234567',
    dates: { lastUpdatePosted: '2026-08-28' }, sponsor: { name: 'A' }, facilities: [], conditions: []
  })
  const chictr = normalizeSnapshotRecord({
    id: 'ChiCTR2600123456', identifiers: { chictr: 'ChiCTR2600123456', clinicaltrials: 'NCT01234567' },
    title: '同一研究', sponsor: { name: 'A' }, sourceRecordUrl: 'https://www.chictr.org.cn/'
  }, 'chictr')
  const other = normalizeSnapshotRecord({
    id: 'ChiCTR2600999999', title: '标题相似但没有交叉编号', sponsor: { name: 'A' }, sourceRecordUrl: 'https://www.chictr.org.cn/'
  }, 'chictr')
  const merged = mergeExactCrossRegistrations([ctg, chictr, other])
  assert.equal(merged.length, 2)
  const cross = merged.find((x) => x.nctId === 'NCT01234567')
  assert.equal(cross.sourceRecords.length, 2)
  assert.equal(cross.identifiers.chictr, 'ChiCTR2600123456')
})

test('filters snapshot studies client-side and computes graph metrics', () => {
  const records = [
    normalizeSnapshotRecord({ id: 'CTR1', title: 'Breast cancer study', conditions: ['Breast Cancer'], sponsor: { name: 'Sponsor A' }, facilities: [{ name: 'Hospital A', country: 'China' }] }, 'nmpa'),
    normalizeSnapshotRecord({ id: 'CTR2', title: 'Diabetes study', conditions: ['Diabetes'], sponsor: { name: 'Sponsor B' }, facilities: [{ name: 'Hospital B', country: 'China' }] }, 'nmpa')
  ]
  assert.equal(filterSnapshotStudies(records, 'breast', '').length, 1)
  const metrics = computeGraphMetrics(records)
  assert.equal(metrics.studies, 2)
  assert.equal(metrics.sponsors, 2)
  assert.equal(metrics.institutions, 2)
})
