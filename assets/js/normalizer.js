import {
  ENROLLMENT_TYPE_LABELS,
  INTERVENTION_TYPE_LABELS,
  PHASE_LABELS,
  SEX_LABELS,
  SPONSOR_CLASS_LABELS,
  STUDY_TYPE_LABELS,
  getStatusMeta,
  phaseLabel
} from './dictionary.js'

const UNKNOWN = '未公开'

export function asArray(value) {
  return Array.isArray(value) ? value : []
}

export function cleanText(value, fallback = '') {
  if (value === null || value === undefined) return fallback
  const text = String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text || fallback
}

export function formatDate(value) {
  const raw = cleanText(value)
  if (!raw) return UNKNOWN
  const iso = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  return iso || raw
}

export function formatNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? new Intl.NumberFormat('zh-CN').format(number) : '—'
}

function normalizeContact(contact = {}) {
  return {
    name: cleanText(contact.name, UNKNOWN),
    role: cleanText(contact.role),
    phone: cleanText(contact.phone, UNKNOWN),
    phoneExt: cleanText(contact.phoneExt),
    email: cleanText(contact.email, UNKNOWN)
  }
}

function normalizeFacility(location = {}, index = 0) {
  const geoPoint = location.geoPoint || {}
  const addressParts = [location.facility, location.city, location.state, location.zip, location.country]
    .map((item) => cleanText(item))
    .filter(Boolean)
  return {
    name: cleanText(location.facility, `执行中心 ${index + 1}`),
    statusCode: cleanText(location.status, 'UNKNOWN'),
    city: cleanText(location.city),
    state: cleanText(location.state),
    country: cleanText(location.country),
    zip: cleanText(location.zip),
    address: addressParts.join('，') || UNKNOWN,
    latitude: Number.isFinite(Number(geoPoint.lat)) ? Number(geoPoint.lat) : null,
    longitude: Number.isFinite(Number(geoPoint.lon)) ? Number(geoPoint.lon) : null,
    contacts: asArray(location.contacts).map(normalizeContact)
  }
}

function extractCriteria(criteriaText) {
  const original = cleanText(criteriaText)
  if (!original) return { inclusion: [], exclusion: [], original: '' }

  const normalized = original
    .replace(/\bInclusion Criteria\s*:?/i, '\n##INCLUSION##\n')
    .replace(/\bExclusion Criteria\s*:?/i, '\n##EXCLUSION##\n')
  const inclusionStart = normalized.indexOf('##INCLUSION##')
  const exclusionStart = normalized.indexOf('##EXCLUSION##')

  const toItems = (section) => cleanText(section)
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter((line) => line && !/^criteria$/i.test(line))
    .slice(0, 30)

  if (inclusionStart >= 0 || exclusionStart >= 0) {
    const inclusionText = inclusionStart >= 0
      ? normalized.slice(inclusionStart + '##INCLUSION##'.length, exclusionStart >= 0 ? exclusionStart : undefined)
      : ''
    const exclusionText = exclusionStart >= 0
      ? normalized.slice(exclusionStart + '##EXCLUSION##'.length)
      : ''
    return {
      inclusion: toItems(inclusionText),
      exclusion: toItems(exclusionText),
      original
    }
  }

  return { inclusion: [], exclusion: [], original }
}

function extractDuration(interventions = [], armGroups = []) {
  const candidates = [...interventions, ...armGroups]
    .map((item) => cleanText(item.description))
    .filter(Boolean)

  const durationPatterns = [
    /(?:for|over|during|up to|every)\s+[^.;\n]{0,45}?\b\d+(?:\.\d+)?\s*(?:day|days|week|weeks|month|months|year|years|cycle|cycles)\b[^.;\n]{0,55}/i,
    /\b\d+(?:\.\d+)?\s*(?:day|days|week|weeks|month|months|year|years|cycle|cycles)\b[^.;\n]{0,70}/i,
    /\b(?:daily|weekly|monthly|once every [^.;\n]{1,25})\b[^.;\n]{0,70}/i
  ]

  for (const text of candidates) {
    for (const pattern of durationPatterns) {
      const match = text.match(pattern)
      if (match) return cleanText(match[0])
    }
  }
  return '公开登记没有统一的“疗程”字段，请在下方查看干预方案原文。'
}

function generatedPlainSummary({ studyTypeLabel, phaseText, conditions, enrollment, statusMeta }) {
  const diseaseText = conditions.length ? conditions.slice(0, 3).join('、') : '未公开疾病'
  const enrollmentText = enrollment.count
    ? `公开登记的${enrollment.typeLabel}为 ${formatNumber(enrollment.count)} 人`
    : '公开登记未给出招募人数'
  return `这是一项${phaseText === '分期未公开' ? '' : `${phaseText}的`}${studyTypeLabel}，研究疾病包括 ${diseaseText}；${enrollmentText}。当前状态为“${statusMeta.label}”。`
}

function buildTimeline(statusModule = {}) {
  const items = [
    {
      date: formatDate(statusModule.studyFirstPostDateStruct?.date),
      title: '首次公示',
      detail: '该研究首次在 ClinicalTrials.gov 公开登记。'
    },
    {
      date: formatDate(statusModule.startDateStruct?.date),
      title: '研究开始',
      detail: '公开登记中的研究开始日期。'
    },
    {
      date: formatDate(statusModule.primaryCompletionDateStruct?.date),
      title: '主要终点预计完成',
      detail: '主要结局指标预计完成或实际完成的日期。'
    },
    {
      date: formatDate(statusModule.completionDateStruct?.date),
      title: '研究预计完成',
      detail: '公开登记中的研究完成日期。'
    },
    {
      date: formatDate(statusModule.lastUpdatePostDateStruct?.date),
      title: '最近更新',
      detail: '该登记记录最近一次公开更新。'
    }
  ].filter((item) => item.date !== UNKNOWN)

  return items
    .filter((item, index, array) => array.findIndex((candidate) => candidate.date === item.date && candidate.title === item.title) === index)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function normalizeStudy(study = {}) {
  const protocol = study.protocolSection || {}
  const identification = protocol.identificationModule || {}
  const statusModule = protocol.statusModule || {}
  const conditionsModule = protocol.conditionsModule || {}
  const designModule = protocol.designModule || {}
  const sponsorModule = protocol.sponsorCollaboratorsModule || {}
  const armsModule = protocol.armsInterventionsModule || {}
  const descriptionModule = protocol.descriptionModule || {}
  const contactsModule = protocol.contactsLocationsModule || {}
  const eligibilityModule = protocol.eligibilityModule || {}
  const outcomesModule = protocol.outcomesModule || {}

  const nctId = cleanText(identification.nctId, 'NCT 编号未公开')
  const statusCode = cleanText(statusModule.overallStatus, 'UNKNOWN')
  const statusMeta = getStatusMeta(statusCode)
  const phases = asArray(designModule.phases)
  const phaseText = phaseLabel(phases)
  const enrollmentInfo = designModule.enrollmentInfo || {}
  const enrollment = {
    count: Number.isFinite(Number(enrollmentInfo.count)) ? Number(enrollmentInfo.count) : null,
    type: cleanText(enrollmentInfo.type),
    typeLabel: ENROLLMENT_TYPE_LABELS[enrollmentInfo.type] || '人数类型未公开'
  }
  const conditions = asArray(conditionsModule.conditions).map((item) => cleanText(item)).filter(Boolean)
  const interventions = asArray(armsModule.interventions).map((item) => ({
    name: cleanText(item.name, UNKNOWN),
    type: cleanText(item.type),
    typeLabel: INTERVENTION_TYPE_LABELS[item.type] || cleanText(item.type, '干预类型未公开'),
    description: cleanText(item.description, '未提供干预说明'),
    armGroupLabels: asArray(item.armGroupLabels).map((value) => cleanText(value)).filter(Boolean),
    otherNames: asArray(item.otherNames).map((value) => cleanText(value)).filter(Boolean)
  }))
  const armGroups = asArray(armsModule.armGroups).map((item) => ({
    label: cleanText(item.label, UNKNOWN),
    type: cleanText(item.type),
    description: cleanText(item.description, '未提供分组说明'),
    interventionNames: asArray(item.interventionNames).map((value) => cleanText(value)).filter(Boolean)
  }))
  const leadSponsor = sponsorModule.leadSponsor || {}
  const facilities = asArray(contactsModule.locations).map(normalizeFacility)
  const criteria = extractCriteria(eligibilityModule.eligibilityCriteria)
  const studyType = cleanText(designModule.studyType, UNKNOWN)
  const studyTypeLabel = STUDY_TYPE_LABELS[studyType] || studyType
  const officialTitle = cleanText(identification.officialTitle, identification.briefTitle || UNKNOWN)
  const briefTitle = cleanText(identification.briefTitle, officialTitle)
  const registeredSummary = cleanText(descriptionModule.briefSummary)
  const publicSummary = generatedPlainSummary({ studyTypeLabel, phaseText, conditions, enrollment, statusMeta })

  return {
    nctId,
    briefTitle,
    officialTitle,
    acronym: cleanText(identification.acronym),
    organizationStudyId: cleanText(identification.orgStudyIdInfo?.id),
    statusCode,
    statusLabel: statusMeta.label,
    statusClass: statusMeta.className,
    statusPlain: statusMeta.plain,
    statusVerifiedDate: formatDate(statusModule.statusVerifiedDate),
    whyStopped: cleanText(statusModule.whyStopped),
    phases,
    phaseLabel: phaseText,
    studyType,
    studyTypeLabel,
    conditions,
    mainCondition: conditions[0] || UNKNOWN,
    keywords: asArray(conditionsModule.keywords).map((item) => cleanText(item)).filter(Boolean),
    registeredSummary: registeredSummary || '官方登记未提供简要摘要。',
    plainSummary: publicSummary,
    sponsor: {
      name: cleanText(leadSponsor.name, UNKNOWN),
      className: cleanText(leadSponsor.class),
      classLabel: SPONSOR_CLASS_LABELS[leadSponsor.class] || cleanText(leadSponsor.class, UNKNOWN)
    },
    collaborators: asArray(sponsorModule.collaborators).map((item) => ({
      name: cleanText(item.name, UNKNOWN),
      className: cleanText(item.class),
      classLabel: SPONSOR_CLASS_LABELS[item.class] || cleanText(item.class, UNKNOWN)
    })),
    interventions,
    armGroups,
    durationSummary: extractDuration(interventions, armGroups),
    enrollment,
    dates: {
      start: formatDate(statusModule.startDateStruct?.date),
      startType: cleanText(statusModule.startDateStruct?.type),
      primaryCompletion: formatDate(statusModule.primaryCompletionDateStruct?.date),
      primaryCompletionType: cleanText(statusModule.primaryCompletionDateStruct?.type),
      completion: formatDate(statusModule.completionDateStruct?.date),
      completionType: cleanText(statusModule.completionDateStruct?.type),
      firstSubmitted: formatDate(statusModule.studyFirstSubmitDate),
      firstPosted: formatDate(statusModule.studyFirstPostDateStruct?.date),
      lastUpdateSubmitted: formatDate(statusModule.lastUpdateSubmitDate),
      lastUpdatePosted: formatDate(statusModule.lastUpdatePostDateStruct?.date)
    },
    centralContacts: asArray(contactsModule.centralContacts).map(normalizeContact),
    officials: asArray(contactsModule.overallOfficials).map((item) => ({
      name: cleanText(item.name, UNKNOWN),
      role: cleanText(item.role, UNKNOWN),
      affiliation: cleanText(item.affiliation, UNKNOWN)
    })),
    facilities,
    countries: [...new Set(facilities.map((item) => item.country).filter(Boolean))].sort(),
    eligibility: {
      minimumAge: cleanText(eligibilityModule.minimumAge, UNKNOWN),
      maximumAge: cleanText(eligibilityModule.maximumAge, UNKNOWN),
      sex: cleanText(eligibilityModule.sex),
      sexLabel: SEX_LABELS[eligibilityModule.sex] || cleanText(eligibilityModule.sex, UNKNOWN),
      healthyVolunteers: eligibilityModule.healthyVolunteers === true ? '接受健康志愿者' : '不接受或未明确接受健康志愿者',
      inclusion: criteria.inclusion,
      exclusion: criteria.exclusion,
      original: criteria.original
    },
    primaryOutcomes: asArray(outcomesModule.primaryOutcomes).map((item) => ({
      measure: cleanText(item.measure, UNKNOWN),
      description: cleanText(item.description),
      timeFrame: cleanText(item.timeFrame, UNKNOWN)
    })),
    secondaryOutcomes: asArray(outcomesModule.secondaryOutcomes).map((item) => ({
      measure: cleanText(item.measure, UNKNOWN),
      description: cleanText(item.description),
      timeFrame: cleanText(item.timeFrame, UNKNOWN)
    })),
    timeline: buildTimeline(statusModule),
    hasResults: Boolean(study.hasResults),
    sourceRecordUrl: nctId.startsWith('NCT') ? `https://clinicaltrials.gov/study/${encodeURIComponent(nctId)}` : 'https://clinicaltrials.gov/'
  }
}

export function normalizeStudyList(payload = {}) {
  return {
    studies: asArray(payload.studies).map(normalizeStudy),
    totalCount: Number.isFinite(Number(payload.totalCount)) ? Number(payload.totalCount) : asArray(payload.studies).length,
    nextPageToken: cleanText(payload.nextPageToken),
    dataTimestamp: cleanText(payload.dataTimestamp)
  }
}

export function isUpdatedWithinDays(dateValue, days = 30, now = new Date()) {
  if (!dateValue || dateValue === UNKNOWN) return false
  const date = new Date(`${dateValue}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return false
  const diff = now.getTime() - date.getTime()
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000
}

export function matchesClientFilters(study, filters = {}) {
  if (filters.phase && !study.phases.includes(filters.phase)) return false
  if (filters.country && !study.countries.includes(filters.country)) return false
  if (filters.sponsorClass && study.sponsor.className !== filters.sponsorClass) return false
  return true
}

export function sortStudies(studies, sortMode = 'updated-desc') {
  const copy = [...studies]
  const safeDate = (value) => value && value !== UNKNOWN ? value : '0000-00-00'
  if (sortMode === 'posted-desc') return copy.sort((a, b) => safeDate(b.dates.firstPosted).localeCompare(safeDate(a.dates.firstPosted)))
  if (sortMode === 'enrollment-desc') return copy.sort((a, b) => (b.enrollment.count || 0) - (a.enrollment.count || 0))
  if (sortMode === 'title-asc') return copy.sort((a, b) => a.briefTitle.localeCompare(b.briefTitle, 'en'))
  return copy.sort((a, b) => safeDate(b.dates.lastUpdatePosted).localeCompare(safeDate(a.dates.lastUpdatePosted)))
}
