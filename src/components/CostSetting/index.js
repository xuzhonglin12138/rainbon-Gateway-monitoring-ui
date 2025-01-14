import React, { Component } from 'react'
import { Tabs } from 'antd'
import SettingFrom from './settingFrom'

export default class index extends Component {
  constructor(props) {
    super(props);
    const { baseInfo } = props || {};
    this.state = {
      cluster_info: baseInfo?.cluster_info || {},
    }
  }
  render() {
    const items = []
    const { cluster_info } = this.state;
    (cluster_info || []).forEach((item) => {
      items.push({
        label: item.region_alias,
        key: item.region_name,
        children: <SettingFrom {...this.props} regionName={item.region_name} />,
      })
    })
    return (
      <>
        <Tabs items={items} />
      </>
    )
  }
}
