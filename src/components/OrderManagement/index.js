import React, { Component } from 'react';
import { DatePicker, Button, Table, Tag, Select, notification, Row, Col } from 'antd';
import moment from 'moment';
import { getAllRechargeList, getRechargeDetail } from '@/api';
import RechargeModal from '@/components/RechargeModal';
import styles from './index.less';

const { RangePicker } = DatePicker;

export default class OrderManagement extends Component {
  constructor(props) {
    super(props)
    this.state = {
      rechargeList: [],
      rechargeLoading: false,
      rechargeTotal: 0,
      rechargePage: 1,
      rechargePageSize: 5,
      rechargeDetail: {},
      rechargeModalVisible: false,
      dateRange: [],
      rechargeSearchText: '',
    }
  }
  componentDidMount() {
    this.fetchRechargeList();
  }
  handleRechargeModalClose = () => {
    this.setState({ rechargeModalVisible: false });
  };
  handleRechargeSearch = () => {
    this.setState({ rechargePage: 1 }, () => {
      this.fetchRechargeList();
    });
  };
  fetchRechargeList = () => {
    this.setState({ rechargeLoading: true });
    const { dateRange, rechargeSearchText, rechargePage, rechargePageSize } = this.state;
    const params = {
      start_time: dateRange[0] ? moment(dateRange[0]).format('YYYY-MM-DD HH:mm:ss') : '',
      end_time: dateRange[1] ? moment(dateRange[1]).format('YYYY-MM-DD HH:mm:ss') : '',
      status: rechargeSearchText || '',
      page: rechargePage || 1,
      page_size: rechargePageSize || 5,
    }
    getAllRechargeList(params).then(res => {
      console.log(res);
      this.setState({ rechargeList: res.data.data, rechargeTotal: res.data.total, rechargeLoading: false });
    }).catch(err => {
      notification.error({
        message: '获取充值订单列表失败',
        description: err.message
      });
      this.setState({ rechargeLoading: false, rechargeList: [], rechargeTotal: 0 });
    });
  }
  showRechargeDetails = (record) => {
    getRechargeDetail({ order_no: record.order_no }).then(res => {
      this.setState({
        rechargeDetail: res.data,
        rechargeModalVisible: true,
      });
    }).catch(err => {
      notification.error({
        message: '获取充值订单详情失败',
        description: err.message
      });
    });
  }
  handleRechargeStatusChange = (value) => {
    this.setState({ rechargeSearchText: value });
  };

  onDateChange = (dates) => {
    if (!dates || dates.length === 0) {
      this.setState({ dateRange: [], dateValue: [] });
    } else {
      const formattedDates = dates.map(date => date.format('YYYY-MM-DD HH:mm:ss'));
      this.setState({ dateRange: formattedDates, dateValue: dates });
    }
  };
  handleRechargeReset = () => {
    this.setState({
      dateRange: [],
      dateValue: [],
      rechargeSearchText: '',
      rechargePage: 1
    }, () => {
      this.fetchRechargeList();
    });
  };
  render() {
    const rechargeStatusOptions = [
      { value: '', label: '所有状态' },
      { value: 'SUCCESS', label: '支付成功' },
      { value: 'REFUND', label: '转入退款' },
      { value: 'NOTPAY', label: '未支付' },
      { value: 'CLOSED', label: '已关闭' },
    ];
    const columns = [
      {
        title: '订单号',
        dataIndex: 'order_no',
        key: 'order_no',
      },
      {
        title: '充值用户',
        dataIndex: 'user_name',
        key: 'user_name',
      },
      {
        title: '交易时间',
        dataIndex: 'pay_time',
        key: 'pay_time',
        render: (text) => {
          if (text) {
            return moment(text).format('YYYY-MM-DD HH:mm:ss');
          }
          return '-';
        },
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        // SUCCESS：支付成功 REFUND：转入退款 NOTPAY：未支付 CLOSED：已关闭 
        render: (text) => {
          let color = '';
          let statusText = '';
          switch (text) {
            case 'SUCCESS':
              color = 'green';
              statusText = '成功';
              break;
            case 'REFUND':
              color = 'orange';
              statusText = '转入退款';
              break;
            case 'NOTPAY':
              color = 'red';
              statusText = '未支付';
              break;
            default:
              color = 'gray';
              statusText = '已关闭';
          }
          return <Tag color={color}>{statusText}</Tag>;
        },
      },
      {
        title: '总金额 (¥)',
        dataIndex: 'amount',
        key: 'amount',
        render: (amount) => (
          <span>
            ¥{amount / 100}
          </span>
        ),
      },
      {
        title: '操作',
        key: 'action',
        render: (_, record) => (
          <a onClick={() => this.showRechargeDetails(record)}>详情</a>
        ),
      },
    ];


    return (
      <div className={styles.container}>
        <div className={styles.searchBar}>
          <Row style={{ marginBottom: 20 }}>
            <Col span={8}>
              <RangePicker
                value={this.state.dateValue}
                showTime
                format="YYYY/MM/DD HH:mm:ss"
                onChange={this.onDateChange}
              />
            </Col>
            <Col span={8}>
              <Select
                style={{ width: 200 }}
                placeholder="选择状态"
                value={this.state.rechargeSearchText}
                onChange={this.handleRechargeStatusChange}
                options={rechargeStatusOptions}
              />
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <Button type="primary" onClick={this.handleRechargeSearch} style={{ marginRight: 10 }}>搜索</Button>
              <Button onClick={this.handleRechargeReset}>重置</Button>
            </Col>
          </Row>
        </div>
        <Table
          loading={this.state.rechargeLoading}
          columns={columns}
          dataSource={this.state.rechargeList}
          rowKey="order_no"
          pagination={{
            current: this.state.rechargePage,
            total: this.state.rechargeTotal,
            pageSize: this.state.rechargePageSize,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => {
              this.setState({
                rechargePage: page,
                rechargePageSize: pageSize,
              }, this.fetchRechargeList);
            },
            onShowSizeChange: (current, size) => {
              this.setState({
                rechargePage: 1,
                rechargePageSize: size,
              }, this.fetchRechargeList);
            },
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50', '100'],
            showQuickJumper: true,
            hideOnSinglePage: this.state.rechargeTotal <= 5
          }}

        />
        <RechargeModal
          visible={this.state.rechargeModalVisible}
          onClose={this.handleRechargeModalClose}
          orderDetails={this.state.rechargeDetail}
        />
      </div>
    );
  }
}