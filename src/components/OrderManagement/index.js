import React, { Component } from 'react';
import { DatePicker, Button, Table, Tag, Select, notification, Row, Col } from 'antd';
import dayjs from 'dayjs';
import { getAllRechargeList, getRechargeDetail } from '@/api';
import RechargeModal from '@/components/RechargeModal';
import styles from './index.less';

const { RangePicker } = DatePicker;

export default class OrderManagement extends Component {
  constructor(props) {
    super(props)
    const endDate = dayjs();
    const startDate = dayjs().subtract(7, 'days');
    this.state = {
      rechargeList: [],
      rechargeLoading: false,
      rechargeTotal: 0,
      totalAmount: 0,
      rechargePage: 1,
      rechargePageSize: 20,
      rechargeDetail: {},
      rechargeModalVisible: false,
      dateRange: [startDate, endDate],
      rechargeSearchText: '',
      payMethod: '',
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
    const { dateRange, rechargeSearchText, rechargePage, rechargePageSize, payMethod } = this.state;
    const params = {
      start_time: dateRange[0] ? dateRange[0].format('YYYY-MM-DD HH:mm:ss') : '',
      end_time: dateRange[1] ? dateRange[1].format('YYYY-MM-DD HH:mm:ss') : '',
      status: rechargeSearchText || '',
      page: rechargePage || 1,
      page_size: rechargePageSize || 20,
      pay_method: payMethod || ''
    }
    getAllRechargeList(params).then(res => {
      console.log(res);
      this.setState({ 
        rechargeList: res.data.data, 
        rechargeTotal: res.data.total, 
        totalAmount: res.data.total_amount || 0,
        rechargeLoading: false 
      });
    }).catch(err => {
      notification.error({
        message: '获取充值订单列表失败',
        description: err.message
      });
      this.setState({ rechargeLoading: false, rechargeList: [], rechargeTotal: 0, totalAmount: 0 });
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
    this.setState({ dateRange: dates || [] });
  };
  handlePayMethodChange = (value) => {
    this.setState({ payMethod: value });
  };

  handleRechargeReset = () => {
    const endDate = dayjs();
    const startDate = dayjs().subtract(7, 'days');
    this.setState({
      dateRange: [startDate, endDate],
      rechargeSearchText: '',
      payMethod: '',
      rechargePage: 1
    }, () => {
      this.fetchRechargeList();
    });
  };
  render() {
    const { totalAmount } = this.state;
    const rechargeStatusOptions = [
      { value: '', label: '所有状态' },
      { value: 'SUCCESS', label: '支付成功' },
      { value: 'REFUND', label: '转入退款' },
      { value: 'NOTPAY', label: '未支付' },
      { value: 'CLOSED', label: '已关闭' },
    ];

    const payMethodOptions = [
      { value: '', label: '所有方式' },
      { value: 'Manual', label: '后台充值' },
      { value: 'WeChat', label: '微信支付' },
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
            return dayjs(text).format('YYYY-MM-DD HH:mm:ss');
          }
          return '-';
        },
      },
      {
        title: '充值方式',
        dataIndex: 'pay_method',
        key: 'pay_method',
        render: (text) => {
          return <Tag>{text == 'Manual' ? '后台充值' : '微信支付'}</Tag>;
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
        title: '总金额',
        dataIndex: 'amount',
        key: 'amount',
        render: (amount) => (
          <span>
            ¥{amount / 1000000}
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

    console.log(this.state.dateRange, 'dateRange')
    return (
      <div className={styles.container}>
        <div className={styles.searchBar}>
          <Row style={{ marginBottom: 20 }}>
            <Col span={8}>
              <RangePicker
                value={this.state.dateRange}
                format="YYYY-MM-DD"
                onChange={this.onDateChange}
                allowClear={false}
              />
            </Col>
            <Col span={8}>
              <Select
                style={{ width: 120, marginLeft: 10 }}
                placeholder="选择状态"
                value={this.state.rechargeSearchText}
                onChange={this.handleRechargeStatusChange}
                options={rechargeStatusOptions}
              />
              <Select
                style={{ width: 120, marginLeft: 10 }}
                placeholder="充值方式"
                value={this.state.payMethod}
                onChange={this.handlePayMethodChange}
                options={payMethodOptions}
              />
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <span style={{ marginRight: 16, fontSize: 14 }}>
                总金额：<span style={{ fontWeight: 600, fontSize: 16 }}>¥{(totalAmount / 1000000).toFixed(2)}</span>
              </span>
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