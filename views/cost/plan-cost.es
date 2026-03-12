import _ from 'lodash'

const emptyTotals = () => ({
  materials: { fuel: 0, ammo: 0, steel: 0, bauxite: 0 },
  devmat: { normal: 0, sure: 0 },
  screws: { normal: 0, sure: 0 },
  extra: {
    useitem: {},
    equip: {},
  },
})

const addCount = (map, key, add) => {
  const k = String(key)
  const next = (map[k] || 0) + add
  if (next === 0) {
    const { [k]: _ignored, ...rest } = map
    return rest
  }
  return { ...map, [k]: next }
}

const addTotals = (a, b) => ({
  materials: {
    fuel: a.materials.fuel + b.materials.fuel,
    ammo: a.materials.ammo + b.materials.ammo,
    steel: a.materials.steel + b.materials.steel,
    bauxite: a.materials.bauxite + b.materials.bauxite,
  },
  devmat: {
    normal: a.devmat.normal + b.devmat.normal,
    sure: a.devmat.sure + b.devmat.sure,
  },
  screws: {
    normal: a.screws.normal + b.screws.normal,
    sure: a.screws.sure + b.screws.sure,
  },
  extra: {
    useitem: _(a.extra.useitem)
      .keys()
      .concat(_.keys(b.extra.useitem))
      .uniq()
      .reduce((acc, k) => addCount(acc, k, (b.extra.useitem[k] || 0)), { ...a.extra.useitem }),
    equip: _(a.extra.equip)
      .keys()
      .concat(_.keys(b.extra.equip))
      .uniq()
      .reduce((acc, k) => addCount(acc, k, (b.extra.equip[k] || 0)), { ...a.extra.equip }),
  },
})

const multiplyTotals = (t, n) => {
  const m = Number(n || 0)
  if (m <= 0) return emptyTotals()

  return {
    materials: {
      fuel: t.materials.fuel * m,
      ammo: t.materials.ammo * m,
      steel: t.materials.steel * m,
      bauxite: t.materials.bauxite * m,
    },
    devmat: {
      normal: t.devmat.normal * m,
      sure: t.devmat.sure * m,
    },
    screws: {
      normal: t.screws.normal * m,
      sure: t.screws.sure * m,
    },
    extra: {
      useitem: _(t.extra.useitem)
        .mapValues(v => v * m)
        .value(),
      equip: _(t.extra.equip)
        .mapValues(v => v * m)
        .value(),
    },
  }
}

const stageForStar = (costEntry, star) => {
  const stages = _.get(costEntry, 'stages', [])
  if (!Array.isArray(stages) || stages.length === 0) return null

  const direct = stages.find(s => s && s.stage && s.stage.kind === 'level' &&
    typeof s.stage.from === 'number' && typeof s.stage.to === 'number' &&
    s.stage.from <= star && star <= s.stage.to)
  if (direct) return direct

  const candidates = stages
    .filter(s => s && s.stage && s.stage.kind === 'level' && typeof s.stage.from === 'number')
    .filter(s => s.stage.from <= star)
    .sort((a, b) => b.stage.from - a.stage.from)
  return candidates[0] || null
}

const totalsForOneAttempt = (costEntry, stage) => {
  const materials = _.get(costEntry, 'materials', {})
  const devmat = _.get(stage, 'devmat', {})
  const screws = _.get(stage, 'screws', {})
  const extra = _.get(stage, 'extra', [])

  let totals = emptyTotals()
  totals.materials = {
    fuel: Number(materials.fuel || 0),
    ammo: Number(materials.ammo || 0),
    steel: Number(materials.steel || 0),
    bauxite: Number(materials.bauxite || 0),
  }
  totals.devmat = { normal: Number(devmat.normal || 0), sure: Number(devmat.sure || 0) }
  totals.screws = { normal: Number(screws.normal || 0), sure: Number(screws.sure || 0) }

  if (Array.isArray(extra)) {
    extra.forEach(x => {
      if (!x || !x.count) return
      if (x.kind === 'useitem') {
        totals.extra.useitem = addCount(totals.extra.useitem, x.key || x.id, Number(x.count || 0))
      } else if (x.kind === 'equip') {
        totals.extra.equip = addCount(totals.extra.equip, x.id, Number(x.count || 0))
      }
    })
  }

  return totals
}

const calcCostForUpgrade = (costEntry, fromStar, toStar) => {
  const from = Math.max(0, Math.min(10, Number(fromStar || 0)))
  const to = Math.max(0, Math.min(10, Number(toStar || 0)))
  if (!costEntry || to <= from) return emptyTotals()

  let totals = emptyTotals()
  for (let s = from; s < to; s += 1) {
    const stage = stageForStar(costEntry, s)
    if (!stage) continue
    totals = addTotals(totals, totalsForOneAttempt(costEntry, stage))
  }
  return totals
}

const normalizePlanTargets = (planByStar, ownedCount) => {
  const owned = Number(ownedCount || 0)
  const requested = Array(11).fill(0)

  console.log("planByStar",planByStar)
  console.log("owned",ownedCount)

  if (!planByStar) return { requested, effective: requested.slice() }

  Object.keys(planByStar).forEach(k => {
    const star = Number.parseInt(k, 10)
    if (!Number.isFinite(star) || star <= 0 || star > 10) return
    let cnt = Number(planByStar[k] || 0)
    if (cnt >= 9999) cnt = owned
    requested[star] = Math.max(requested[star], cnt)
  })

  for (let s = 9; s >= 1; s -= 1) {
    requested[s] = Math.max(requested[s], requested[s + 1])
  }

  const effective = requested.map((cnt, s) => (s === 0 ? 0 : Math.max(0, Math.min(cnt, owned))))
  return { requested, effective }
}

const computePlannedUpgrades = (levels, targetAtOrAbove) => {
  const owned = Array.isArray(levels) ? levels.length : 0
  const tgt = Array.isArray(targetAtOrAbove) ? targetAtOrAbove : Array(11).fill(0)

  const effectiveLevels = (Array.isArray(levels) ? levels : [])
    .map(x => Math.max(0, Math.min(10, Number(x || 0))))
    .sort((a, b) => a - b)

  const upgrades = []
  for (let s = 10; s >= 1; s -= 1) {
    const desired = Math.max(0, Math.min(Number(tgt[s] || 0), owned))
    if (desired === 0) continue

    let split = effectiveLevels.findIndex(lv => lv >= s)
    if (split === -1) split = effectiveLevels.length
    const currentAtOrAbove = effectiveLevels.length - split
    const need = desired - currentAtOrAbove
    if (need <= 0) continue

    const start = Math.max(0, split - need)
    for (let i = start; i < split; i += 1) {
      const from = effectiveLevels[i]
      upgrades.push({ from, to: s })
      effectiveLevels[i] = s
    }
    effectiveLevels.sort((a, b) => a - b)
  }

  return upgrades
}

const computePlanTotalsForEquip = ({ planByStar, levels, costEntry }) => {
  const owned = Array.isArray(levels) ? levels.length : 0
  const { requested, effective } = normalizePlanTargets(planByStar, owned)

  const upgrades = computePlannedUpgrades(levels, effective)
  console.log("upgrades:",upgrades)
  const totals = upgrades.reduce((acc, u) => addTotals(acc, calcCostForUpgrade(costEntry, u.from, u.to)), emptyTotals())

  return {
    owned,
    requested,
    effective,
    upgrades,
    totals,
  }
}

const computeEquipShortage = (totals, availableEquips) => {
  const shortage = {}
  
  Object.keys(totals.extra.equip || {}).forEach(equipId => {
    const required = Number(totals.extra.equip[equipId] || 0)
    const available = _.get(availableEquips, [equipId, 'length'], 0)
    const gap = Math.max(0, required - available)
    if (gap > 0) {
      shortage[equipId] = gap
    }
  })
  
  return shortage
}

export {
  emptyTotals,
  addTotals,
  multiplyTotals,

  calcCostForUpgrade,
  normalizePlanTargets,
  computePlannedUpgrades,
  computePlanTotalsForEquip,
  computeEquipShortage,
}
