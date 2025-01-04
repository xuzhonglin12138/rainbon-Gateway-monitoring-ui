import React from 'react';
import { DatePicker, Input, Button, Table } from 'antd';
import styles from  './index.less';

const { RangePicker } = DatePicker;

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
    title: 'CPU',
    dataIndex: 'cpu',
    key: 'cpu',
  },
  {
    title: '内存',
    dataIndex: 'memory',
    key: 'memory',
  },
  {
    title: '磁盘',
    dataIndex: 'disk',
    key: 'disk',
  },
  {
    title: '网络',
    dataIndex: 'network',
    key: 'network',
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
  },
];

const data = []; // 这里可以填入实际数据

const ExpenseStatement = () => {
  return (
    <div className={styles.container}>
      <div className={styles.searchBar}>
        <RangePicker className={styles.rangePicker} />
        <Input placeholder="订单号" className={styles.input} />
        <Button type="primary" className={styles.searchButton}>搜索</Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="number" />
      <div className={styles.totalAmount}>总额度：¥0.00</div>
    </div>
  );
};

export default ExpenseStatement;
