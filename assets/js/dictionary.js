export const STATUS_META = Object.freeze({
  RECRUITING: { label: '招募中', className: 'status-recruiting', plain: '登记显示试验正在招募，但具体中心是否仍开放需向研究机构核实。' },
  NOT_YET_RECRUITING: { label: '尚未招募', className: 'status-pending', plain: '试验已经登记，但公开状态显示尚未开始招募。' },
  ENROLLING_BY_INVITATION: { label: '仅受邀招募', className: 'status-pending', plain: '试验只通过研究团队邀请特定人群参加。' },
  ACTIVE_NOT_RECRUITING: { label: '进行中，不再招募', className: 'status-active', plain: '研究仍在进行，但登记显示已停止接收新受试者。' },
  SUSPENDED: { label: '暂停', className: 'status-paused', plain: '招募或研究活动暂时停止，未来可能恢复。' },
  COMPLETED: { label: '已完成', className: 'status-completed', plain: '研究活动已经结束，但不代表研究结果已经公开。' },
  TERMINATED: { label: '已终止', className: 'status-stopped', plain: '研究在原计划完成前停止。原因需查看官方登记说明。' },
  WITHDRAWN: { label: '已撤回', className: 'status-stopped', plain: '研究在开始招募前撤回。' },
  UNKNOWN: { label: '状态未知', className: 'status-unknown', plain: '官方登记未提供可识别的当前状态。' }
})

export const PHASE_LABELS = Object.freeze({
  EARLY_PHASE1: '早期Ⅰ期',
  PHASE1: 'Ⅰ期',
  PHASE2: 'Ⅱ期',
  PHASE3: 'Ⅲ期',
  PHASE4: 'Ⅳ期',
  NA: '不适用'
})

export const STUDY_TYPE_LABELS = Object.freeze({
  INTERVENTIONAL: '干预性研究',
  OBSERVATIONAL: '观察性研究',
  EXPANDED_ACCESS: '扩大使用研究'
})

export const SPONSOR_CLASS_LABELS = Object.freeze({
  INDUSTRY: '企业',
  NIH: '美国国立卫生研究院',
  FED: '政府机构',
  NETWORK: '研究网络',
  OTHER: '医院、高校或其他机构',
  OTHER_GOV: '其他政府机构',
  INDIV: '个人研究者'
})

export const INTERVENTION_TYPE_LABELS = Object.freeze({
  DRUG: '药物',
  BIOLOGICAL: '生物制品',
  DEVICE: '医疗器械',
  PROCEDURE: '操作或手术',
  BEHAVIORAL: '行为干预',
  DIETARY_SUPPLEMENT: '膳食补充剂',
  RADIATION: '放射治疗',
  GENETIC: '遗传相关干预',
  COMBINATION_PRODUCT: '组合产品',
  DIAGNOSTIC_TEST: '诊断检测',
  OTHER: '其他'
})

export const ENROLLMENT_TYPE_LABELS = Object.freeze({
  ACTUAL: '实际公开人数',
  ESTIMATED: '计划招募人数'
})

export const SEX_LABELS = Object.freeze({
  ALL: '所有性别',
  FEMALE: '女性',
  MALE: '男性'
})

export const COMMON_QUERY_TRANSLATIONS = Object.freeze({
  '肺癌': 'lung cancer',
  '非小细胞肺癌': 'non-small cell lung cancer',
  '小细胞肺癌': 'small cell lung cancer',
  '乳腺癌': 'breast cancer',
  '胃癌': 'gastric cancer',
  '肝癌': 'liver cancer',
  '结直肠癌': 'colorectal cancer',
  '胰腺癌': 'pancreatic cancer',
  '前列腺癌': 'prostate cancer',
  '卵巢癌': 'ovarian cancer',
  '宫颈癌': 'cervical cancer',
  '淋巴瘤': 'lymphoma',
  '白血病': 'leukemia',
  '多发性骨髓瘤': 'multiple myeloma',
  '糖尿病': 'diabetes',
  '高血压': 'hypertension',
  '冠心病': 'coronary artery disease',
  '心力衰竭': 'heart failure',
  '脑卒中': 'stroke',
  '阿尔茨海默病': 'Alzheimer disease',
  '帕金森病': 'Parkinson disease',
  '抑郁症': 'depression',
  '哮喘': 'asthma',
  '慢阻肺': 'COPD',
  '类风湿关节炎': 'rheumatoid arthritis',
  '系统性红斑狼疮': 'systemic lupus erythematosus',
  '新冠': 'COVID-19',
  '艾滋病': 'HIV',
  '罕见病': 'rare disease'
})

export function translateCommonQuery(query) {
  const value = String(query || '').trim()
  if (!value) return ''
  if (COMMON_QUERY_TRANSLATIONS[value]) return COMMON_QUERY_TRANSLATIONS[value]
  return Object.entries(COMMON_QUERY_TRANSLATIONS)
    .sort(([left], [right]) => right.length - left.length)
    .reduce((translated, [chinese, english]) => translated.split(chinese).join(english), value)
}

export function getStatusMeta(code) {
  return STATUS_META[code] || STATUS_META.UNKNOWN
}

export function phaseLabel(phases = []) {
  if (!Array.isArray(phases) || phases.length === 0) return '分期未公开'
  return phases.map((item) => PHASE_LABELS[item] || item).join(' / ')
}
