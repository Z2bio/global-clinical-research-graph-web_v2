function nonEmptyIds(study) {
  return Object.entries(study.identifiers || {})
    .map(([source, id]) => [source, String(id || '').trim()])
    .filter(([, id]) => id)
}

function sharesExactIdentifier(a, b) {
  const aIds = new Set(nonEmptyIds(a).map(([, id]) => id.toUpperCase()))
  return nonEmptyIds(b).some(([, id]) => aIds.has(id.toUpperCase()))
}

function mergeUniqueObjects(items, keyFn) {
  const seen = new Set()
  return items.filter((item) => {
    const key = keyFn(item)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function mergeExactCrossRegistrations(studies = []) {
  const merged = []
  for (const incoming of studies) {
    const index = merged.findIndex((existing) => sharesExactIdentifier(existing, incoming))
    if (index < 0) {
      merged.push({ ...incoming, sourceRecords: [...(incoming.sourceRecords || [])] })
      continue
    }
    const base = merged[index]
    const sourceRecords = mergeUniqueObjects(
      [...(base.sourceRecords || []), ...(incoming.sourceRecords || [])],
      (item) => `${item.sourceKey}:${item.id}`
    )
    merged[index] = {
      ...base,
      identifiers: { ...(base.identifiers || {}), ...(incoming.identifiers || {}) },
      sourceRecords,
      sourceCount: sourceRecords.length,
      graphMerged: true
    }
  }
  return merged.map((study) => ({ ...study, sourceCount: study.sourceRecords?.length || 1 }))
}

export function computeGraphMetrics(studies = []) {
  const sourceKeys = new Set()
  const sponsors = new Set()
  const institutions = new Set()
  const conditions = new Set()
  let crossRegistered = 0
  for (const study of studies) {
    for (const source of study.sourceRecords || []) sourceKeys.add(source.sourceKey)
    if (study.sponsor?.name && study.sponsor.name !== '未公开') sponsors.add(study.sponsor.name)
    for (const facility of study.facilities || []) if (facility.name && facility.name !== '未公开') institutions.add(facility.name)
    for (const condition of study.conditions || []) if (condition) conditions.add(condition)
    if ((study.sourceRecords?.length || 0) > 1) crossRegistered += 1
  }
  return {
    studies: studies.length,
    sourceCount: sourceKeys.size,
    sponsors: sponsors.size,
    institutions: institutions.size,
    conditions: conditions.size,
    crossRegistered
  }
}
