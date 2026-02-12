import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Nav, NavItem, Col, Grid } from 'react-bootstrap'
import _ from 'lodash'
import fp from 'lodash/fp'
import { join } from 'path-extra'

import { ItemWrapper } from './item-wrapper'
import { StarcraftArea } from './starcraft/starcraft-area'
import {
  improvementDataSelector,
  improveItemIdsByDaySelector, starCraftPlanSelector,
} from './selectors'

const { __ } = window.i18n['poi-plugin-item-improvement2']

const getJSTDayofWeek = () => {
  const date = new Date()
  let day = date.getUTCDay()
  if (date.getUTCHours() >= 15) {
    day = (day + 1) % 7
  }
  return day
}

export const ItemInfoArea = connect(state => ({
  plans: starCraftPlanSelector(state),
  data: improvementDataSelector(state),
  idByDay: improveItemIdsByDaySelector(state),
  $equips: _.get(state, 'const.$ships', {}),
}))(class itemInfoArea extends Component {
  static propTypes = {
    plans: PropTypes.object.isRequired,
    $equips: PropTypes.object.isRequired,
    idByDay: PropTypes.objectOf(PropTypes.array).isRequired,
    data: PropTypes.objectOf(PropTypes.object).isRequired,
  }

  state = {
    day: getJSTDayofWeek(),
  }

  handleKeyChange = key => {
    this.setState({
      day: key,
    })
  }

  getRows = day => {
    const { data, idByDay } = this.props
    return fp.flow(
      fp.filter(row => day === -1 || (idByDay[day] || []).includes(row.id)),
      fp.sortBy([
        row => -row.priority,
        row => row.api_type[2],
        row => row.api_type[3],
        row => row.api_name,
      ]),
    )(data)
  }

  render() {
    const { day } = this.state
    const { plans, $equips } = this.props

    return (
      <div id="item-improvement">
        <div className="flex-column">
          <link rel="stylesheet" href={join(__dirname, '..', 'assets', 'main.css')} />
          <Grid className="vertical-center" style={{ minHeight: 45 }}>
            <Col xs={12} style={{ padding: 0 }}>
              <Nav className="main-nav" bsStyle="pills" activeKey={this.state.day} onSelect={this.handleKeyChange}>
                <NavItem eventKey={0}>{__('Sunday')}</NavItem>
                <NavItem eventKey={1}>{__('Monday')}</NavItem>
                <NavItem eventKey={2}>{__('Tuesday')}</NavItem>
                <NavItem eventKey={3}>{__('Wednesday')}</NavItem>
                <NavItem eventKey={4}>{__('Thursday')}</NavItem>
                <NavItem eventKey={5}>{__('Friday')}</NavItem>
                <NavItem eventKey={6}>{__('Saturday')}</NavItem>
                <NavItem eventKey={-1}>{__('All')}</NavItem>
                <NavItem eventKey={10}>{__('Starcraft')}</NavItem>
              </Nav>
            </Col>
          </Grid>
          <Grid className="list-container">
            {
              this.state.day < 7 ?
              this.getRows(this.state.day).map((row, index) => (
                <ItemWrapper
                  index={index}
                  row={row}
                  key={row.id}
                  day={day}
                  plans={plans}
                  $equips={$equips} />
              )) :
              <StarcraftArea />
            }
          </Grid>
        </div>
      </div>
    )
  }
})
