import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import _ from 'lodash'

import { ListGroup, ListGroupItem, Collapse } from 'react-bootstrap'
import { MaterialIcon, SlotitemIcon } from 'views/components/etc/icon'
import { UseitemIcon } from '../useitem-icon'
import { ItemInfoRow } from '../item-info-row'
import { starCraftPlanSelector, improvementDataSelector, equipLevelStatSelector, equipAvailableSelector, adjustedRemodelChainsSelector, shipUniqueMapSelector } from '../selectors'
import { constSelector } from 'views/utils/selectors'
import { buildEquipImprovementCostIndex } from './improvement-cost'
import { computePlanTotalsForEquip, addTotals, emptyTotals } from './plan-cost'

const { __ } = window.i18n['poi-plugin-item-improvement2']
const { __: __r } = window.i18n.resources

const calculateTotalShortages = (allCalcs, availableEquips, resources) => {
  let grandTotal = emptyTotals()
  const equipUsageMap = {}
  
  allCalcs.forEach(({ calc, mstId }) => {
    grandTotal = addTotals(grandTotal, calc.totals)
    
    Object.keys(calc.totals.extra.equip || {}).forEach(equipId => {
      const id = Number(equipId)
      if (!equipUsageMap[id]) {
        equipUsageMap[id] = { materialRequired: 0, planRequired: 0 }
      }
      equipUsageMap[id].materialRequired += calc.totals.extra.equip[equipId]
      
      if (id === mstId) {
        const { owned, effective } = calc
        const maxPlanCount = Math.max(...effective.filter((v, idx) => idx > 0), 0)
        equipUsageMap[id].planRequired += Math.max(0, maxPlanCount - owned)
      }
    })
  })
  
  const devmatAvailable = _.get(resources, '[6]', 0)
  const screwAvailable = _.get(resources, '[7]', 0)
  
  const devmatShortage = Math.max(0, grandTotal.devmat.normal - devmatAvailable)
  const screwShortage = Math.max(0, grandTotal.screws.normal - screwAvailable)
  
  const equipShortages = {}
  Object.keys(grandTotal.extra.equip || {}).forEach(equipId => {
    const id = Number(equipId)
    const required = grandTotal.extra.equip[equipId]
    const available = _.get(availableEquips, [id, 'length'], 0)
    const usage = equipUsageMap[id] || { materialRequired: 0, planRequired: 0 }
    
    const totalRequired = usage.materialRequired + usage.planRequired
    const shortage = Math.max(0, totalRequired - available)
    
    if (shortage > 0) {
      equipShortages[id] = shortage
    }
  })
  
  return {
    grandTotal,
    devmatShortage,
    screwShortage,
    equipShortages,
  }
}

const TotalSummaryView = ({ grandTotal, devmatShortage, screwShortage, equipShortages, $equips, $useitems }) => (
  <div style={{ 
    padding: '10px', 
    marginBottom: '10px', 
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  }}>
    <h5 style={{ marginTop: 0, marginBottom: '8px' }}>{__('Total Cost & Shortage')}</h5>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
      <span><MaterialIcon materialId={1} className="equip-icon" />{grandTotal.materials.fuel}</span>
      <span><MaterialIcon materialId={2} className="equip-icon" />{grandTotal.materials.ammo}</span>
      <span><MaterialIcon materialId={3} className="equip-icon" />{grandTotal.materials.steel}</span>
      <span><MaterialIcon materialId={4} className="equip-icon" />{grandTotal.materials.bauxite}</span>
      <span>
        <MaterialIcon materialId={7} className="equip-icon" />
        {grandTotal.devmat.normal}({grandTotal.devmat.sure})
        {devmatShortage > 0 && (
          <span style={{ color: '#d9534f', marginLeft: '4px', fontWeight: 'bold' }}>缺{devmatShortage}</span>
        )}
      </span>
      <span>
        <MaterialIcon materialId={8} className="equip-icon" />
        {grandTotal.screws.normal}({grandTotal.screws.sure})
        {screwShortage > 0 && (
          <span style={{ color: '#d9534f', marginLeft: '4px', fontWeight: 'bold' }}>缺{screwShortage}</span>
        )}
      </span>
    </div>
    
    {(Object.keys(grandTotal.extra.useitem || {}).length > 0 || Object.keys(grandTotal.extra.equip || {}).length > 0) && (
      <div style={{ opacity: 0.85 }}>
        <div style={{ marginBottom: '4px' }}>{__('Extra')}:</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {_(grandTotal.extra.useitem || {})
            .entries()
            .sortBy(([k]) => Number(k))
            .map(([id, count]) => (
              <div key={`useitem-${id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <UseitemIcon useitemId={Number(id)} className="equip-icon" />
                <span>{window.i18n.resources.__(_.get($useitems, [id, 'api_name'], `Useitem ${id}`))}</span>
                <span style={{ opacity: 0.85 }}>x{count}</span>
              </div>
            ))
            .value()}
          {_(grandTotal.extra.equip || {})
            .entries()
            .sortBy(([k]) => Number(k))
            .map(([id, count]) => {
              const equipId = Number(id)
              const shortage = equipShortages[equipId] || 0
              return (
                <div key={`equip-${id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SlotitemIcon slotitemId={_.get($equips, [id, 'api_type', 3], 0)} className="equip-icon" />
                  <span>{window.i18n.resources.__(_.get($equips, [id, 'api_name'], `Equip ${id}`))}</span>
                  <span style={{ opacity: 0.85 }}>
                    x{count}
                    {shortage > 0 && (
                      <span style={{ color: '#d9534f', marginLeft: '4px', fontWeight: 'bold' }}>缺{shortage}</span>
                    )}
                  </span>
                </div>
              )
            })
            .value()}
        </div>
      </div>
    )}
  </div>
)

TotalSummaryView.propTypes = {
  grandTotal: PropTypes.object.isRequired,
  devmatShortage: PropTypes.number.isRequired,
  screwShortage: PropTypes.number.isRequired,
  equipShortages: PropTypes.object.isRequired,
  $equips: PropTypes.object.isRequired,
  $useitems: PropTypes.object.isRequired,
}

const ExtraItemsTable = ({ extra, $equips, $useitems, availableEquips, currentEquipId, planData }) => {
  const useitems = _(extra.useitem || {})
    .entries()
    .sortBy(([k]) => Number(k))
    .map(([id, count]) => ({
      type: 'useitem',
      id: Number(id),
      count,
      name: _.get($useitems, [id, 'api_name'], `Useitem ${id}`),
      shortage: 0,
    }))
    .value()

  const equips = _(extra.equip || {})
    .entries()
    .sortBy(([k]) => Number(k))
    .map(([id, count]) => {
      const equipId = Number(id)
      const required = Number(count)
      
      const isSelfImprovement = equipId === currentEquipId
      
      let available = _.get(availableEquips, [equipId, 'length'], 0)
      let shortage = 0
      
      if (isSelfImprovement && planData) {
        const { owned, effective } = planData
        
        const nonZeroStarCount = owned - available
        
        const maxPlanCount = Math.max(...effective.filter((v, idx) => idx > 0))
        
        if (maxPlanCount > nonZeroStarCount) {
          const needForPlan = maxPlanCount - nonZeroStarCount
          available = Math.max(0, available - needForPlan)
        }
        
        shortage = Math.max(0, required - available)
        
        const totalNeededForPlan = Math.max(0, maxPlanCount - owned)
        if (totalNeededForPlan > 0) {
          shortage += totalNeededForPlan
        }
      } else {
        shortage = Math.max(0, required - available)
      }
      
      return {
        type: 'equip',
        id: equipId,
        count: required,
        name: _.get($equips, [id, 'api_name'], `Equip ${id}`),
        iconId: _.get($equips, [id, 'api_type', 3], 0),
        available: isSelfImprovement ? available : _.get(availableEquips, [equipId, 'length'], 0),
        shortage,
        isSelfImprovement,
      }
    })
    .value()

  const items = useitems.concat(equips)

  if (items.length === 0) {
    return <span>-</span>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {items.map((item, idx) => (
        <div key={`${item.type}-${item.id}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {item.type === 'useitem' ? (
            <UseitemIcon useitemId={item.id} className="equip-icon" />
          ) : (
            <SlotitemIcon slotitemId={item.iconId} className="equip-icon" />
          )}
          <span>{window.i18n.resources.__(item.name)}</span>
          {item.type === 'equip' && (
            <span style={{ opacity: 0.85 }}>
              ({item.available}/{item.count}
              {item.shortage > 0 && (
                <span style={{ color: '#d9534f' }}> 缺{item.shortage}</span>
              )}
              {item.isSelfImprovement && <span style={{ opacity: 0.7 }}> *</span>}
              )
            </span>
          )}
          {item.type === 'useitem' && (
            <span style={{ opacity: 0.85 }}>x{item.count}</span>
          )}
        </div>
      ))}
    </div>
  )
}

ExtraItemsTable.propTypes = {
  extra: PropTypes.object.isRequired,
  $equips: PropTypes.object.isRequired,
  $useitems: PropTypes.object.isRequired,
  availableEquips: PropTypes.object.isRequired,
  currentEquipId: PropTypes.number.isRequired,
  planData: PropTypes.object,
}

const TotalsView = ({ totals, $equips, $useitems, availableEquips, currentEquipId, planData, resources }) => {
  const devmatAvailable = _.get(resources, '[6]', 0)
  const screwAvailable = _.get(resources, '[7]', 0)
  
  const devmatRequired = totals.devmat.normal
  const screwRequired = totals.screws.normal
  
  const devmatShortage = Math.max(0, devmatRequired - devmatAvailable)
  const screwShortage = Math.max(0, screwRequired - screwAvailable)
  
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
        <span><MaterialIcon materialId={1} className="equip-icon" />{totals.materials.fuel}</span>
        <span><MaterialIcon materialId={2} className="equip-icon" />{totals.materials.ammo}</span>
        <span><MaterialIcon materialId={3} className="equip-icon" />{totals.materials.steel}</span>
        <span><MaterialIcon materialId={4} className="equip-icon" />{totals.materials.bauxite}</span>
        <span>
          <MaterialIcon materialId={7} className="equip-icon" />
          {totals.devmat.normal}({totals.devmat.sure})
          {devmatShortage > 0 && (
            <span style={{ color: '#d9534f', marginLeft: '4px' }}>缺{devmatShortage}</span>
          )}
        </span>
        <span>
          <MaterialIcon materialId={8} className="equip-icon" />
          {totals.screws.normal}({totals.screws.sure})
          {screwShortage > 0 && (
            <span style={{ color: '#d9534f', marginLeft: '4px' }}>缺{screwShortage}</span>
          )}
        </span>
      </div>
      <div style={{ opacity: 0.85 }}>
        <div style={{ marginBottom: '4px' }}>{__('Extra')}:</div>
        <ExtraItemsTable 
          extra={totals.extra} 
          $equips={$equips} 
          $useitems={$useitems} 
          availableEquips={availableEquips}
          currentEquipId={currentEquipId}
          planData={planData}
        />
      </div>
    </div>
  )
}

TotalsView.propTypes = {
  totals: PropTypes.object.isRequired,
  $equips: PropTypes.object.isRequired,
  $useitems: PropTypes.object.isRequired,
  availableEquips: PropTypes.object.isRequired,
  currentEquipId: PropTypes.number.isRequired,
  planData: PropTypes.object,
  resources: PropTypes.array.isRequired,
}

const getTodayShips = (item, chains, uniqMap, $ships) => {
  const improvement = _.get(item, 'improvement', [])
  if (!improvement || improvement.length === 0) {
    return []
  }

  const today = new Date().getDay()
  const dayIndex = today === 0 ? 6 : today - 1

  const allShips = new Set()

  improvement.forEach(imp => {
    const req = _.get(imp, 'req', [])
    req.forEach(([days, ships]) => {
      if (!ships || !Array.isArray(ships)) return
      if (days[dayIndex]) {
        ships.forEach(shipId => {
          const uniqueId = uniqMap[shipId]
          if (uniqueId) {
            const chain = chains[uniqueId] || []
            chain.forEach(id => allShips.add(id))
          } else {
            allShips.add(shipId)
          }
        })
      }
    })
  })

  return Array.from(allShips).map(id => ({
    id,
    name: _.get($ships, [id, 'api_name'], `Ship ${id}`),
  })).sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

class PlanCostWrapper extends Component {
  static propTypes = {
    mstId: PropTypes.number.isRequired,
    item: PropTypes.object.isRequired,
    planByStar: PropTypes.object.isRequired,
    levels: PropTypes.arrayOf(PropTypes.number).isRequired,
    costEntry: PropTypes.object,
    $equips: PropTypes.object.isRequired,
    $useitems: PropTypes.object.isRequired,
    availableEquips: PropTypes.object.isRequired,
    resources: PropTypes.array.isRequired,
    $ships: PropTypes.object.isRequired,
    chains: PropTypes.object.isRequired,
    uniqMap: PropTypes.object.isRequired,
  }

  static defaultProps = {
    costEntry: null,
  }

  state = { expanded: false }

  handleClick = () => {
    this.setState(prev => ({ expanded: !prev.expanded }))
  }

  render() {
    const { mstId, item, planByStar, levels, costEntry, $equips, $useitems, availableEquips, resources, $ships, chains, uniqMap } = this.props
    const owned = Array.isArray(levels) ? levels.length : 0

    const todayShips = getTodayShips(item, chains, uniqMap, $ships)
    const todayShipsText = todayShips.map(ship => window.i18n.resources.__(ship.name)).join('/')

    const planArr = Object.keys(planByStar)
      .map(k => {
        const star = parseInt(k, 10)
        const planCount = Number(planByStar[k] || 0)
        const actualCount = levels.filter(lv => lv >= star).length
        const effectivePlanCount = planCount >= 9999 ? owned : planCount
        return { star, planCount, effectivePlanCount, actualCount }
      })
      .filter(x => Number.isFinite(x.star) && x.star > 0 && x.star <= 10 && x.planCount > 0)
      .sort((a, b) => a.star - b.star)

    let currentPlan = {}
    for (let i = 0; i < planArr.length; i += 1) {
      const p = planArr[i]
      currentPlan = { star: p.star, planCount: p.planCount >= 9999 ? 10000 : p.planCount, actualCount: p.actualCount }
      if (p.effectivePlanCount > p.actualCount) break
    }

    console.log("planbystar:", planByStar, "lvels:", levels, "costentry:", costEntry)
    const calc = computePlanTotalsForEquip({ planByStar, levels, costEntry })
    console.log("calc:", calc)

    const levelStats = _(levels)
      .countBy(lv => lv)
      .entries()
      .sortBy(([lv]) => Number(lv))
      .map(([lv, count]) => ({ level: Number(lv), count }))
      .value()

    return (
      <ListGroup className="expandable" onClick={this.handleClick} style={{ marginBottom: 0 }}>
        <ListGroupItem>
          <ItemInfoRow
            key={mstId}
            id={mstId}
            icon={_.get(item, 'api_type[3]', 0)}
            name={_.get(item, 'api_name', '')}
            assistants={todayShipsText}
            currentPlan={currentPlan}
          />
        </ListGroupItem>
        <Collapse in={this.state.expanded} unmountOnExit>
          <div>
            <ListGroupItem style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
              <div style={{ opacity: 0.85, marginBottom: '6px' }}>
                {__('Owned')}: {calc.owned}
                {levelStats.length > 0 && (
                  <span style={{ marginLeft: '10px' }}>
                    ({levelStats.map(({ level, count }) => `★${level > 0 ? `+${level}` : level}×${count}`).join(', ')})
                  </span>
                )}
              </div>
              {planArr.length > 0 && (
                <div style={{ marginBottom: '8px' }}>
                  {planArr.map(p => (
                    <div key={`${mstId}-${p.star}`} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <div style={{ width: '80px' }}>{`★+${p.star}`}</div>
                      <div style={{ width: '110px' }}>{p.actualCount}/{p.planCount < 9999 ? p.planCount : '∞'}</div>
                      {p.planCount >= 9999 && (
                        <div style={{ opacity: 0.85 }}>{__('Owned')}={owned}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!costEntry && (
                <div style={{ opacity: 0.85 }}>
                  {__('No improvement cost data.')}
                </div>
              )}
              {costEntry && (
                <TotalsView 
                  totals={calc.totals} 
                  $equips={$equips} 
                  $useitems={$useitems} 
                  availableEquips={availableEquips}
                  currentEquipId={mstId}
                  planData={calc}
                  resources={resources}
                />
              )}
            </ListGroupItem>
          </div>
        </Collapse>
      </ListGroup>
    )
  }
}

const CostArea = connect(state => {
  const plans = starCraftPlanSelector(state)
  const data = improvementDataSelector(state)
  const levelsById = equipLevelStatSelector(state)
  const $const = constSelector(state) || {}
  const availableEquips = equipAvailableSelector(state)
  const resources = _.get(state, 'info.resources', [])
  const chains = adjustedRemodelChainsSelector(state)
  const uniqMap = shipUniqueMapSelector(state)
  return {
    plans,
    data,
    levelsById,
    $equips: $const.$equips || {},
    $useitems: $const.$useitems || {},
    $ships: $const.$ships || {},
    availableEquips,
    resources,
    chains,
    uniqMap,
  }
})(class CostArea extends Component {
  static propTypes = {
    plans: PropTypes.object.isRequired,
    data: PropTypes.array.isRequired,
    levelsById: PropTypes.object.isRequired,
    $equips: PropTypes.object.isRequired,
    $useitems: PropTypes.object.isRequired,
    $ships: PropTypes.object.isRequired,
    availableEquips: PropTypes.object.isRequired,
    resources: PropTypes.array.isRequired,
    chains: PropTypes.object.isRequired,
    uniqMap: PropTypes.object.isRequired,
  }

  render() {
    const { plans, data, levelsById, $equips, $useitems, $ships, availableEquips, resources, chains, uniqMap } = this.props
    const costIndex = buildEquipImprovementCostIndex(data)

    const dataById = _(data)
      .filter(x => x && typeof x.id === 'number')
      .keyBy(x => x.id)
      .value()


    console.log("plans",plans)

    const equipIds = Object.keys(plans)
      .map(k => Number(k))
      .filter(Number.isFinite)
      .filter(id => {
        const p = plans[id]
        return p && Object.keys(p).some(star => Number(p[star] || 0) > 0)
      })
      .sort((a, b) => a - b)

    const allCalcs = equipIds.map(mstId => {
      const levels = levelsById[mstId] || []
      const planByStar = plans[mstId] || {}
      const costEntry = (costIndex[mstId] || [])[0] || null
      const calc = computePlanTotalsForEquip({ planByStar, levels, costEntry })
      return { mstId, calc }
    })

    const { grandTotal, devmatShortage, screwShortage, equipShortages } = 
      calculateTotalShortages(allCalcs, availableEquips, resources)

    return (
      <div id="cost-root" style={{ margin: '5px 10px 5px 5px' }}>
        <h4 style={{ marginTop: 0 }}>{__('Cost')}</h4>
        {equipIds.length === 0 && (
          <div>{__('No equipment plans.')}</div>
        )}
        {equipIds.length > 0 && (
          <>
            <TotalSummaryView 
              grandTotal={grandTotal}
              devmatShortage={devmatShortage}
              screwShortage={screwShortage}
              equipShortages={equipShortages}
              $equips={$equips}
              $useitems={$useitems}
            />
            <ListGroup style={{ marginBottom: 0 }}>
              {equipIds.map(mstId => {
                const levels = levelsById[mstId] || []
                const planByStar = plans[mstId] || {}
                const costEntry = (costIndex[mstId] || [])[0] || null
                const item = dataById[mstId] || {}

                return (
                  <ListGroupItem key={mstId} style={{ padding: 0 }}>
                    <PlanCostWrapper
                      mstId={mstId}
                      item={item}
                      planByStar={planByStar}
                      levels={levels}
                      costEntry={costEntry}
                      $equips={$equips}
                      $useitems={$useitems}
                      availableEquips={availableEquips}
                      resources={resources}
                      $ships={$ships}
                      chains={chains}
                      uniqMap={uniqMap}
                    />
                  </ListGroupItem>
                )
              })}
            </ListGroup>
          </>
        )}
      </div>
    )
  }
})

export { CostArea }
