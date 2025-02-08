import React, { Component } from 'react';
import {
  Typography,
  Tabs,
  Table,
  DatePicker,
  Select,
  Button,
  notification,
  Tag
} from 'antd';
import {
  getAppCostSummary,
  getBillDetails,
  getRechargeList,
  getRechargeDetail,
} from '@/api';
import styles from './index.less';
import dayjs from 'dayjs';
import DetailModal from '@/components/DetailModal';
import RechargeModal from '@/components/RechargeModal';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default class Recharge extends Component {
  constructor(props) {
    super(props);
    const endDate = dayjs();
    const startDate = dayjs().subtract(7, 'days');
    
    this.state = {
      activeKey: 'expense',
      expenseList: [],
      rechargeList: [],
      dateRange: [startDate, endDate],
      selectedProject: '',
      rechargeSearchText: '',
      expensePage: 1,
      expensePageSize: 5,
      expenseTotal: 0,
      rechargePage: 1,
      rechargePageSize: 5,
      rechargeTotal: 0,
      expenseLoading: false,
      modalVisible: false,
      detailData: {},
    };
  }

  componentDidMount() {
    const { activeKey } = this.state;
    if (activeKey === 'expense') {
      this.fetchExpenseList(true);
    } else {
      this.fetchRechargeList();
    }
  }
  fetchRechargeList = () => {
    this.setState({ rechargeLoading: true });
    const { dateRange, rechargeSearchText, rechargePage, rechargePageSize } = this.state;
    const params = {
      start_time: dateRange[0] ? dateRange[0].format('YYYY-MM-DD HH:mm:ss') : '',
      end_time: dateRange[1] ? dateRange[1].format('YYYY-MM-DD HH:mm:ss') : '',
      status: rechargeSearchText || '',
      page: rechargePage || 1,
      page_size: rechargePageSize || 10,
    }
    getRechargeList(params).then(res => {
      this.setState({ rechargeList: res.data.records, rechargeTotal: res.data.total, rechargeLoading: false });
    }).catch(err => {
      notification.error({
        message: '获取充值订单列表失败',
        description: err.message
      });
      this.setState({ rechargeLoading: false, rechargeList: [], rechargeTotal: 0 });
    });
  }
  fetchExpenseList = (bool) => {

    this.setState({ expenseLoading: true });
    const { dateRange, selectedProject, expensePage, expensePageSize } = this.state;
    const { globalUtile } = this.props;
    // const namespaceArr = getNamespace(baseInfo);
    const params = {
      start_time: dateRange[0] ? dateRange[0].format('YYYY-MM-DD HH:mm:ss') : '',
      end_time: dateRange[1] ? dateRange[1].format('YYYY-MM-DD HH:mm:ss') : '',
      app_id: selectedProject || '',
      page: expensePage || 1,
      page_size: expensePageSize || 5,
      // namespace: namespaceArr.length > 0 ? namespaceArr.join(',') : ''
      region_name: globalUtile.getCurrRegionName()
    }
    getAppCostSummary(params).then(res => {
      let projectList = [];
      if (res?.data?.data?.length > 0 && bool) {
        const seenAppIds = new Set();
        projectList = res.data.data.reduce((acc, item) => {
          if (!seenAppIds.has(item.app_id)) {
            seenAppIds.add(item.app_id);
            acc.push({
              value: item.app_id,
              label: item.app_name
            });
          }
          return acc;
        }, []);
        projectList.unshift({
          value: '',
          label: '所有应用'
        });
        this.setState({
          projectList: projectList,
        })
      }
      this.setState({
        expenseList: res.data.data,
        expenseTotal: res.data.total,
        expenseLoading: false
      });
    }).catch(err => {
      notification.error({
        message: '获取账单明细失败',
        description: err.message,
      });
      this.setState({ expenseLoading: false, expenseList: [], expenseTotal: 0 });
    });
  }

  showDetails = (record) => {
    getBillDetails({ event_id: record.event_id }).then(res => {
      this.setState({
        detailData: res.data,
        modalVisible: true,
      });
    }).catch(err => {
      notification.error({
        message: '获取账单明细失败',
        description: err.message,
      });
      this.setState({ detailData: {}, modalVisible: false });
    });
  }

  handleModalClose = () => {
    this.setState({ modalVisible: false });
  }

  expenseColumns = [
    {
      title: '应用名称',
      dataIndex: 'app_name',
      key: 'app_name',
    },
    {
      title: '账单时间',
      dataIndex: 'bill_time',
      key: 'bill_time',
      render: (text) => dayjs(text).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '总金额 (¥)',
      dataIndex: 'total_cost',
      key: 'total_cost',
      render: (amount) => (
        <span style={{ color: '#ff4d4f' }}>
          -¥{amount ? (amount / 1000000).toFixed(6) : 0}
        </span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <a onClick={() => this.showDetails(record)}>详情</a>
      ),
    },
  ];

  rechargeColumns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
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

  onDateChange = (dates) => {
    this.setState({ dateRange: dates || [] });
  };

  onProjectChange = (value) => {
    this.setState({ selectedProject: value });
  };

  handleSearch = () => {
    this.setState({ expensePage: 1 }, () => {
      this.fetchExpenseList();
    });
  };

  handleReset = () => {
    const endDate = dayjs();
    const startDate = dayjs().subtract(7, 'days');
    
    this.setState({
      dateRange: [startDate, endDate],
      selectedProject: '',
      expensePage: 1
    }, () => {
      this.fetchExpenseList();
    });
  };

  handleRechargeStatusChange = (value) => {
    this.setState({ rechargeSearchText: value });
  };

  handleRechargeModalClose = () => {
    this.setState({ rechargeModalVisible: false });
  };
  handleRechargeSearch = () => {
    this.setState({ rechargePage: 1 }, () => {
      this.fetchRechargeList();
    });
  };
  handleRechargeReset = () => {
    const endDate = dayjs();
    const startDate = dayjs().subtract(7, 'days');
    
    this.setState({
      dateRange: [startDate, endDate],
      rechargeSearchText: '',
      rechargePage: 1
    }, () => {
      this.fetchRechargeList();
    });
  };

  render() {
    const { projectList } = this.state;
    const rechargeStatusOptions = [
      { value: '', label: '所有状态' },
      { value: 'SUCCESS', label: '支付成功' },
      { value: 'REFUND', label: '转入退款' },
      { value: 'NOTPAY', label: '未支付' },
      { value: 'CLOSED', label: '已关闭' },
    ];
    console.log(this.state.dateRange, 'dateRange')
    const items = [
      {
        key: 'expense',
        label: '支出明细',
        children: (
          <div className={styles.expenseContent}>
            <div className={styles.filterContainer}>
              <div className={styles.filterGroup}>
                <div className={styles.filterItem}>
                  <span className={styles.filterLabel}>交易时间：</span>
                  <RangePicker
                    value={this.state.dateRange}
                    format="YYYY-MM-DD"
                    onChange={this.onDateChange}
                    allowClear={false}
                  />
                </div>
                <div className={styles.filterItem}>
                  <span className={styles.filterLabel}>选择应用：</span>
                  <Select
                    style={{ width: 200 }}
                    placeholder="选择应用"
                    value={this.state.selectedProject}
                    onChange={this.onProjectChange}
                    options={projectList}
                  />
                </div>
              </div>
              <div className={styles.buttonGroup}>
                <Button type="primary" onClick={this.handleSearch}>
                  搜索
                </Button>
                <Button style={{ marginLeft: 8 }} onClick={this.handleReset}>
                  重置
                </Button>
              </div>
            </div>
            <Table
              loading={this.state.expenseLoading}
              className={styles.table}
              columns={this.expenseColumns}
              dataSource={this.state.expenseList}
              rowKey="id"
              pagination={{
                current: this.state.expensePage,
                total: this.state.expenseTotal,
                pageSize: this.state.expensePageSize,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50', '100'],
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
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条`,
                hideOnSinglePage: this.state.expenseTotal <= 5
              }}
            />
          </div>
        ),
      },
      {
        key: 'recharge',
        label: '充值明细',
        children: (
          <div className={styles.rechargeContent}>
            <div className={styles.filterContainer}>
              <div className={styles.filterGroup}>
                <div className={styles.filterItem}>
                  <span className={styles.filterLabel}>交易时间：</span>
                  <RangePicker
                    value={this.state.dateRange}
                    format="YYYY-MM-DD HH:mm:ss"
                    onChange={this.onDateChange}
                    allowClear={false}
                    showTime
                  />
                </div>
                <div className={styles.filterItem}>
                  <span className={styles.filterLabel}>状态:</span>
                  <Select
                    style={{ width: 200 }}
                    placeholder="选择状态"
                    value={this.state.rechargeSearchText}
                    onChange={this.handleRechargeStatusChange}
                    options={rechargeStatusOptions}
                  />
                </div>
              </div>
              <div className={styles.buttonGroup}>
                <Button type="primary" onClick={this.handleRechargeSearch}>
                  搜索
                </Button>
                <Button style={{ marginLeft: 8 }} onClick={this.handleRechargeReset}>
                  重置
                </Button>
              </div>
            </div>
            <Table
              className={styles.table}
              columns={this.rechargeColumns}
              dataSource={this.state.rechargeList}
              rowKey="orderId"
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
          </div>
        ),
      },
    ];

    return (
      <div className={styles.container}>
        <Title level={2}>账单明细</Title>
        <Text type="secondary">用于查看您的账单明细，包括充值、消费、余额等信息。</Text>

        <div className={styles.tabContainer}>
          <Tabs
            activeKey={this.state.activeKey}
            items={items}
            onChange={(key) => {
              this.setState({
                activeKey: key,
                dateRange: []
              }, () => {
                if (key === 'expense') {
                  this.fetchExpenseList(true);
                } else {
                  this.fetchRechargeList();
                }
              });
            }}
          />
        </div>
        <DetailModal
          visible={this.state.modalVisible}
          onClose={this.handleModalClose}
          detailData={this.state.detailData}
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
