import React, { Component } from 'react'
import { Menu } from 'antd';
import OrderManagement from '@/components/OrderManagement'
import ExpenseStatement from '@/components/ExpenseStatement'
import CostSetting from '@/components/CostSetting'
import styles from './index.less'


export default class index extends Component {
  constructor(props) {
    super(props)
    this.state = {
      activeKey: 'orderManagement',
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
        label: '订单管理',
        key: 'orderManagement',
      },
      {
        label: '费用账单',
        key: 'expenseStatement',
      },
      {
        label: '成本设置',
        key: 'costSetting',
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
          {activeKey === 'orderManagement' && <OrderManagement {...this.props} />}
          {activeKey === 'expenseStatement' && <ExpenseStatement {...this.props} />}
          {activeKey === 'costSetting' && <CostSetting {...this.props} />}
        </div>
      </div>
    )
  }
}
