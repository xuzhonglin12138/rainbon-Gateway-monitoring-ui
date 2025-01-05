import React, { Component } from 'react'
import { Menu } from 'antd';
import Usage from '../../components/Usage'
import Bill from '../../components/Bill'
import Standard from '../../components/Standard'
import Recharge from '../../components/Recharge'
import styles from './index.less'


export default class index extends Component {
  constructor(props) {
    super(props)
    this.state = {
      activeKey: 'recharge',
    }
  }

  handleClick = (e) => {
    this.setState({
      activeKey: e.key,
    })
  }

  render() {
    const { activeKey } = this.state
    const items = [
      {
        label: '账户充值',
        key: 'recharge',
      },
      {
        label: '账单明细',
        key: 'bill',
      },
      {
        label: '计费标准',
        key: 'standard',
      },
      {
        label: '用量明细',
        key: 'usage',
      },
    ]
    return (
      <div className={styles.container}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarItem}>
            <Menu
              selectedKeys={[activeKey]}
              mode="inline"
              items={items}
              onClick={this.handleClick}
            />
          </div>
        </div>
        <div className={styles.content}>
          {activeKey === 'bill' && <Bill {...this.props} />}
          {activeKey === 'standard' && <Standard {...this.props} />}
          {activeKey === 'usage' && <Usage {...this.props} />}
          {activeKey === 'recharge' && <Recharge {...this.props} />}
        </div>
      </div>
    )
  }
}
