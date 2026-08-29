import { CONFIG } from './config.js'
import {
  CENTER_SCOPE_LABELS,
  DEVELOPMENT_STAGE_LABELS,
  REGISTRATION_PATH_LABELS,
  RESEARCH_TYPE_LABELS,
  RESULT_FILTER_LABELS,
  SPONSOR_CLASS_LABELS,
  getStatusMeta
} from './dictionary.js'
import { getApiVersion, getStudyById, readCachedSearch, searchStudies } from './api.js'
import { SOURCE_DEFINITIONS, filterSnapshotStudies, loadSnapshots, snapshotStatusMap } from './federated.js'
import { computeGraphMetrics, mergeExactCrossRegistrations } from './graph.js'
import {
  clearAllLocalData,
  getFavorites,
  removeFavorite,
  replaceFavoriteSnapshot,
  saveFavorite
} from './storage.js'
import {
  formatNumber,
  isUpdatedWithinDays,
  matchesClientFilters,
  sortStudies
} from './normalizer.js'

const state = {
  query: '',
  sourceKeys: Object.keys(SOURCE_DEFINITIONS),
  registrationPath: '',
  researchType: '',
  statusCode: '',
  developmentStage: '',
  country: '',
  sponsorClass: '',
  updatedWithinDays: '',
  centerScope: '',
  results: '',
  sortMode: 'updated-desc',
  studies: [],
  totalCount: 0,
  nextPageToken: '',
  dataTimestamp: '',
  fetchedAt: null,
  source: '',
  loading: false,
  loadingMore: false,
  favorites: getFavorites(),
  currentDetail: null,
  versionPromise: null,
  snapshotPromise: null,
  snapshotStudies: [],
  snapshotStatuses: {},
  snapshotCount: 0
}

const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function safeUrl(value) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : CONFIG.sourceHome
  } catch {
    return CONFIG.sourceHome
  }
}

function formatDateTime(timestamp) {
  if (!timestamp) return '未记录'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return String(timestamp)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date)
}

function formatRelativeAge(ageMs) {
  if (!Number.isFinite(ageMs) || ageMs < 0) return '时间未知'
  const minutes = Math.floor(ageMs / 60000)
  if (minutes < 1) return '不到1分钟'
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时`
  return `${Math.floor(hours / 24)}天`
}

function showToast(message, duration = 2200) {
  const toast = $('#toast')
  toast.textContent = message
  toast.hidden = false
  clearTimeout(showToast.timer)
  showToast.timer = setTimeout(() => { toast.hidden = true }, duration)
}

function setSyncState(mode, title, detail = '') {
  const indicator = $('#sync-indicator')
  indicator.dataset.state = mode
  $('#sync-status').textContent = title
  $('#sync-detail').textContent = detail || '—'
  $('#refresh-button').classList.toggle('is-spinning', mode === 'loading')
}

function setLoadingSkeleton() {
  $('#trial-list').innerHTML = Array.from({ length: 4 }, () => '<div class="skeleton-card" aria-hidden="true"></div>').join('')
}

function searchParams() {
  return {
    query: state.query,
    statusCode: state.statusCode,
    pageToken: ''
  }
}

function filteredStudies() {
  return sortStudies(
    state.studies.filter((study) => matchesClientFilters(study, {
      sourceKeys: state.sourceKeys,
      registrationPath: state.registrationPath,
      researchType: state.researchType,
      developmentStage: state.developmentStage,
      country: state.country,
      sponsorClass: state.sponsorClass,
      updatedWithinDays: state.updatedWithinDays,
      centerScope: state.centerScope,
      results: state.results
    })),
    state.sortMode
  )
}

function updateCountryOptions() {
  const select = $('#country-filter')
  const countries = [...new Set(state.studies.flatMap((study) => study.countries))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'zh-CN'))
  const current = state.country
  select.innerHTML = '<option value="">全部国家/地区</option>' + countries.map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`).join('')
  if (countries.includes(current)) select.value = current
  else if (current) {
    state.country = ''
    select.value = ''
  }
}

function renderStats() {
  const visible = filteredStudies()
  const metrics = computeGraphMetrics(visible)
  const recruiting = visible.filter((study) => study.statusCode === 'RECRUITING').length
  $('#stat-total').textContent = state.sourceKeys.includes('clinicaltrials') && Number.isFinite(state.totalCount) ? formatNumber(state.totalCount) : '—'
  $('#stat-recruiting').textContent = formatNumber(recruiting)
  $('#stat-countries').textContent = formatNumber(metrics.sourceCount)
  $('#stat-recent').textContent = formatNumber(metrics.crossRegistered)
  const institution = $('#stat-institutions')
  const sponsor = $('#stat-sponsors')
  if (institution) institution.textContent = formatNumber(metrics.institutions)
  if (sponsor) sponsor.textContent = formatNumber(metrics.sponsors)
}

function activeFilterEntries() {
  const entries = []
  const allSources = Object.keys(SOURCE_DEFINITIONS)
  if (state.query) entries.push({ key: 'query', label: `关键词：${state.query}` })
  if (state.sourceKeys.length !== allSources.length) {
    entries.push({ key: 'sourceKeys', label: `来源：${state.sourceKeys.map((key) => SOURCE_DEFINITIONS[key]?.short || key).join(' + ')}` })
  }
  if (state.registrationPath) entries.push({ key: 'registrationPath', label: `路径：${REGISTRATION_PATH_LABELS[state.registrationPath] || state.registrationPath}` })
  if (state.researchType) entries.push({ key: 'researchType', label: `研究类型：${RESEARCH_TYPE_LABELS[state.researchType] || state.researchType}` })
  if (state.statusCode) entries.push({ key: 'statusCode', label: `状态：${getStatusMeta(state.statusCode).label}` })
  if (state.developmentStage) entries.push({ key: 'developmentStage', label: `阶段：${DEVELOPMENT_STAGE_LABELS[state.developmentStage] || state.developmentStage}` })
  if (state.country) entries.push({ key: 'country', label: `地区：${state.country}` })
  if (state.sponsorClass) entries.push({ key: 'sponsorClass', label: `主办单位：${SPONSOR_CLASS_LABELS[state.sponsorClass] || state.sponsorClass}` })
  if (state.updatedWithinDays) entries.push({ key: 'updatedWithinDays', label: `更新：近${state.updatedWithinDays}天` })
  if (state.centerScope) entries.push({ key: 'centerScope', label: `中心：${CENTER_SCOPE_LABELS[state.centerScope] || state.centerScope}` })
  if (state.results) entries.push({ key: 'results', label: `结果：${RESULT_FILTER_LABELS[state.results] || state.results}` })
  return entries
}

function renderFilterChips() {
  const container = $('#active-filter-chips')
  const entries = activeFilterEntries()
  container.innerHTML = entries.map((entry) => `
    <span class="filter-chip">${escapeHtml(entry.label)}<button type="button" data-remove-filter="${escapeHtml(entry.key)}" aria-label="移除此筛选">×</button></span>
  `).join('')
}

function renderCard(study, { favoriteContext = false } = {}) {
  const isFavorite = Boolean(state.favorites[study.nctId])
  const primaryFacility = study.facilities[0]
  const countries = study.countries.length ? study.countries.join('、') : '未公开'
  const intervention = study.interventions[0]
  const duration = study.durationSummary || intervention?.description || '未公开'
  const favoriteChange = favoriteContext ? state.favorites[study.nctId]?.lastChange : null
  return `
    <article class="trial-card ${escapeHtml(study.statusClass)}" data-study-id="${escapeHtml(study.nctId)}">
      <div class="trial-card-inner">
        <div class="card-topline">
          <div class="card-badges">
            <span class="badge status">${escapeHtml(study.statusLabel)}</span>
            <span class="badge">${escapeHtml(study.developmentStageLabel || study.phaseLabel)}</span>
            <span class="badge path">${escapeHtml(study.registrationPathLabel || '注册路径暂无法判定')}</span>
            <span class="badge">${escapeHtml(study.researchTypeLabel || study.studyTypeLabel)}</span>
            ${(study.sourceRecords || [{ sourceKey: study.sourceKey, sourceName: study.sourceName }]).map((item) => `<span class="badge source">${escapeHtml(SOURCE_DEFINITIONS[item.sourceKey]?.short || item.sourceName || '来源')}</span>`).join('')}
            ${(study.sourceRecords?.length || 0) > 1 ? `<span class="badge source">跨 ${study.sourceRecords.length} 个来源</span>` : ''}${study.hasResults ? '<span class="badge source">已有结果登记</span>' : ''}
          </div>
          <button class="favorite-button ${isFavorite ? 'active' : ''}" type="button" data-favorite-id="${escapeHtml(study.nctId)}" aria-label="${isFavorite ? '取消关注' : '加入关注'}" title="${isFavorite ? '取消关注' : '加入关注'}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>
          </button>
        </div>
        <h3 class="trial-title"><button type="button" data-open-detail="${escapeHtml(study.nctId)}">${escapeHtml(study.briefTitle)}</button></h3>
        <div class="trial-id">${escapeHtml(study.nctId)} · 申办/发起方：${escapeHtml(study.sponsor.name)} · ${escapeHtml(study.centerScopeLabel || '中心范围未公开')}</div>
        <p class="plain-summary">${escapeHtml(study.plainSummary)}</p>
        ${favoriteChange ? `<div class="results-alert" style="margin:12px 0 0" role="status">状态变化：${escapeHtml(favoriteChange.from)} → ${escapeHtml(favoriteChange.to)}</div>` : ''}
        <div class="trial-facts">
          <div class="fact"><span class="fact-label">主要疾病</span><span class="fact-value" title="${escapeHtml(study.conditions.join('、'))}">${escapeHtml(study.conditions.slice(0, 3).join('、') || '未公开')}</span></div>
          <div class="fact"><span class="fact-label">研究发起 / 注册路径</span><span class="fact-value" title="${escapeHtml(study.registrationPathNote || '')}">${escapeHtml(study.registrationPathLabel || '暂无法判定')}</span></div>
          <div class="fact"><span class="fact-label">主要执行单位</span><span class="fact-value" title="${escapeHtml(primaryFacility?.name || '未公开')}">${escapeHtml(primaryFacility?.name || '未公开')}</span></div>
          <div class="fact"><span class="fact-label">干预/疗程公开描述</span><span class="fact-value" title="${escapeHtml(duration)}">${escapeHtml(duration)}</span></div>
          <div class="fact"><span class="fact-label">计划或实际人数</span><span class="fact-value">${study.enrollment.count ? `${escapeHtml(study.enrollment.typeLabel)} ${formatNumber(study.enrollment.count)} 人` : '未公开'}</span></div>
          <div class="fact"><span class="fact-label">执行国家/地区</span><span class="fact-value" title="${escapeHtml(countries)}">${escapeHtml(countries)}</span></div>
          <div class="fact"><span class="fact-label">联系人</span><span class="fact-value">${escapeHtml(study.centralContacts[0]?.name || primaryFacility?.contacts[0]?.name || '未公开')}</span></div>
        </div>
        <div class="card-footer">
          <span class="card-update">最近公开更新：${escapeHtml(study.dates.lastUpdatePosted)}</span>
          <div class="card-actions">
            <button class="card-detail-button" type="button" data-open-detail="${escapeHtml(study.nctId)}">查看结构化详情</button>
            <a class="card-link" href="${escapeHtml(safeUrl(study.sourceRecordUrl))}" target="_blank" rel="noopener noreferrer">${escapeHtml(study.sourceShort || '来源')} 原始记录 <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5m0-5-9 9M19 13v6H5V5h6"/></svg></a>
          </div>
        </div>
      </div>
    </article>
  `
}

function emptyState(title, message, action = '') {
  return `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 9h8M8 13h5"/></svg>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      ${action}
    </div>
  `
}

function renderResults() {
  const visible = filteredStudies()
  const list = $('#trial-list')
  const loadedText = `已加载 ${formatNumber(state.studies.length)} 条，当前筛选显示 ${formatNumber(visible.length)} 条`
  const totalText = state.sourceKeys.includes('clinicaltrials') && state.totalCount ? `；ClinicalTrials.gov 官方匹配总数 ${formatNumber(state.totalCount)} 条` : ''
  $('#results-summary').textContent = `${loadedText}${totalText}${state.snapshotCount ? `；中国/跨注册快照命中 ${formatNumber(state.snapshotCount)} 条` : ''}`

  if (!visible.length) {
    list.innerHTML = emptyState(
      '当前筛选下没有可显示记录',
      state.studies.length ? '可以重置数据来源、研究路径、研究类型、试验阶段或地区条件后再查看。' : '请调整检索词，或稍后重新连接官方数据源。',
      '<button class="secondary-button" type="button" data-reset-all>重置检索条件</button>'
    )
  } else {
    list.innerHTML = visible.map((study) => renderCard(study)).join('')
  }

  $('#load-more-button').hidden = !state.nextPageToken || state.loadingMore || !state.sourceKeys.includes('clinicaltrials')
  $('#load-more-button').textContent = state.loadingMore ? '正在加载……' : '加载更多公示记录'
  renderFilterChips()
  renderStats()
  updateFavoriteBadge()
}

function applyPayload(payload, { append = false, preview = false } = {}) {
  state.studies = append
    ? [...state.studies, ...payload.studies.filter((incoming) => !state.studies.some((existing) => existing.nctId === incoming.nctId))]
    : payload.studies
  state.totalCount = payload.totalCount
  state.nextPageToken = payload.nextPageToken || ''
  state.fetchedAt = payload.fetchedAt || Date.now()
  state.source = payload.source
  state.snapshotCount = payload.snapshotCount || 0
  if (payload.dataTimestamp) state.dataTimestamp = payload.dataTimestamp
  updateCountryOptions()
  renderResults()

  if (payload.source === 'network') {
    setSyncState('success', preview ? '已使用最新公开数据' : '已同步最新公开数据', `本次获取 ${payload.studies.length} 条`)
    $('#cache-status').textContent = '已更新'
  } else {
    setSyncState('cache', '正在显示本地缓存', `缓存约 ${formatRelativeAge(payload.cacheAgeMs)}前保存`)
    $('#cache-status').textContent = `${formatRelativeAge(payload.cacheAgeMs)}前`
  }
  $('#source-timestamp').textContent = state.dataTimestamp || '由官方接口返回'
}

function withFederatedSnapshots(payload, snapshotStudies) {
  const matchedSnapshots = filterSnapshotStudies(snapshotStudies, state.query, state.statusCode)
  const merged = mergeExactCrossRegistrations([...(payload.studies || []), ...matchedSnapshots])
  return { ...payload, studies: merged, snapshotCount: matchedSnapshots.length }
}

async function ensureSnapshots() {
  const results = await (state.snapshotPromise || loadSnapshots())
  state.snapshotPromise = Promise.resolve(results)
  state.snapshotStatuses = snapshotStatusMap(results)
  state.snapshotStudies = results.flatMap((result) => result.records || [])
  renderSourceCenter()
  return state.snapshotStudies
}

async function runSearch({ useCachePreview = true, scroll = false } = {}) {
  if (state.loading) return
  state.loading = true
  const params = searchParams()
  const snapshotStudies = await ensureSnapshots()
  const cachedBase = useCachePreview ? readCachedSearch(params) : null
  const cached = cachedBase ? withFederatedSnapshots(cachedBase, snapshotStudies) : null
  $('#results-alert').hidden = true

  if (cached) {
    applyPayload(cached, { preview: true })
    setSyncState('loading', '已显示缓存，正在同步最新数据', `缓存约 ${formatRelativeAge(cached.cacheAgeMs)}前保存`)
  } else {
    setLoadingSkeleton()
    setSyncState('loading', '正在连接 ClinicalTrials.gov', '访问时查询最新公开记录')
  }

  try {
    const [payload, version] = await Promise.all([
      searchStudies(params),
      state.versionPromise || getApiVersion()
    ])
    state.versionPromise = Promise.resolve(version)
    if (version.dataTimestamp) payload.dataTimestamp = version.dataTimestamp
    applyPayload(withFederatedSnapshots(payload, snapshotStudies))
    if (payload.effectiveQuery && payload.effectiveQuery !== payload.requestedQuery) {
      const alert = $('#results-alert')
      alert.textContent = `已将常见中文疾病词“${payload.requestedQuery}”转换为英文检索词“${payload.effectiveQuery}”。结果仍需以官方英文记录为准。`
      alert.hidden = false
    }
    if (payload.warning) {
      const alert = $('#results-alert')
      alert.textContent = `官方接口暂时不可用，当前显示最近一次成功缓存。原因：${payload.warning}`
      alert.hidden = false
    }
  } catch (error) {
    const snapshotFallback = filterSnapshotStudies(snapshotStudies, state.query, state.statusCode)
    state.studies = mergeExactCrossRegistrations(snapshotFallback)
    state.totalCount = 0
    state.snapshotCount = snapshotFallback.length
    state.nextPageToken = ''
    renderResults()
    setSyncState(snapshotFallback.length ? 'cache' : 'error', snapshotFallback.length ? 'CTG 暂不可用，正在显示其他来源快照' : '未能连接实时数据源', error.message || '网络请求失败')
    $('#cache-status').textContent = snapshotFallback.length ? '已使用多源快照' : '无可用缓存'
    const alert = $('#results-alert')
    alert.innerHTML = `无法读取 ClinicalTrials.gov API。${snapshotFallback.length ? `当前仍显示 ${snapshotFallback.length} 条其他来源快照。` : ''} 可稍后刷新，或直接访问 <a href="${CONFIG.sourceHome}" target="_blank" rel="noopener noreferrer">ClinicalTrials.gov 官方网站</a>。`
    alert.hidden = false
  } finally {
    state.loading = false
    if (scroll) $('#results-title').scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

async function loadMore() {
  if (!state.nextPageToken || state.loadingMore) return
  state.loadingMore = true
  $('#load-more-button').hidden = false
  $('#load-more-button').textContent = '正在加载……'
  try {
    const payload = await searchStudies({
      query: state.query,
      statusCode: state.statusCode,
      pageToken: state.nextPageToken
    })
    applyPayload({ ...payload, snapshotCount: state.snapshotCount }, { append: true })
  } catch (error) {
    showToast(error.message || '加载更多失败')
  } finally {
    state.loadingMore = false
    renderResults()
  }
}

function toggleFavorite(nctId) {
  const study = state.studies.find((item) => item.nctId === nctId)
    || state.currentDetail?.nctId === nctId && state.currentDetail
    || state.favorites[nctId]?.snapshot
  if (!study) return
  if (state.favorites[nctId]) {
    state.favorites = removeFavorite(nctId)
    showToast('已取消关注')
  } else {
    state.favorites = saveFavorite(study)
    showToast('已加入关注，仅保存在当前浏览器')
  }
  renderResults()
  if (!$('#following-view').hidden) renderFavorites()
  if (state.currentDetail) renderDetail(state.currentDetail)
  updateFavoriteBadge()
}

function updateFavoriteBadge() {
  const count = Object.keys(state.favorites).length
  const badge = $('#favorite-count-badge')
  badge.textContent = String(count)
  badge.hidden = count === 0
}

function contactHtml(contact) {
  if (!contact) return '<p>公开登记未提供联系人。</p>'
  return `
    <div class="detail-grid">
      <dl class="detail-item"><dt>联系人</dt><dd>${escapeHtml(contact.name)}</dd></dl>
      <dl class="detail-item"><dt>角色</dt><dd>${escapeHtml(contact.role || '未公开')}</dd></dl>
      <dl class="detail-item"><dt>电话</dt><dd>${escapeHtml(contact.phone)}${contact.phoneExt ? ` 转 ${escapeHtml(contact.phoneExt)}` : ''}</dd></dl>
      <dl class="detail-item"><dt>邮箱</dt><dd>${escapeHtml(contact.email)}</dd></dl>
    </div>
  `
}

function renderDetail(study) {
  state.currentDetail = study
  $('#detail-nct').textContent = study.nctId
  $('#detail-title').textContent = study.briefTitle
  const isFavorite = Boolean(state.favorites[study.nctId])
  const collaborators = study.collaborators.length
    ? study.collaborators.map((item) => `${escapeHtml(item.name)}（${escapeHtml(item.classLabel)}）`).join('；')
    : '未公开'
  const interventions = study.interventions.length
    ? study.interventions.map((item) => `
      <li class="intervention-item">
        <strong>${escapeHtml(item.name)} · ${escapeHtml(item.typeLabel)}</strong>
        <p>${escapeHtml(item.description)}</p>
        ${item.otherNames.length ? `<p>其他名称：${escapeHtml(item.otherNames.join('、'))}</p>` : ''}
      </li>
    `).join('')
    : '<li class="intervention-item"><p>公开登记未提供干预措施。</p></li>'
  const facilities = study.facilities.length
    ? study.facilities.slice(0, 30).map((facility) => {
        const contact = facility.contacts[0]
        return `
          <li class="facility-item">
            <strong>${escapeHtml(facility.name)}</strong>
            <p>${escapeHtml(facility.address)}</p>
            <div class="facility-meta">
              <span>中心状态：${escapeHtml(getStatusMeta(facility.statusCode).label)}</span>
              ${contact ? `<span>联系人：${escapeHtml(contact.name)}</span><span>电话：${escapeHtml(contact.phone)}</span><span>邮箱：${escapeHtml(contact.email)}</span>` : '<span>该中心未公开联系人</span>'}
            </div>
          </li>
        `
      }).join('')
    : '<li class="facility-item"><p>公开登记未提供执行中心。</p></li>'
  const primaryOutcomes = study.primaryOutcomes.length
    ? study.primaryOutcomes.map((item) => `<li class="outcome-item"><strong>${escapeHtml(item.measure)}</strong><p>时间范围：${escapeHtml(item.timeFrame)}</p>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}</li>`).join('')
    : '<li class="outcome-item"><p>未公开主要结局指标。</p></li>'
  const secondaryOutcomes = study.secondaryOutcomes.length
    ? study.secondaryOutcomes.slice(0, 10).map((item) => `<li class="outcome-item"><strong>${escapeHtml(item.measure)}</strong><p>时间范围：${escapeHtml(item.timeFrame)}</p></li>`).join('')
    : '<li class="outcome-item"><p>未公开次要结局指标。</p></li>'
  const timeline = study.timeline.length
    ? study.timeline.map((item) => `<li class="outcome-item"><strong>${escapeHtml(item.date)} · ${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p></li>`).join('')
    : '<li class="outcome-item"><p>未提取到时间节点。</p></li>'
  const inclusion = study.eligibility.inclusion.length
    ? study.eligibility.inclusion.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>未能从原文中自动分离，请展开查看完整专业原文。</li>'
  const exclusion = study.eligibility.exclusion.length
    ? study.eligibility.exclusion.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
    : '<li>未能从原文中自动分离，请展开查看完整专业原文。</li>'

  $('#detail-content').innerHTML = `
    <section class="detail-hero ${escapeHtml(study.statusClass)}">
      <div class="detail-badges">
        <span class="badge status">${escapeHtml(study.statusLabel)}</span>
        <span class="badge">${escapeHtml(study.developmentStageLabel || study.phaseLabel)}</span>
        <span class="badge path">${escapeHtml(study.registrationPathLabel || '注册路径暂无法判定')}</span>
        <span class="badge">${escapeHtml(study.researchTypeLabel || study.studyTypeLabel)}</span>
        <span class="badge">${study.hasResults ? '已有结果登记' : '暂未显示结果登记'}</span>
      </div>
      <h3>${escapeHtml(study.officialTitle)}</h3>
      <p>${escapeHtml(study.plainSummary)}</p>
      <div class="detail-source-row">
        <span>最近公开更新：${escapeHtml(study.dates.lastUpdatePosted)}</span>
        <span>状态核验月份：${escapeHtml(study.statusVerifiedDate)}</span>
      </div>
    </section>

    <section class="detail-section">
      <h3><span>01</span>研究定位与基本概况</h3>
      <div class="detail-grid">
        <dl class="detail-item"><dt>研究疾病</dt><dd>${escapeHtml(study.conditions.join('、') || '未公开')}</dd></dl>
        <dl class="detail-item"><dt>官方状态</dt><dd>${escapeHtml(study.statusLabel)}：${escapeHtml(study.statusPlain)}</dd></dl>
        <dl class="detail-item"><dt>研究发起 / 注册路径</dt><dd>${escapeHtml(study.registrationPathLabel || '暂无法判定')}</dd></dl>
        <dl class="detail-item"><dt>研究类型</dt><dd>${escapeHtml(study.researchTypeLabel || study.studyTypeLabel)}</dd></dl>
        <dl class="detail-item"><dt>药物开发 / 试验阶段</dt><dd>${escapeHtml(study.developmentStageLabel || study.phaseLabel)}</dd></dl>
        <dl class="detail-item"><dt>执行中心范围</dt><dd>${escapeHtml(study.centerScopeLabel || '未公开')}</dd></dl>
        <dl class="detail-item"><dt>计划或实际人数</dt><dd>${study.enrollment.count ? `${escapeHtml(study.enrollment.typeLabel)} ${formatNumber(study.enrollment.count)} 人` : '未公开'}</dd></dl>
        <dl class="detail-item"><dt>公开疗程摘要</dt><dd>${escapeHtml(study.durationSummary)}</dd></dl>
      </div>
      <p class="classification-note"><strong>分类说明：</strong>${escapeHtml(study.registrationPathNote || '平台仅在来源证据足够时给出注册性/IIT分类；不因来源于 ClinicalTrials.gov 就自动判定。')}</p>
      <details class="disclosure">
        <summary>展开官方简要摘要原文</summary>
        <div class="original-text">${escapeHtml(study.registeredSummary)}</div>
      </details>
    </section>

    <section class="detail-section">
      <h3><span>02</span>申办方、合作方与研究负责人</h3>
      <div class="detail-grid">
        <dl class="detail-item"><dt>主要申办方</dt><dd>${escapeHtml(study.sponsor.name)}</dd></dl>
        <dl class="detail-item"><dt>申办方类型</dt><dd>${escapeHtml(study.sponsor.classLabel)}</dd></dl>
        <dl class="detail-item"><dt>合作方</dt><dd>${collaborators}</dd></dl>
        <dl class="detail-item"><dt>研究负责人</dt><dd>${escapeHtml(study.officials.map((item) => `${item.name}（${item.affiliation}）`).join('；') || '未公开')}</dd></dl>
      </div>
    </section>

    <section class="detail-section">
      <h3><span>03</span>干预措施与治疗方案原文</h3>
      <ul class="intervention-list">${interventions}</ul>
      <p class="plain-summary">${escapeHtml(study.sourceName || '公开登记平台')} 的公开记录未必提供统一、标准化的“疾病疗程”字段。页面只整理公开描述，不能替代正式研究方案。</p>
    </section>

    <section class="detail-section">
      <h3><span>04</span>当前全球进度</h3>
      <div class="detail-grid">
        <dl class="detail-item"><dt>研究开始</dt><dd>${escapeHtml(study.dates.start)}${study.dates.startType ? `（${escapeHtml(study.dates.startType)}）` : ''}</dd></dl>
        <dl class="detail-item"><dt>主要终点完成</dt><dd>${escapeHtml(study.dates.primaryCompletion)}${study.dates.primaryCompletionType ? `（${escapeHtml(study.dates.primaryCompletionType)}）` : ''}</dd></dl>
        <dl class="detail-item"><dt>研究完成</dt><dd>${escapeHtml(study.dates.completion)}${study.dates.completionType ? `（${escapeHtml(study.dates.completionType)}）` : ''}</dd></dl>
        <dl class="detail-item"><dt>首次公示</dt><dd>${escapeHtml(study.dates.firstPosted)}</dd></dl>
        <dl class="detail-item"><dt>最近更新提交</dt><dd>${escapeHtml(study.dates.lastUpdateSubmitted)}</dd></dl>
        <dl class="detail-item"><dt>最近公开更新</dt><dd>${escapeHtml(study.dates.lastUpdatePosted)}</dd></dl>
      </div>
      ${study.whyStopped ? `<p class="results-alert" style="margin:14px 0 0">停止原因原文：${escapeHtml(study.whyStopped)}</p>` : ''}
      <ul class="outcome-list" style="margin-top:14px">${timeline}</ul>
    </section>

    <section class="detail-section">
      <h3><span>05</span>执行中心与公开联系方式</h3>
      ${contactHtml(study.centralContacts[0])}
      <ul class="facility-list" style="margin-top:14px">${facilities}</ul>
      ${study.facilities.length > 30 ? `<p class="plain-summary">当前页面仅展示前30个执行中心。完整列表请查看官方原文。</p>` : ''}
    </section>

    <section class="detail-section">
      <h3><span>06</span>专业入选与排除标准</h3>
      <div class="eligibility-intro">
        <div><span>年龄</span><strong>${escapeHtml(study.eligibility.minimumAge)} 至 ${escapeHtml(study.eligibility.maximumAge)}</strong></div>
        <div><span>性别</span><strong>${escapeHtml(study.eligibility.sexLabel)}</strong></div>
        <div><span>健康志愿者</span><strong>${escapeHtml(study.eligibility.healthyVolunteers)}</strong></div>
      </div>
      <div class="eligibility-block"><h4>入选标准</h4><ul class="eligibility-list">${inclusion}</ul></div>
      <div class="eligibility-block"><h4>排除标准</h4><ul class="eligibility-list">${exclusion}</ul></div>
      <details class="disclosure">
        <summary>展开完整专业原文</summary>
        <div class="original-text">${escapeHtml(study.eligibility.original || '未公开')}</div>
      </details>
    </section>

    <section class="detail-section">
      <h3><span>07</span>研究结局指标与结果状态</h3>
      <h4>主要结局指标</h4>
      <ul class="outcome-list">${primaryOutcomes}</ul>
      <h4 style="margin-top:16px">次要结局指标</h4>
      <ul class="outcome-list">${secondaryOutcomes}</ul>
      <p class="plain-summary">结果登记状态：${study.hasResults ? '官方记录显示已有结果模块。' : '当前记录未显示结果模块。研究完成不等于结果已经发布。'}</p>
    </section>


    <section class="detail-section source-evidence-section">
      <h3><span>08</span>来源证据链与交叉注册编号</h3>
      <div class="identifier-grid">
        ${Object.entries(study.identifiers || {}).map(([key, value]) => `<div><span>${escapeHtml(SOURCE_DEFINITIONS[key]?.short || key)}</span><strong>${escapeHtml(value)}</strong></div>`).join('') || '<p>当前仅保留来源主编号。</p>'}
      </div>
      <div class="source-evidence-list">
        ${(study.sourceRecords || []).map((source) => `<a href="${escapeHtml(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(source.sourceName)}</strong><span>${escapeHtml(source.id)} · 更新 ${escapeHtml(source.updatedAt || '未记录')}</span></a>`).join('')}
      </div>
      <p class="plain-summary">系统只在存在完全一致的交叉注册编号时自动合并记录；不会仅凭标题相似度强行判定为同一研究。</p>
    </section>

    <div class="detail-actions">
      <button class="${isFavorite ? 'secondary-button' : 'primary-button'}" type="button" data-favorite-id="${escapeHtml(study.nctId)}">${isFavorite ? '取消关注' : '关注此研究'}</button>
      <a class="secondary-button" href="${escapeHtml(safeUrl(study.sourceRecordUrl))}" target="_blank" rel="noopener noreferrer">打开 ${escapeHtml(study.sourceName || '来源')} 原始记录</a>
    </div>
  `
}

async function openDetail(nctId, { updateHash = true } = {}) {
  const modal = $('#detail-modal')
  const snapshot = state.studies.find((study) => study.nctId === nctId) || state.favorites[nctId]?.snapshot
  modal.classList.add('open')
  modal.setAttribute('aria-hidden', 'false')
  document.body.classList.add('modal-open')
  if (updateHash && location.hash !== `#/study/${encodeURIComponent(nctId)}`) history.pushState(null, '', `#/study/${encodeURIComponent(nctId)}`)

  if (snapshot) renderDetail(snapshot)
  else {
    $('#detail-nct').textContent = nctId
    $('#detail-title').textContent = '正在读取临床研究详情'
    $('#detail-content').innerHTML = '<div class="detail-loading">正在读取公开登记详情……</div>'
  }

  if (snapshot && snapshot.sourceKey !== 'clinicaltrials') return
  try {
    const detail = await getStudyById(nctId)
    renderDetail(detail)
    if (state.favorites[nctId]) state.favorites = replaceFavoriteSnapshot(detail)
  } catch (error) {
    if (!snapshot) $('#detail-content').innerHTML = emptyState('详情加载失败', error.message || '无法读取官方详情。')
    else showToast('完整详情暂未刷新，当前显示列表快照')
  }
}

function closeDetail({ updateHash = true } = {}) {
  const modal = $('#detail-modal')
  modal.classList.remove('open')
  modal.setAttribute('aria-hidden', 'true')
  document.body.classList.remove('modal-open')
  state.currentDetail = null
  if (updateHash && location.hash.startsWith('#/study/')) history.pushState(null, '', '#/trials')
}

function renderFavorites() {
  state.favorites = getFavorites()
  const entries = Object.values(state.favorites)
  const studies = entries.map((entry) => entry.snapshot).filter(Boolean)
  const changed = entries.filter((entry) => entry.lastChange).length
  const recruiting = studies.filter((study) => study.statusCode === 'RECRUITING').length
  $('#favorites-summary').innerHTML = `
    <article><strong>${formatNumber(studies.length)}</strong><span>当前浏览器收藏</span></article>
    <article><strong>${formatNumber(recruiting)}</strong><span>当前状态为招募中</span></article>
    <article><strong>${formatNumber(changed)}</strong><span>曾检测到状态变化</span></article>
  `
  $('#favorites-list').innerHTML = studies.length
    ? sortStudies(studies, 'updated-desc').map((study) => renderCard(study, { favoriteContext: true })).join('')
    : emptyState('还没有关注任何试验', '在公示列表或详情页点击星标，即可把试验保存在当前浏览器中。', '<a class="secondary-button" href="#/trials" style="margin-top:16px;text-decoration:none">返回公示列表</a>')
  updateFavoriteBadge()
}

async function refreshFavorites() {
  const ids = Object.keys(getFavorites())
  if (!ids.length) return showToast('还没有可刷新的关注记录')
  $('#refresh-favorites-button').disabled = true
  $('#refresh-favorites-button').textContent = '正在刷新……'
  const favorites = getFavorites()
  const liveIds = ids.filter((id) => favorites[id]?.snapshot?.sourceKey === 'clinicaltrials' || /^NCT\d{8}$/i.test(id))
  const results = await Promise.allSettled(liveIds.map((id) => getStudyById(id)))
  let success = 0
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      state.favorites = replaceFavoriteSnapshot(result.value)
      success += 1
    }
  })
  renderFavorites()
  $('#refresh-favorites-button').disabled = false
  $('#refresh-favorites-button').textContent = '刷新关注状态'
  showToast(`已实时刷新 ${success}/${liveIds.length} 条 ClinicalTrials.gov 记录；其他来源按快照更新`)
}

function syncDesktopSourceCheckboxes() {
  $$('#source-filter-options input[type="checkbox"]').forEach((input) => {
    input.checked = state.sourceKeys.includes(input.value)
  })
}

function resetFilters({ includeQuery = true, rerun = true } = {}) {
  if (includeQuery) {
    state.query = ''
    $('#search-input').value = ''
  }
  state.sourceKeys = Object.keys(SOURCE_DEFINITIONS)
  state.registrationPath = ''
  state.researchType = ''
  state.statusCode = ''
  state.developmentStage = ''
  state.country = ''
  state.sponsorClass = ''
  state.updatedWithinDays = ''
  state.centerScope = ''
  state.results = ''
  state.sortMode = 'updated-desc'
  syncDesktopSourceCheckboxes()
  $('#registration-path-filter').value = ''
  $('#research-type-filter').value = ''
  $('#status-filter').value = ''
  $('#phase-filter').value = ''
  $('#country-filter').value = ''
  $('#sponsor-filter').value = ''
  $('#updated-filter').value = ''
  $('#center-scope-filter').value = ''
  $('#results-filter').value = ''
  $('#sort-filter').value = 'updated-desc'
  if (rerun) runSearch({ useCachePreview: true, scroll: true })
}

function removeFilter(key) {
  if (key === 'query') {
    state.query = ''
    $('#search-input').value = ''
    return runSearch({ scroll: true })
  }
  if (key === 'statusCode') {
    state.statusCode = ''
    $('#status-filter').value = ''
    return runSearch({ scroll: true })
  }
  if (key === 'sourceKeys') { state.sourceKeys = Object.keys(SOURCE_DEFINITIONS); syncDesktopSourceCheckboxes() }
  if (key === 'registrationPath') { state.registrationPath = ''; $('#registration-path-filter').value = '' }
  if (key === 'researchType') { state.researchType = ''; $('#research-type-filter').value = '' }
  if (key === 'developmentStage') { state.developmentStage = ''; $('#phase-filter').value = '' }
  if (key === 'country') { state.country = ''; $('#country-filter').value = '' }
  if (key === 'sponsorClass') { state.sponsorClass = ''; $('#sponsor-filter').value = '' }
  if (key === 'updatedWithinDays') { state.updatedWithinDays = ''; $('#updated-filter').value = '' }
  if (key === 'centerScope') { state.centerScope = ''; $('#center-scope-filter').value = '' }
  if (key === 'results') { state.results = ''; $('#results-filter').value = '' }
  renderResults()
}

function buildSourceCheckboxMarkup(prefix = 'm-') {
  return Object.values(SOURCE_DEFINITIONS).map((source) => {
    const checked = state.sourceKeys.includes(source.key) ? 'checked' : ''
    return `<label><input id="${prefix}source-${escapeHtml(source.key)}" type="checkbox" value="${escapeHtml(source.key)}" ${checked}><span>${escapeHtml(source.short)}</span></label>`
  }).join('')
}

function buildMobileFilters() {
  $('#mobile-filter-content').innerHTML = `
    <fieldset class="filter-group source-filter-group"><legend>数据来源 <span class="filter-inline-hint">可多选</span></legend><div id="m-source-filter-options" class="source-filter-options">${buildSourceCheckboxMarkup()}</div></fieldset>
    <div class="filter-group"><label for="m-registration-path-filter">研究发起 / 注册路径</label>${$('#registration-path-filter').outerHTML.replace('id="registration-path-filter"', 'id="m-registration-path-filter"')}</div>
    <div class="filter-group"><label for="m-research-type-filter">研究类型</label>${$('#research-type-filter').outerHTML.replace('id="research-type-filter"', 'id="m-research-type-filter"')}</div>
    <div class="filter-group"><label for="m-status-filter">公开状态</label>${$('#status-filter').outerHTML.replace('id="status-filter"', 'id="m-status-filter"')}</div>
    <div class="filter-group"><label for="m-phase-filter">药物开发 / 试验阶段</label>${$('#phase-filter').outerHTML.replace('id="phase-filter"', 'id="m-phase-filter"')}</div>
    <div class="filter-group"><label for="m-country-filter">执行国家/地区</label>${$('#country-filter').outerHTML.replace('id="country-filter"', 'id="m-country-filter"')}</div>
    <div class="filter-group"><label for="m-sponsor-filter">申办方 / 主办单位类型</label>${$('#sponsor-filter').outerHTML.replace('id="sponsor-filter"', 'id="m-sponsor-filter"')}</div>
    <div class="filter-group"><label for="m-updated-filter">最近公开更新时间</label>${$('#updated-filter').outerHTML.replace('id="updated-filter"', 'id="m-updated-filter"')}</div>
    <div class="filter-group"><label for="m-center-scope-filter">执行中心范围</label>${$('#center-scope-filter').outerHTML.replace('id="center-scope-filter"', 'id="m-center-scope-filter"')}</div>
    <div class="filter-group"><label for="m-results-filter">结果登记</label>${$('#results-filter').outerHTML.replace('id="results-filter"', 'id="m-results-filter"')}</div>
    <div class="filter-group"><label for="m-sort-filter">当前页排序</label>${$('#sort-filter').outerHTML.replace('id="sort-filter"', 'id="m-sort-filter"')}</div>
  `
  $('#m-registration-path-filter').value = state.registrationPath
  $('#m-research-type-filter').value = state.researchType
  $('#m-status-filter').value = state.statusCode
  $('#m-phase-filter').value = state.developmentStage
  $('#m-country-filter').value = state.country
  $('#m-sponsor-filter').value = state.sponsorClass
  $('#m-updated-filter').value = state.updatedWithinDays
  $('#m-center-scope-filter').value = state.centerScope
  $('#m-results-filter').value = state.results
  $('#m-sort-filter').value = state.sortMode
}

function openFilterDrawer() {
  buildMobileFilters()
  const drawer = $('#mobile-filter-drawer')
  drawer.classList.add('open')
  drawer.setAttribute('aria-hidden', 'false')
  document.body.classList.add('modal-open')
}

function closeFilterDrawer() {
  const drawer = $('#mobile-filter-drawer')
  drawer.classList.remove('open')
  drawer.setAttribute('aria-hidden', 'true')
  document.body.classList.remove('modal-open')
}

function applyMobileFilters() {
  const selectedSources = $$('#m-source-filter-options input[type="checkbox"]:checked').map((input) => input.value)
  if (!selectedSources.length) { showToast('请至少保留一个数据来源'); return }
  const previousStatus = state.statusCode
  state.sourceKeys = selectedSources
  state.registrationPath = $('#m-registration-path-filter').value
  state.researchType = $('#m-research-type-filter').value
  state.statusCode = $('#m-status-filter').value
  state.developmentStage = $('#m-phase-filter').value
  state.country = $('#m-country-filter').value
  state.sponsorClass = $('#m-sponsor-filter').value
  state.updatedWithinDays = $('#m-updated-filter').value
  state.centerScope = $('#m-center-scope-filter').value
  state.results = $('#m-results-filter').value
  state.sortMode = $('#m-sort-filter').value
  syncDesktopSourceCheckboxes()
  $('#registration-path-filter').value = state.registrationPath
  $('#research-type-filter').value = state.researchType
  $('#status-filter').value = state.statusCode
  $('#phase-filter').value = state.developmentStage
  $('#country-filter').value = state.country
  $('#sponsor-filter').value = state.sponsorClass
  $('#updated-filter').value = state.updatedWithinDays
  $('#center-scope-filter').value = state.centerScope
  $('#results-filter').value = state.results
  $('#sort-filter').value = state.sortMode
  closeFilterDrawer()
  if (previousStatus !== state.statusCode) runSearch({ scroll: true })
  else renderResults()
}

function renderSourceCenter() {
  const host = $('#source-center-grid')
  if (!host) return
  const defs = Object.values(SOURCE_DEFINITIONS)
  host.innerHTML = defs.map((source) => {
    const status = source.key === 'clinicaltrials'
      ? { status: 'live', records: state.studies.filter((study) => study.sourceKey === 'clinicaltrials') }
      : (state.snapshotStatuses[source.key] || { status: 'loading', records: [] })
    const statusLabel = source.key === 'clinicaltrials' ? '实时 API 已配置'
      : status.status === 'ready' ? `已导入 ${formatNumber(status.records.length)} 条快照`
      : status.status === 'empty' ? '官方入口已配置 · 当前快照为空'
      : status.status === 'error' ? '快照读取异常'
      : '正在检查本地快照'
    return `<article class="source-center-card source-${escapeHtml(source.color)}">
      <div class="source-center-top"><span class="source-layer-pill">Layer ${source.layer}</span><span class="source-mode-pill">${escapeHtml(source.mode === 'live-api' ? '访问时实时查询' : '官方数据快照/待授权接口')}</span></div>
      <h3>${escapeHtml(source.name)}</h3>
      <p>${escapeHtml(source.coverage)}</p>
      <dl><div><dt>层级</dt><dd>${escapeHtml(source.layerName)}</dd></div><div><dt>更新</dt><dd>${escapeHtml(source.cadence)}</dd></div><div><dt>当前接入</dt><dd>${escapeHtml(statusLabel)}</dd></div></dl>
      <a class="secondary-button source-link-button" href="${escapeHtml(source.home)}" target="_blank" rel="noopener noreferrer">打开官方平台</a>
    </article>`
  }).join('')

  const layers = $('#source-layer-strip')
  if (layers) {
    layers.innerHTML = [1,2,3,4].map((layer) => {
      const sources = defs.filter((source) => source.layer === layer)
      return `<article><span>Layer ${layer}</span><strong>${escapeHtml(sources[0].layerName)}</strong><small>${escapeHtml(sources.map((s) => s.short).join(' + '))}</small></article>`
    }).join('')
  }
}

function showView(route) {
  const routeName = route.startsWith('following') ? 'following' : route.startsWith('sources') ? 'sources' : route.startsWith('guide') ? 'guide' : 'trials'
  $$('.view').forEach((view) => { view.hidden = view.dataset.view !== routeName })
  $$('.desktop-nav a').forEach((link) => link.classList.toggle('active', link.dataset.nav === routeName))
  $('#mobile-menu').hidden = true
  $('#mobile-menu-button').setAttribute('aria-expanded', 'false')
  if (routeName === 'following') renderFavorites()
  if (routeName === 'sources') { renderSourceCenter(); ensureSnapshots().catch(() => renderSourceCenter()) }
  if (routeName === 'trials' && !state.studies.length && !state.loading) runSearch()
}

function handleRoute() {
  const route = location.hash.replace(/^#\/?/, '') || 'trials'
  showView(route)
  const studyMatch = route.match(/^study\/(.+)$/i)
  if (studyMatch) openDetail(decodeURIComponent(studyMatch[1]), { updateHash: false })
  else if ($('#detail-modal').classList.contains('open')) closeDetail({ updateHash: false })
  window.scrollTo({ top: 0, behavior: 'auto' })
}

function bindEvents() {
  $('#search-form').addEventListener('submit', (event) => {
    event.preventDefault()
    state.query = $('#search-input').value.trim()
    runSearch({ scroll: true })
  })
  $('#refresh-button').addEventListener('click', () => runSearch({ useCachePreview: false }))
  $('#load-more-button').addEventListener('click', loadMore)
  $('#reset-filters').addEventListener('click', () => resetFilters())
  $('#source-filter-options').addEventListener('change', (event) => {
    if (!event.target.matches('input[type="checkbox"]')) return
    const selected = $$('#source-filter-options input[type="checkbox"]:checked').map((input) => input.value)
    if (!selected.length) { event.target.checked = true; showToast('请至少保留一个数据来源'); return }
    state.sourceKeys = selected
    renderResults()
  })
  $('#registration-path-filter').addEventListener('change', (event) => { state.registrationPath = event.target.value; renderResults() })
  $('#research-type-filter').addEventListener('change', (event) => { state.researchType = event.target.value; renderResults() })
  $('#status-filter').addEventListener('change', (event) => {
    state.statusCode = event.target.value
    runSearch({ scroll: true })
  })
  $('#phase-filter').addEventListener('change', (event) => { state.developmentStage = event.target.value; renderResults() })
  $('#country-filter').addEventListener('change', (event) => { state.country = event.target.value; renderResults() })
  $('#sponsor-filter').addEventListener('change', (event) => { state.sponsorClass = event.target.value; renderResults() })
  $('#updated-filter').addEventListener('change', (event) => { state.updatedWithinDays = event.target.value; renderResults() })
  $('#center-scope-filter').addEventListener('change', (event) => { state.centerScope = event.target.value; renderResults() })
  $('#results-filter').addEventListener('change', (event) => { state.results = event.target.value; renderResults() })
  $('#sort-filter').addEventListener('change', (event) => { state.sortMode = event.target.value; renderResults() })

  document.addEventListener('click', (event) => {
    const detailButton = event.target.closest('[data-open-detail]')
    if (detailButton) openDetail(detailButton.dataset.openDetail)
    const favoriteButton = event.target.closest('[data-favorite-id]')
    if (favoriteButton) toggleFavorite(favoriteButton.dataset.favoriteId)
    const removeButton = event.target.closest('[data-remove-filter]')
    if (removeButton) removeFilter(removeButton.dataset.removeFilter)
    if (event.target.closest('[data-reset-all]')) resetFilters()
  })

  $$('.modal-close, .modal-backdrop').forEach((button) => button.addEventListener('click', () => closeDetail()))
  $('#mobile-filter-button').addEventListener('click', openFilterDrawer)
  $$('.drawer-close, .drawer-backdrop').forEach((button) => button.addEventListener('click', closeFilterDrawer))
  $('#mobile-apply-filters').addEventListener('click', applyMobileFilters)
  $('#mobile-reset-filters').addEventListener('click', () => {
    $$('#m-source-filter-options input[type="checkbox"]').forEach((input) => { input.checked = true })
    $('#m-registration-path-filter').value = ''
    $('#m-research-type-filter').value = ''
    $('#m-status-filter').value = ''
    $('#m-phase-filter').value = ''
    $('#m-country-filter').value = ''
    $('#m-sponsor-filter').value = ''
    $('#m-updated-filter').value = ''
    $('#m-center-scope-filter').value = ''
    $('#m-results-filter').value = ''
    $('#m-sort-filter').value = 'updated-desc'
  })
  $('#refresh-favorites-button').addEventListener('click', refreshFavorites)
  $('#mobile-menu-button').addEventListener('click', () => {
    const menu = $('#mobile-menu')
    const open = menu.hidden
    menu.hidden = !open
    $('#mobile-menu-button').setAttribute('aria-expanded', String(open))
  })
  $('#clear-local-data').addEventListener('click', () => {
    if (!confirm('确定清除当前浏览器中的查询缓存和全部关注记录吗？')) return
    clearAllLocalData()
    state.favorites = {}
    state.studies = []
    updateFavoriteBadge()
    showToast('本地数据已清除')
    if (!$('#following-view').hidden) renderFavorites()
    else runSearch({ useCachePreview: false })
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if ($('#detail-modal').classList.contains('open')) closeDetail()
      if ($('#mobile-filter-drawer').classList.contains('open')) closeFilterDrawer()
    }
  })
  window.addEventListener('hashchange', handleRoute)
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return
  try { await navigator.serviceWorker.register('./sw.js') } catch (error) { console.warn('Service worker registration failed:', error) }
}

function init() {
  bindEvents()
  updateFavoriteBadge()
  state.versionPromise = getApiVersion()
  state.snapshotPromise = loadSnapshots()
  handleRoute()
  registerServiceWorker()
}

init()
