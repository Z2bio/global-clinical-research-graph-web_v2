import { CONFIG } from './config.js'

const MESSAGES = {
  'zh-CN': {
    navTrials: '公示列表', navMap: '研究图谱', navSources: '数据源覆盖', navFollowing: '我的关注', navGuide: '阅读说明',
    mapTitle: '临床研究分布图谱', mapSubtitle: '以公开登记的执行中心坐标为基础，联动研究列表、医院/中心与来源证据。',
    mapSearchPlaceholder: '输入疾病、医院、药企/发起方或注册编号', search: '搜索', reset: '重置',
    source: '数据来源', registrationPath: '研究发起 / 注册路径', researchType: '研究类型', status: '公开状态', country: '国家/地区',
    allSources: '全部来源', allPaths: '全部路径', allResearchTypes: '全部研究类型', allStatuses: '全部状态', allCountries: '全部国家/地区',
    facilityCount: '可定位执行中心', studyCount: '当前研究', locatedStudyCount: '有坐标研究', noCoordinates: '当前筛选结果暂无可用于地图定位的公开坐标。',
    mapNeedsKeyTitle: '地图服务尚未配置', mapNeedsKeyBody: '当前显示“坐标分布预览”。如需中国境内正式地图，请在 config.js 中配置高德地图 Web(JS API) Key；生产环境建议使用安全代理。',
    coordinatePreview: '坐标分布预览（非正式底图）', relationGraph: '关系图谱', reserved: '已预留 · 后续版本',
    linkedStudies: '关联研究', openStudy: '查看研究详情', focusOnMap: '地图定位', facility: '执行中心', location: '位置', sources: '来源',
    originalContent: '研究标题和医学内容优先保留登记源原文；界面语言可中英文切换。',
    mapCompliance: '中国境内正式展示建议使用依法合规的互联网地图服务，不隐藏地图服务商标识与审图信息。',
    chinaFirst: '中国优先', worldView: '全球视图', withCoordinatesOnly: '仅显示可定位记录',
    listMapHint: '点击左侧研究卡片可定位到其执行中心；点击地图中心可查看关联研究。',
    noStudies: '当前没有符合筛选条件的研究。', sourceEvidence: '来源证据', mapMode: '地图模式',
    viewList: '列表', viewSplit: '列表 + 地图', viewMap: '地图', executionMap: '执行中心地图', worldShort: '全球', inlineMapHint: '点击研究卡片“地图定位”或直接点击医院/中心点。', openFullMap: '打开完整研究图谱 →', collapse: '收起', expand: '展开', autoLayout: '自适应',
    zh: '中文', en: 'EN'
  },
  'en-US': {
    navTrials: 'Studies', navMap: 'Research Map', navSources: 'Data Sources', navFollowing: 'Following', navGuide: 'Guide',
    mapTitle: 'Clinical Research Distribution Map', mapSubtitle: 'Link studies, sites, institutions and source evidence using public registry coordinates.',
    mapSearchPlaceholder: 'Condition, hospital, sponsor or registry ID', search: 'Search', reset: 'Reset',
    source: 'Data source', registrationPath: 'Initiation / registration pathway', researchType: 'Research type', status: 'Public status', country: 'Country/region',
    allSources: 'All sources', allPaths: 'All pathways', allResearchTypes: 'All research types', allStatuses: 'All statuses', allCountries: 'All countries/regions',
    facilityCount: 'Located sites', studyCount: 'Studies', locatedStudyCount: 'Studies with coordinates', noCoordinates: 'No public coordinates are available for the current filtered results.',
    mapNeedsKeyTitle: 'Map service is not configured', mapNeedsKeyBody: 'A coordinate preview is shown. For a mainland-China production map, configure an AMap Web (JS API) key in config.js; use a secure proxy in production.',
    coordinatePreview: 'Coordinate preview (not an official basemap)', relationGraph: 'Relationship Graph', reserved: 'Reserved · future version',
    linkedStudies: 'Linked studies', openStudy: 'Open study', focusOnMap: 'Locate on map', facility: 'Site', location: 'Location', sources: 'Sources',
    originalContent: 'Study titles and medical content remain in the registry source language; the application interface can switch between Chinese and English.',
    mapCompliance: 'For production use in mainland China, use a compliant licensed internet map service and do not hide provider attribution or map approval information.',
    chinaFirst: 'China first', worldView: 'World view', withCoordinatesOnly: 'Located records only',
    listMapHint: 'Select a study card to focus its site; select a site on the map to view linked studies.',
    noStudies: 'No studies match the current filters.', sourceEvidence: 'Source evidence', mapMode: 'Map mode',
    viewList: 'List', viewSplit: 'List + Map', viewMap: 'Map', executionMap: 'Site map', worldShort: 'World', inlineMapHint: 'Use “Locate on map” or select a hospital/site marker.', openFullMap: 'Open full research map →', collapse: 'Collapse', expand: 'Expand', autoLayout: 'Auto fit',
    zh: '中文', en: 'EN'
  }
}

const EXACT_EN = new Map([
  ['公示列表', 'Studies'], ['研究图谱', 'Research Map'], ['数据源覆盖', 'Data Sources'], ['我的关注', 'Following'], ['阅读说明', 'Guide'],
  ['查询公示', 'Search studies'], ['结构化筛选', 'Structured filters'], ['缩小公示范围', 'Narrow results'], ['重置', 'Reset'],
  ['数据来源', 'Data source'], ['可多选', 'Multi-select'], ['研究发起 / 注册路径', 'Initiation / registration pathway'],
  ['研究类型', 'Research type'], ['公开状态', 'Public status'], ['药物开发 / 试验阶段', 'Drug development / trial stage'],
  ['执行国家/地区', 'Country/region'], ['申办方 / 主办单位类型', 'Sponsor / organizer type'], ['最近公开更新时间', 'Last public update'],
  ['更多筛选', 'More filters'], ['执行中心范围', 'Site scope'], ['结果登记', 'Results registration'], ['当前页排序', 'Sort current page'],
  ['临床研究公示列表', 'Clinical research listings'], ['加载更多公示记录', 'Load more'], ['四层公开数据架构', 'Four-layer public data architecture'],
  ['数据源覆盖与接入状态', 'Data source coverage and connection status'], ['统一研究实体如何形成', 'How the canonical research entity is built'],
  ['仅保存在当前浏览器', 'Stored only in this browser'], ['刷新关注状态', 'Refresh followed studies'], ['阅读与使用边界', 'Interpretation and use boundaries'],
  ['如何正确理解临床研究公示信息', 'How to interpret public clinical research information'], ['全部路径', 'All pathways'], ['全部研究类型', 'All research types'],
  ['全部状态', 'All statuses'], ['全部阶段', 'All stages'], ['全部国家/地区', 'All countries/regions'], ['全部类型', 'All types'], ['不限', 'Any time'],
  ['单中心', 'Single-center'], ['多中心', 'Multicenter'], ['中心范围未公开', 'Site scope not public'], ['已有结果登记', 'Results posted'], ['暂未显示结果登记', 'No results shown'],
  ['最近更新优先', 'Recently updated first'], ['首次公示较新优先', 'Newest first posting'], ['计划人数较多优先', 'Larger enrollment first'], ['标题字母顺序', 'Title A–Z'],
  ['招募中', 'Recruiting'], ['尚未招募', 'Not yet recruiting'], ['仅受邀招募', 'Enrolling by invitation'], ['进行中，不再招募', 'Active, not recruiting'], ['暂停', 'Suspended'], ['已完成', 'Completed'], ['已终止', 'Terminated'], ['已撤回', 'Withdrawn'],
  ['药品注册性试验', 'Regulatory drug trial'], ['IIT / 研究者发起研究', 'IIT / investigator-initiated study'], ['其他非注册性临床研究', 'Other non-registration clinical study'], ['注册路径暂无法判定', 'Registration pathway undetermined'],
  ['干预性研究', 'Interventional study'], ['观察性研究', 'Observational study'], ['诊断研究', 'Diagnostic study'], ['预后研究', 'Prognostic study'], ['病因/相关因素研究', 'Etiologic / risk-factor study'], ['流行病学研究', 'Epidemiologic study'], ['预防研究', 'Prevention study'], ['筛查研究', 'Screening study'], ['卫生服务研究', 'Health services study'], ['扩大使用研究', 'Expanded access'], ['其他研究', 'Other study'], ['研究类型未公开', 'Research type not public'],
  ['早期Ⅰ期', 'Early Phase 1'], ['BE 生物等效性试验', 'BE bioequivalence study'], ['PK 药代动力学试验', 'PK pharmacokinetic study'], ['Ⅰ期', 'Phase 1'], ['Ⅰ/Ⅱ期', 'Phase 1/2'], ['Ⅱ期', 'Phase 2'], ['Ⅱ/Ⅲ期', 'Phase 2/3'], ['Ⅲ期', 'Phase 3'], ['Ⅳ期', 'Phase 4'], ['不适用', 'Not applicable'], ['阶段未公开', 'Stage not public'],
  ['企业', 'Industry'], ['政府机构', 'Government'], ['医院、高校或其他机构', 'Hospital, university or other organization'], ['个人研究者', 'Individual investigator'],
  ['主要疾病', 'Condition'], ['当前研究', 'Studies'], ['有坐标研究', 'Studies with coordinates'], ['可定位执行中心', 'Located sites'], ['关联研究', 'Linked studies'], ['地图模式', 'Map mode'], ['主要执行单位', 'Primary site'], ['干预 / 疗程', 'Intervention / regimen'], ['计划或实际人数', 'Planned / actual enrollment'], ['执行国家/地区', 'Countries/regions'], ['最近更新', 'Last update'], ['查看详情', 'View details'],
  ['列表', 'List'], ['列表 + 地图', 'List + Map'], ['地图', 'Map'], ['执行中心地图', 'Site map'], ['全球', 'World'],
  ['打开完整研究图谱 →', 'Open full research map →'], ['点击研究卡片“地图定位”或直接点击医院/中心点。', 'Use “Locate on map” or select a hospital/site marker.'],
  ['地图定位', 'Locate on map'], ['查看结构化详情', 'View structured details'], ['最近公开更新', 'Last public update'],
  ['实时', 'Live'], ['待授权', 'Authorization required'], ['待数据', 'Feed required'], ['待首轮同步', 'First sync pending'], ['需配置种子', 'Seed configuration required'], ['部分覆盖', 'Partial coverage'], ['同步异常', 'Sync error'], ['降级/旧快照', 'Degraded / cached snapshot'], ['未接入', 'Not connected'],
  ['Map / 研究分布', 'Map / Research distribution'],
  ['研究定位与基本概况', 'Research classification and overview'], ['执行主体与申办方', 'Sponsor and participating institutions'], ['当前全球进度明细', 'Current study progress'], ['研究协调员联系方式（公开信息）', 'Public study contacts'], ['详细入选与排除标准', 'Detailed eligibility criteria'], ['研究终点', 'Study outcomes'], ['来源证据链与交叉注册编号', 'Source evidence and cross-registration IDs']
])

let locale = (() => {
  try { return localStorage.getItem(CONFIG.localeKey) || 'zh-CN' } catch { return 'zh-CN' }
})()
if (!MESSAGES[locale]) locale = 'zh-CN'

function preserveWhitespaceReplace(node, translated) {
  const raw = node.nodeValue
  const leading = raw.match(/^\s*/)?.[0] || ''
  const trailing = raw.match(/\s*$/)?.[0] || ''
  node.nodeValue = leading + translated + trailing
}

function translateTextNode(node) {
  if (!node || !node.nodeValue) return
  const text = node.nodeValue.trim()
  if (!text) return
  if (!node.__crgZhOriginal) node.__crgZhOriginal = text
  if (locale === 'zh-CN') {
    if (node.__crgZhOriginal) preserveWhitespaceReplace(node, node.__crgZhOriginal)
    return
  }
  const source = node.__crgZhOriginal || text
  const exact = EXACT_EN.get(source)
  if (exact) preserveWhitespaceReplace(node, exact)
}

export function translateDocument(root = document.body) {
  if (!root) return
  document.documentElement.lang = locale
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  nodes.forEach(translateTextNode)
  const placeholderEls = []
  if (root.matches?.('[data-i18n-placeholder]')) placeholderEls.push(root)
  root.querySelectorAll?.('[data-i18n-placeholder]').forEach((el) => placeholderEls.push(el))
  placeholderEls.forEach((el) => {
    const key = el.dataset.i18nPlaceholder
    el.placeholder = t(key)
  })
  const i18nEls = []
  if (root.matches?.('[data-i18n]')) i18nEls.push(root)
  root.querySelectorAll?.('[data-i18n]').forEach((el) => i18nEls.push(el))
  i18nEls.forEach((el) => {
    const key = el.dataset.i18n
    const translated = t(key)
    // Never expose an internal translation key such as "viewList" to end users.
    if (translated && translated !== key) el.textContent = translated
  })
  const localeEls = []
  if (root.matches?.('[data-locale-button]')) localeEls.push(root)
  root.querySelectorAll?.('[data-locale-button]').forEach((el) => localeEls.push(el))
  localeEls.forEach((el) => el.classList.toggle('active', el.dataset.localeButton === locale))
}

export function getLocale() { return locale }
export function t(key) { return MESSAGES[locale]?.[key] || MESSAGES['zh-CN']?.[key] || key }
export function msg(key, fallback = '') { return MESSAGES[locale]?.[key] || fallback || key }

export function setLocale(next) {
  if (!MESSAGES[next] || next === locale) return
  locale = next
  try { localStorage.setItem(CONFIG.localeKey, locale) } catch {}
  translateDocument(document.body)
  document.dispatchEvent(new CustomEvent('crg:language-change', { detail: { locale } }))
}

export function initI18n() {
  translateDocument(document.body)
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-locale-button]')
    if (button) setLocale(button.dataset.localeButton)
  })
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) translateTextNode(node)
        else if (node.nodeType === Node.ELEMENT_NODE) translateDocument(node)
      }
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}
