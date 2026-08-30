function text(value) { return String(value || '').trim() }
function finite(value) { const n = Number(value); return Number.isFinite(n) ? n : null }

export function facilityIdentity(facility = {}) {
  const lat = finite(facility.latitude)
  const lon = finite(facility.longitude)
  const coordinate = lat !== null && lon !== null ? `${lat.toFixed(5)},${lon.toFixed(5)}` : ''
  return [text(facility.name), text(facility.city), text(facility.country), coordinate].join('|').toLowerCase()
}

export function buildFacilityPoints(studies = [], { maxPoints = 2500 } = {}) {
  const index = new Map()
  for (const study of studies) {
    for (const facility of study.facilities || []) {
      const latitude = finite(facility.latitude)
      const longitude = finite(facility.longitude)
      if (latitude === null || longitude === null) continue
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) continue
      const id = facilityIdentity(facility)
      if (!id) continue
      if (!index.has(id)) {
        index.set(id, {
          id,
          lnglat: [longitude, latitude],
          longitude,
          latitude,
          name: text(facility.name) || '未公开执行中心',
          city: text(facility.city), state: text(facility.state), country: text(facility.country), address: text(facility.address),
          statusCode: text(facility.statusCode), coordinateSystem: text(facility.coordinateSystem), contacts: facility.contacts || [], studies: [], sourceKeys: new Set()
        })
      }
      const point = index.get(id)
      if (!point.studies.some((item) => item.nctId === study.nctId)) point.studies.push(study)
      for (const source of study.sourceRecords || [{ sourceKey: study.sourceKey }]) if (source?.sourceKey) point.sourceKeys.add(source.sourceKey)
    }
  }
  return [...index.values()]
    .map((point) => ({ ...point, sourceKeys: [...point.sourceKeys], studyCount: point.studies.length, weight: Math.max(1, point.studies.length) }))
    .sort((a, b) => b.studyCount - a.studyCount || a.name.localeCompare(b.name, 'zh-CN'))
    .slice(0, maxPoints)
}

export function studyPrimaryLocatedFacility(study = {}) {
  return (study.facilities || []).find((facility) => finite(facility.latitude) !== null && finite(facility.longitude) !== null) || null
}

export function hasChinaLocation(study = {}) {
  return (study.facilities || []).some((facility) => {
    const c = text(facility.country).toLowerCase()
    return c === 'china' || c === '中国' || c.includes('china') || c.includes('中国')
  })
}

export function mapMetrics(studies = []) {
  const points = buildFacilityPoints(studies)
  const locatedIds = new Set(points.flatMap((point) => point.studies.map((study) => study.nctId)))
  return { studyCount: studies.length, facilityCount: points.length, locatedStudyCount: locatedIds.size }
}
