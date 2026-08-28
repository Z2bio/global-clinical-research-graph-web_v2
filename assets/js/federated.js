import { getStatusMeta } from './dictionary.js'
import { cleanText, formatDate } from './normalizer.js'

export const SOURCE_DEFINITIONS = Object.freeze({
  clinicaltrials: {
    key: 'clinicaltrials',
    short: 'CTG',
    name: 'ClinicalTrials.gov',
    layer: 1,
    layerName: '全球主注册层',
    coverage: '美国及全球多中心临床研究',
    mode: 'live-api',
    cadence: '工作日每日更新',
    home: 'https://clinicaltrials.gov/',
    color: 'blue',
    enabled: true
  },
  who: {
    key: 'who',
    short: 'WHO ICTRP',
    name: 'WHO ICTRP',
    layer: 2,
    layerName: '全球跨注册中心层',
    coverage: 'WHO 主注册中心网络的跨注册中心聚合',
    mode: 'snapshot',
    cadence: '官方数据库每周更新',
    home: 'https://trialsearch.who.int/',
    snapshot: './data/who-ictrp.json',
    color: 'cyan',
    enabled: true
  },
  chictr: {
    key: 'chictr',
    short: 'ChiCTR',
    name: '中国临床试验注册中心（ChiCTR）',
    layer: 3,
    layerName: '中国广义临床研究层',
    coverage: '中国 IIT、观察性研究、干预性研究及其他注册研究',
    mode: 'snapshot',
    cadence: '以官方登记页为准',
    home: 'https://www.chictr.org.cn/',
    snapshot: './data/chictr.json',
    color: 'green',
    enabled: true
  },
  nmrr: {
    key: 'nmrr',
    short: '国家医学研究备案',
    name: '国家医学研究登记备案信息系统',
    layer: 3,
    layerName: '中国广义临床研究层',
    coverage: '医疗卫生机构立项后的研究登记备案与公开信息',
    mode: 'snapshot',
    cadence: '以官方公示为准',
    home: 'https://www.medicalresearch.org.cn/',
    snapshot: './data/nmrr.json',
    color: 'violet',
    enabled: true
  },
  nmpa: {
    key: 'nmpa',
    short: 'NMPA',
    name: 'NMPA 药物临床试验登记与信息公示平台',
    layer: 4,
    layerName: '中国药物注册监管层',
    coverage: '中国药物注册性临床试验、BE/PK及 I–IV 期等',
    mode: 'snapshot',
    cadence: '以官方公示为准',
    home: 'https://www.chinadrugtrials.org.cn/',
    snapshot: './data/nmpa.json',
    color: 'orange',
    enabled: true
  }
})

const UNKNOWN = '未公开'

function arr(value) { return Array.isArray(value) ? value : [] }

function normalizeContact(contact = {}) {
  return {
    name: cleanText(contact.name, UNKNOWN),
    role: cleanText(contact.role),
    phone: cleanText(contact.phone, UNKNOWN),
    phoneExt: cleanText(contact.phoneExt),
    email: cleanText(contact.email, UNKNOWN)
  }
}

function normalizeFacility(item = {}, index = 0) {
  return {
    name: cleanText(item.name || item.facility, `执行中心 ${index + 1}`),
    statusCode: cleanText(item.statusCode || item.status, 'UNKNOWN'),
    city: cleanText(item.city),
    state: cleanText(item.state),
    country: cleanText(item.country),
    zip: cleanText(item.zip),
    address: cleanText(item.address || [item.name || item.facility, item.city, item.state, item.country].filter(Boolean).join('，'), UNKNOWN),
    latitude: Number.isFinite(Number(item.latitude)) ? Number(item.latitude) : null,
    longitude: Number.isFinite(Number(item.longitude)) ? Number(item.longitude) : null,
    contacts: arr(item.contacts).map(normalizeContact)
  }
}

function sourceIdMap(record = {}, sourceKey) {
  const identifiers = { ...(record.identifiers || {}) }
  const primary = cleanText(record.id || record.primaryId || identifiers[sourceKey])
  if (primary) identifiers[sourceKey] = primary
  return Object.fromEntries(Object.entries(identifiers).filter(([, value]) => cleanText(value)).map(([key, value]) => [key, cleanText(value)]))
}

export function normalizeSnapshotRecord(record = {}, sourceKey) {
  const source = SOURCE_DEFINITIONS[sourceKey]
  const identifiers = sourceIdMap(record, sourceKey)
  const primaryId = identifiers[sourceKey] || cleanText(record.id || record.primaryId, `${source.short}-未编号`)
  const statusCode = cleanText(record.statusCode || record.status, 'UNKNOWN')
  const statusMeta = getStatusMeta(statusCode)
  const facilities = arr(record.facilities).map(normalizeFacility)
  const conditions = arr(record.conditions).map((x) => cleanText(x)).filter(Boolean)
  const enrollmentCount = Number(record.enrollment?.count)
  const phases = arr(record.phases).map((x) => cleanText(x)).filter(Boolean)
  const phaseLabel = cleanText(record.phaseLabel || phases.join('/'), '分期未公开')
  const sponsorName = cleanText(record.sponsor?.name || record.sponsor, UNKNOWN)
  const sourceUrl = cleanText(record.sourceRecordUrl || record.url, source.home)
  const lastUpdate = formatDate(record.dates?.lastUpdatePosted || record.lastUpdate || record.updatedAt)
  const firstPosted = formatDate(record.dates?.firstPosted || record.registeredAt)
  const interventions = arr(record.interventions).map((item) => typeof item === 'string'
    ? { name: cleanText(item), type: '', typeLabel: '', description: '', armGroupLabels: [], otherNames: [] }
    : {
        name: cleanText(item.name, UNKNOWN),
        type: cleanText(item.type),
        typeLabel: cleanText(item.typeLabel || item.type),
        description: cleanText(item.description, '未提供干预说明'),
        armGroupLabels: arr(item.armGroupLabels),
        otherNames: arr(item.otherNames)
      })

  return {
    nctId: primaryId,
    canonicalId: primaryId,
    identifiers,
    briefTitle: cleanText(record.briefTitle || record.title, '标题未公开'),
    officialTitle: cleanText(record.officialTitle || record.title || record.briefTitle, '标题未公开'),
    acronym: cleanText(record.acronym),
    organizationStudyId: cleanText(record.organizationStudyId),
    statusCode,
    statusLabel: cleanText(record.statusLabel, statusMeta.label),
    statusClass: statusMeta.className,
    statusPlain: cleanText(record.statusPlain, statusMeta.plain),
    statusVerifiedDate: formatDate(record.statusVerifiedDate || lastUpdate),
    whyStopped: cleanText(record.whyStopped),
    phases,
    phaseLabel,
    studyType: cleanText(record.studyType, UNKNOWN),
    studyTypeLabel: cleanText(record.studyTypeLabel || record.studyType, '研究类型未公开'),
    conditions,
    mainCondition: conditions[0] || UNKNOWN,
    keywords: arr(record.keywords).map((x) => cleanText(x)).filter(Boolean),
    registeredSummary: cleanText(record.registeredSummary || record.summary, '官方记录未提供简要摘要。'),
    plainSummary: cleanText(record.plainSummary || record.summary, `来自 ${source.name} 的公开登记记录。`),
    sponsor: {
      name: sponsorName,
      className: cleanText(record.sponsor?.className || record.sponsorClass),
      classLabel: cleanText(record.sponsor?.classLabel || record.sponsorClassLabel || record.sponsorClass, '机构类型未公开')
    },
    collaborators: arr(record.collaborators).map((item) => typeof item === 'string' ? { name: item, className: '', classLabel: '' } : item),
    interventions,
    armGroups: arr(record.armGroups),
    durationSummary: cleanText(record.durationSummary, '公开登记没有统一疗程字段，请查看研究方案原文。'),
    enrollment: {
      count: Number.isFinite(enrollmentCount) ? enrollmentCount : null,
      type: cleanText(record.enrollment?.type),
      typeLabel: cleanText(record.enrollment?.typeLabel, '人数类型未公开')
    },
    dates: {
      start: formatDate(record.dates?.start),
      startType: cleanText(record.dates?.startType),
      primaryCompletion: formatDate(record.dates?.primaryCompletion),
      primaryCompletionType: cleanText(record.dates?.primaryCompletionType),
      completion: formatDate(record.dates?.completion),
      completionType: cleanText(record.dates?.completionType),
      firstSubmitted: formatDate(record.dates?.firstSubmitted),
      firstPosted,
      lastUpdateSubmitted: formatDate(record.dates?.lastUpdateSubmitted),
      lastUpdatePosted: lastUpdate
    },
    centralContacts: arr(record.centralContacts).map(normalizeContact),
    officials: arr(record.officials),
    facilities,
    countries: [...new Set(facilities.map((item) => item.country).filter(Boolean))],
    eligibility: {
      minimumAge: cleanText(record.eligibility?.minimumAge, UNKNOWN),
      maximumAge: cleanText(record.eligibility?.maximumAge, UNKNOWN),
      sex: cleanText(record.eligibility?.sex),
      sexLabel: cleanText(record.eligibility?.sexLabel || record.eligibility?.sex, UNKNOWN),
      healthyVolunteers: cleanText(record.eligibility?.healthyVolunteers, UNKNOWN),
      inclusion: arr(record.eligibility?.inclusion),
      exclusion: arr(record.eligibility?.exclusion),
      original: cleanText(record.eligibility?.original)
    },
    primaryOutcomes: arr(record.primaryOutcomes),
    secondaryOutcomes: arr(record.secondaryOutcomes),
    timeline: arr(record.timeline),
    hasResults: Boolean(record.hasResults),
    sourceRecordUrl: sourceUrl,
    sourceKey,
    sourceName: source.name,
    sourceShort: source.short,
    sourceLayer: source.layer,
    sourceLayerName: source.layerName,
    sourceMode: 'snapshot',
    sourceRecords: [{ sourceKey, sourceName: source.name, id: primaryId, url: sourceUrl, updatedAt: lastUpdate }]
  }
}

export function annotateClinicalTrialsStudy(study) {
  const source = SOURCE_DEFINITIONS.clinicaltrials
  return {
    ...study,
    canonicalId: study.nctId,
    identifiers: { clinicaltrials: study.nctId },
    sourceKey: source.key,
    sourceName: source.name,
    sourceShort: source.short,
    sourceLayer: source.layer,
    sourceLayerName: source.layerName,
    sourceMode: 'live-api',
    sourceRecords: [{ sourceKey: source.key, sourceName: source.name, id: study.nctId, url: study.sourceRecordUrl, updatedAt: study.dates.lastUpdatePosted }]
  }
}

function searchText(study) {
  return [
    study.nctId, study.briefTitle, study.officialTitle, study.sponsor?.name,
    ...Object.values(study.identifiers || {}), ...study.conditions,
    ...study.keywords, ...study.facilities.map((x) => `${x.name} ${x.city} ${x.country}`),
    ...study.interventions.map((x) => `${x.name} ${x.description}`)
  ].join(' ').toLowerCase()
}

export function filterSnapshotStudies(studies, query = '', statusCode = '') {
  const q = cleanText(query).toLowerCase()
  return studies.filter((study) => {
    if (statusCode && study.statusCode !== statusCode) return false
    if (q && !searchText(study).includes(q)) return false
    return true
  })
}

export async function loadSnapshots() {
  const defs = Object.values(SOURCE_DEFINITIONS).filter((source) => source.mode === 'snapshot' && source.snapshot)
  const results = await Promise.all(defs.map(async (source) => {
    try {
      const response = await fetch(source.snapshot, { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const payload = await response.json()
      const records = arr(payload.records).map((record) => normalizeSnapshotRecord(record, source.key))
      return {
        sourceKey: source.key,
        status: records.length ? 'ready' : 'empty',
        generatedAt: cleanText(payload.generatedAt),
        sourceProcessedAt: cleanText(payload.sourceProcessedAt),
        records,
        note: cleanText(payload.note)
      }
    } catch (error) {
      return { sourceKey: source.key, status: 'error', generatedAt: '', records: [], note: error.message }
    }
  }))
  return results
}

export function snapshotStatusMap(results = []) {
  return Object.fromEntries(results.map((result) => [result.sourceKey, result]))
}
