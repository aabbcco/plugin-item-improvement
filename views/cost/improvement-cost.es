import _ from 'lodash'

const emptyMaterials = () => ({ fuel: 0, ammo: 0, steel: 0, bauxite: 0 })

const parseStageText = stageText => {
  const text = String(stageText || '')
  if (!text) {
    return { kind: 'upgrade' }
  }

  const m = text.match(/\u2605\+?(\d+)\s*~\s*\u2605\+?(\d+)/) || text.match(/★\+?(\d+)\s*~\s*★\+?(\d+)/)
  if (m) {
    return { kind: 'level', from: Number(m[1]), to: Number(m[2]) }
  }

  return { kind: 'label', label: text }
}

const parseExtraItem = (rawItem, rawCount) => {
  const count = Number(rawCount || 0)
  if (!rawItem) {
    return { kind: 'none', id: 0, count }
  }

  if (_.isString(rawItem)) {
    const m = rawItem.match(/\d+/)
    return {
      kind: 'useitem',
      id: m ? Number(m[0]) : 0,
      key: rawItem,
      count,
    }
  }

  return {
    kind: 'equip',
    id: Number(rawItem),
    count,
  }
}

const normalizeImprovementResource = resource => {
  if (!Array.isArray(resource) || resource.length === 0) {
    return { materials: emptyMaterials(), stages: [] }
  }

  const base = Array.isArray(resource[0]) ? resource[0] : []
  const [fuel = 0, ammo = 0, steel = 0, bauxite = 0] = base
  const materials = { fuel, ammo, steel, bauxite }

  const stages = resource.slice(1).map(entry => {
    const row = Array.isArray(entry) ? entry : []
    const [devmat = 0, ensDevmat = 0, screws = 0, ensScrews = 0, stageText = '', extra = []] = row

    const extraItems = (Array.isArray(extra) ? extra : [])
      .map(pair => Array.isArray(pair) ? pair : [])
      .map(([item, count]) => parseExtraItem(item, count))
      .filter(x => x.count > 0)

    return {
      stageText,
      stage: parseStageText(stageText),
      devmat: { normal: devmat, sure: ensDevmat },
      screws: { normal: screws, sure: ensScrews },
      extra: extraItems,
    }
  })

  return { materials, stages }
}

const normalizeImprovementEntryCost = entry => {
  const upgrade = entry && entry.upgrade
    ? { id: Number(entry.upgrade[0] || 0), level: Number(entry.upgrade[1] || 0) }
    : null

  const { materials, stages } = normalizeImprovementResource(entry && entry.resource)

  return {
    upgrade,
    materials,
    stages,
  }
}

const getEquipImprovementCosts = item => {
  const improvement = _.get(item, 'improvement', [])
  if (!Array.isArray(improvement) || improvement.length === 0) {
    return []
  }
  return improvement.map(normalizeImprovementEntryCost)
}

const buildEquipImprovementCostIndex = items => {
  const list = Array.isArray(items) ? items : []
  return _(list)
    .filter(x => x && typeof x.id === 'number')
    .keyBy(x => x.id)
    .mapValues(getEquipImprovementCosts)
    .value()
}

export {
  parseStageText,
  normalizeImprovementResource,
  normalizeImprovementEntryCost,
  getEquipImprovementCosts,
  buildEquipImprovementCostIndex,
}
