import React, { Component } from 'react';
import { DatePicker, Input, Button, Table } from 'antd';
import styles from './index.less';

const { RangePicker } = DatePicker;

export default class OrderManagement extends Component {
  render() {
    const columns = [
      {
        title: '订单号',
        dataIndex: 'orderNumber',
        key: 'orderNumber',
      },
      {
        title: '账号',
        dataIndex: 'account',
        key: 'account',
      },
      {
        title: '交易时间',
        dataIndex: 'transactionTime',
        key: 'transactionTime',
      },
      {
        title: '总金额 (¥)',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
      },
    ];

    const data = [
      // 在这里可以插入订单数据
    ];

    return (
      <div className={styles.container}>
        <div className={styles.searchBar}>
          <RangePicker className={styles.rangePicker} />
          <Input placeholder="订单号" className={styles.input} />
          <Button type="primary" className={styles.searchButton}>搜索</Button>
        </div>
        <Table columns={columns} dataSource={data} rowKey="orderNumber" />
        <div className={styles.totalAmount}>
          总额度：¥0.00
        </div>
      </div>
    );
  }
}