import React, { Component } from 'react'

import styles from './index.less'


export default class index extends Component {
  constructor(props) {
    super(props)
    this.state = {
      activeKey: 'recharge',
    }
  }

  componentDidMount() {
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
        {/* 副页面 */}
      </div>
    )
  }
}
