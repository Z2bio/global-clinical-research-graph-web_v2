import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSnapshotRecord, filterSnapshotStudies, annotateClinicalTrialsStudy } from '../assets/js/federated.js'
import { mergeExactCrossRegistrations, computeGraphMetrics } from '../assets/js/graph.js'
import { matchesClientFilters } from '../assets/js/normalizer.js'

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

test('classifies NMPA as regulatory drug path but does not auto-label ChiCTR as IIT', () => {
  const nmpa = normalizeSnapshotRecord({
    id: 'CTR20260001', title: 'BE study', stageCode: 'BE', studyType: 'INTERVENTIONAL'
  }, 'nmpa')
  assert.equal(nmpa.registrationPathCode, 'REGULATORY_DRUG')
  assert.equal(nmpa.developmentStageCode, 'BE')

  const chictrUnknown = normalizeSnapshotRecord({ id: 'ChiCTR26000001', title: 'Hospital study' }, 'chictr')
  assert.equal(chictrUnknown.registrationPathCode, 'UNKNOWN')

  const chictrIit = normalizeSnapshotRecord({
    id: 'ChiCTR26000002', title: 'Investigator study', registrationPathCode: 'IIT', researchTypeCode: 'DIAGNOSTIC'
  }, 'chictr')
  assert.equal(chictrIit.registrationPathLabel, 'IIT / 研究者发起研究')
  assert.equal(chictrIit.researchTypeLabel, '诊断研究')
})

test('cross-registration evidence can upgrade an unknown CTG registration path', () => {
  const ctg = annotateClinicalTrialsStudy({
    nctId: 'NCT00000001', identifiers: {}, sourceRecordUrl: 'https://clinicaltrials.gov/study/NCT00000001',
    dates: { lastUpdatePosted: '2026-08-28' }, sponsor: { name: 'A' }, facilities: [], conditions: [],
    registrationPathCode: 'UNKNOWN', registrationPathLabel: '注册路径暂无法判定', registrationPathNote: 'CTG alone cannot decide',
    researchTypeCode: 'INTERVENTIONAL', researchTypeLabel: '干预性研究', developmentStageCode: 'PHASE3', developmentStageLabel: 'Ⅲ期',
    centerScopeCode: 'UNKNOWN', centerScopeLabel: '中心范围未公开'
  })
  const nmpa = normalizeSnapshotRecord({
    id: 'CTR20260002', identifiers: { nmpa: 'CTR20260002', clinicaltrials: 'NCT00000001' }, title: 'Same study'
  }, 'nmpa')
  const [merged] = mergeExactCrossRegistrations([ctg, nmpa])
  assert.equal(merged.registrationPathCode, 'REGULATORY_DRUG')
  assert.equal(merged.sourceRecords.length, 2)
})


test('source filters match any evidence source on a merged study', () => {
  const ctg = annotateClinicalTrialsStudy({
    nctId: 'NCT00000003', identifiers: {}, sourceRecordUrl: 'https://clinicaltrials.gov/study/NCT00000003',
    dates: { lastUpdatePosted: '2026-08-28' }, sponsor: { name: 'A' }, facilities: [], conditions: [],
    registrationPathCode: 'UNKNOWN', registrationPathLabel: '注册路径暂无法判定',
    researchTypeCode: 'INTERVENTIONAL', researchTypeLabel: '干预性研究', developmentStageCode: 'PHASE2', developmentStageLabel: 'Ⅱ期',
    centerScopeCode: 'UNKNOWN', centerScopeLabel: '中心范围未公开'
  })
  const chictr = normalizeSnapshotRecord({
    id: 'ChiCTR26000003', identifiers: { chictr: 'ChiCTR26000003', clinicaltrials: 'NCT00000003' }, title: 'Same study', registrationPathCode: 'IIT'
  }, 'chictr')
  const [merged] = mergeExactCrossRegistrations([ctg, chictr])
  assert.equal(matchesClientFilters(merged, { sourceKeys: ['chictr'] }), true)
  assert.equal(matchesClientFilters(merged, { sourceKeys: ['nmpa'] }), false)
})
