import React, { Component } from 'react'
import PropTypes from 'prop-types'
import FontAwesome from 'react-fontawesome'
import {
  Button,
  FormControl,
} from 'react-bootstrap'

import { addNewEquipPlan } from './utils'

const { __ } = window.i18n['poi-plugin-item-improvement2']

class AddNewEquipView extends Component {
    static propTypes = {
        equips: PropTypes.arrayOf(
            PropTypes.shape({
                id: PropTypes.number.isRequired,
                name: PropTypes.string.isRequired,
                iconId: PropTypes.number.isRequired,
            })
        ).isRequired,
    }

    state = {
        selected: null,
    }

    handleChange = e => {
        this.setState({ selected: e.target.value || null })
    }

    handleAddNewEquip = () => {
        const { selected } = this.state;
        if (!selected) return;

        // 调用新 utils
        addNewEquipPlan(selected);
    }

    render() {
        const { equips } = this.props
        const { selected } = this.state

        return (
            <div style={{ display: 'flex', margin: '5px', fontSize: '12px', alignItems: 'center' }}>
                <FontAwesome style={{ marginRight: '10px' }} name="plus" />
                <FormControl
                    componentClass="select"
                    style={{ marginRight: '10px', fontSize: '14px' }}
                    value={selected || ''}
                    onChange={this.handleChange}
                >
                    <option value="">{__('New equipment plan')}</option>
                    {equips.map(equip => (
                        <option key={equip.id} value={equip.id}>
                            {`${equip.id}: ${equip.name}`}
                        </option>
                    ))}
                </FormControl>
                <Button disabled={!selected} onClick={this.handleAddNewEquip} bsStyle="primary">
                    {__('Add')}
                </Button>
            </div>
        )
    }
}

export { AddNewEquipView }
