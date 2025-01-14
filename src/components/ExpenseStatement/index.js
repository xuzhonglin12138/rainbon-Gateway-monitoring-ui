import React, { Component } from 'react'
import { DatePicker, Button, Table, Row, Col, notification, Select } from 'antd';
import { getDailyBillList } from '@/api';
import moment from 'moment';
import styles from './index.less'

const { RangePicker } = DatePicker;


export default class index extends Component {
  constructor(props) {
    super(props)
    const { baseInfo } = props || {};
    this.state = {
      dateValue: [],
      expenseLoading: false,
      expenseList: [],
      expensePage: 1,
      expensePageSize: 5,
      expenseTotal: 0,
      dateRange: [],
      expenseSearchText: '',
      namespaceList: [],
      namespace: '',
      cluster_info: baseInfo?.cluster_info || {},
    }
  }
  componentDidMount() {
    this.fetchExpenseList();
  }
  fetchExpenseList = () => {
    this.setState({ expenseLoading: true });
    const { dateRange, expensePage, expensePageSize, namespace } = this.state;
    getDailyBillList({
      start_time: dateRange[0] ? moment(dateRange[0]).format('YYYY-MM-DD') : '',
      end_time: dateRange[1] ? moment(dateRange[1]).format('YYYY-MM-DD') : '',
      page: expensePage || 1,
      namespace: namespace || '',
      page_size: expensePageSize || 5,
    }).then(res => {
      this.setState({ expenseList: res.data.bills, expenseTotal: res.data.total, expenseLoading: false });
    }).catch(err => {
      notification.error({
        message: '获取费用账单失败',
        description: err.message,
      });
      this.setState({ expenseLoading: false });
    });
  }
  onDateChange = (dates) => {
    if (!dates || dates.length === 0) {
      this.setState({ dateRange: [], dateValue: [] });
    } else {
      const formattedDates = dates.map(date => date.format('YYYY-MM-DD'));
      this.setState({ dateRange: formattedDates, dateValue: dates });
    }
  };
  handleExpenseSearch = () => {
    this.setState({ expensePage: 1 }, () => {
      this.fetchExpenseList();
    });
  };
  handleExpenseReset = () => {
    this.setState({
      dateRange: [],
      dateValue: [],
      expensePage: 1,
      namespace: 'all',
    }, () => {
      this.fetchExpenseList();
    });
  };
  onNamespaceChange = (value) => {
    this.setState({ namespace: value });
  };

  render() {
    const columns = [
      {
        title: '订单号',
        dataIndex: 'order_no',
        key: 'order_no',
      },
      {
        title: '命名空间',
        dataIndex: 'namespace',
        key: 'namespace',
      },
      {
        title: '账单日期',
        dataIndex: 'bill_date',
        key: 'bill_date',
        render: (text) => moment(text).format('YYYY-MM-DD'),
      },
      {
        title: 'CPU',
        dataIndex: 'cpu_usage',
        key: 'cpu_usage',
      },
      {
        title: '内存',
        dataIndex: 'memory_usage',
        key: 'memory_usage',
      },
      {
        title: '存储',
        dataIndex: 'storage_usage',
        key: 'storage_usage',
      },
      {
        title: '网络',
        dataIndex: 'network_usage',
        key: 'network_usage',
      },
      {
        title: '总金额',
        dataIndex: 'total_cost',
        key: 'total_cost',
      },
    ]
    const { cluster_info } = this.state;
    const items = []
    if (cluster_info.length > 0) {
      cluster_info.forEach((item) => {
        items.push({
          label: item.region_alias,
          value: item.region_name,
        })
      })
    }
    items.unshift({
      label: '所有集群',
      value: '',
    })
    return (
      <div>
        <div className={styles.container}>
          <div className={styles.searchBar}>
            <Row style={{ marginBottom: 20 }}>
              <Col span={6}>
                <RangePicker
                  value={this.state.dateValue}
                  format="YYYY/MM/DD"
                  onChange={this.onDateChange}
                />
              </Col>
              <Col span={10}>
                <Select
                  style={{ width: 200, marginLeft: 10 }}
                  placeholder="选择集群"
                  value={this.state.namespace}
                  onChange={this.onNamespaceChange}
                  options={items}
                />
              </Col>
              <Col span={8} style={{ textAlign: 'right' }}>
                <Button type="primary" onClick={this.handleExpenseSearch} style={{ marginRight: 10 }}>搜索</Button>
                <Button onClick={this.handleExpenseReset}>重置</Button>
              </Col>
            </Row>
          </div>
          <Table
            loading={this.state.expenseLoading}
            columns={columns}
            dataSource={this.state.expenseList}
            rowKey="order_no"
            pagination={{
              current: this.state.expensePage,
              total: this.state.expenseTotal,
              pageSize: this.state.expensePageSize,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                this.setState({
                  expensePage: page,
                  expensePageSize: pageSize,
                }, this.fetchExpenseList);
              },
              onShowSizeChange: (current, size) => {
                this.setState({
                  expensePage: 1,
                  expensePageSize: size,
                }, this.fetchExpenseList);
              },
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20', '50', '100'],
              showQuickJumper: true,
              hideOnSinglePage: this.state.expenseTotal <= 5
            }}

          />
        </div>
      </div>
    )
  }
}
