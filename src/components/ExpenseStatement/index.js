import React, { Component } from 'react'
import { DatePicker, Button, Table, Row, Col, notification, Select } from 'antd';
import { getDailyBillList } from '@/api';
import dayjs from 'dayjs';
import styles from './index.less'

const { RangePicker } = DatePicker;

export default class index extends Component {
  constructor(props) {
    super(props)
    const { baseInfo } = props || {};
    const endDate = dayjs();
    const startDate = dayjs().subtract(7, 'days');
    this.state = {
      dateRange: [startDate, endDate],
      expenseLoading: false,
      expenseList: [],
      expensePage: 1,
      expensePageSize: 5,
      expenseTotal: 0,
      region: '',
      userId: '',
      cluster_info: baseInfo?.cluster_info || [],
      userList: [],
      loading: true,
    }
  }
  componentDidMount() {
    this.fetchExpenseList();
    this.loadUser();
  }
  loadUser = () => {
    const {
      dispatch,
      baseInfo: {
        currentUser
      }
    } = this.props;
    dispatch({
      type: 'global/fetchEnterpriseUsers',
      payload: {
        enterprise_id: currentUser.enterprise_id,
        page: 1,
        page_size: 1000,
        name: '',
      },
      callback: res => {
        if (res) {
          this.setState({ userList: res.list, loading: false });
        }
      }
    });
  };
  fetchExpenseList = () => {
    this.setState({ expenseLoading: true });
    const { dateRange, expensePage, expensePageSize, region, userId } = this.state;
    getDailyBillList({
      start_time: dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : '',
      end_time: dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : '',
      page: expensePage || 1,
      region_name: region || '',
      user_id: userId || '',
      page_size: expensePageSize || 5,
    }).then(res => {
      this.setState({
        expenseList: res.data.bills,
        expenseTotal: res.data.total,
        expenseLoading: false
      });
    }).catch(err => {
      notification.error({
        message: '获取费用账单失败',
        description: err.message,
      });
      this.setState({ expenseLoading: false });
    });
  }
  onDateChange = (dates) => {
    this.setState({ dateRange: dates || [] });
  };
  handleExpenseSearch = () => {
    this.setState({ expensePage: 1 }, () => {
      this.fetchExpenseList();
    });
  };
  handleExpenseReset = () => {
    const endDate = dayjs();
    const startDate = dayjs().subtract(7, 'days');
    this.setState({
      dateRange: [startDate, endDate],
      region: '',
      userId: '',
      expensePage: 1,
    }, () => {
      this.fetchExpenseList();
    });
  };
  onRegionChange = (value) => {
    this.setState({ region: value });
  };
  onUserChange = (value) => {
    this.setState({ userId: value });
  };

  render() {
    const columns = [
      {
        title: '订单号',
        dataIndex: 'order_no',
        key: 'order_no',
      },
      {
        title: '用户名',
        dataIndex: 'username',
        key: 'username',
      },
      {
        title: '集群名称',
        dataIndex: 'region_name',
        key: 'region_name',
      },
      {
        title: '账单日期',
        dataIndex: 'bill_date',
        key: 'bill_date',
        render: (text) => dayjs(text).format('YYYY-MM-DD'),
      },
      {
        title: 'CPU',
        dataIndex: 'cpu_cost',
        key: 'cpu_cost',
        render: (text) => <span>¥{(text / 100).toFixed(2)}</span>, 
      },
      {
        title: '内存',
        dataIndex: 'memory_cost',
        key: 'memory_cost',
        render: (text) => <span>¥{(text / 100).toFixed(2)}</span>,
      },
      {
        title: '存储',
        dataIndex: 'storage_cost',
        key: 'storage_cost',
        render: (text) => <span>¥{(text / 100).toFixed(2)}</span>,
      },
      {
        title: '网络',
        dataIndex: 'network_cost',
        key: 'network_cost',
        render: (text) => <span>¥{(text / 100).toFixed(2)}</span>,
      },
      {
        title: '总金额',
        dataIndex: 'total_cost',
        key: 'total_cost',
        render: (text) => <span>¥{(text / 100).toFixed(2)}</span>,
      },
    ]
    const { cluster_info, userList } = this.state;
    const regionOptions = [
      { label: '所有集群', value: '' },
      ...(cluster_info || []).map(item => ({
        label: item.region_alias,
        value: item.region_name
      }))
    ];
    const userOptions = [
      { label: '所有用户', value: '' },
      ...(userList || []).map(item => ({
        label: item.nick_name,
        value: item.user_id
      }))
    ];
    return (
      <div>
        <div className={styles.container}>
          <div className={styles.searchBar}>
            <Row style={{ marginBottom: 20 }}>
              <Col span={6}>
                <RangePicker
                  value={this.state.dateRange}
                  format="YYYY-MM-DD"
                  onChange={this.onDateChange}
                  allowClear={false}
                />
              </Col>
              <Col span={6}>
                <Select
                  style={{ width: 200, marginLeft: 10 }}
                  placeholder="选择集群"
                  value={this.state.region}
                  onChange={this.onRegionChange}
                  options={regionOptions}
                />
              </Col>
              <Col span={6}>
                <Select
                  loading={this.state.loading}
                  style={{ width: 200, marginLeft: 10 }}
                  placeholder="选择用户"
                  value={this.state.userId}
                  onChange={this.onUserChange}
                  options={userOptions}
                />
              </Col>
              <Col span={6} style={{ textAlign: 'right' }}>
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
