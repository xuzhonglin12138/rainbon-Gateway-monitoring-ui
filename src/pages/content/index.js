import React, { Component } from 'react'
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
    return (
      <div className={styles.container}>
       {/* 主页面 */}
      </div>
    )
  }
}
