import React, { Component } from 'react';
import { Typography, Card, Table, DatePicker, Select, Button, notification, Skeleton } from 'antd';
import { getCostSummary, getServiceCostSummary } from '@/api';
import moment from 'moment';
import styles from './index.less';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default class UsageDetails extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dateRange: [],
      selectedProject: '',
      expenseLoading: false,
      summaryData: {},
      serviceCostSummary: [],
      serviceCostLoading: false,
      serviceCostPage: 1,
      serviceCostPageSize: 5,
      serviceCostTotal: 0
    };
  }

  componentDidMount() {
    this.getCostSummary();
    this.getServiceCostSummary(true);
  }
  getServiceCostSummary = (bool) => {
    this.setState({ serviceCostLoading: true });
    const { dateRange, selectedProject, serviceCostPage, serviceCostPageSize } = this.state;
    const { globalUtile } = this.props;
    const params = {
      start_time: dateRange[0] ? moment(dateRange[0]).format('YYYY-MM-DD HH:mm:ss') : '',
      end_time: dateRange[1] ? moment(dateRange[1]).format('YYYY-MM-DD HH:mm:ss') : '',
      app_id: selectedProject || '',
      namespace: globalUtile?.getCurrTeamName() || '',
      page: serviceCostPage,
      page_size: serviceCostPageSize
    }
    getServiceCostSummary(params).then(res => {
      let newProjectList = [];
      if (res?.data?.data?.length > 0 && bool) {
        const seenAppIds = new Set();
        newProjectList = res.data.data.reduce((acc, item) => {
          if (!seenAppIds.has(item.app_id)) {
            seenAppIds.add(item.app_id);
            acc.push({
              value: item.app_id,
              label: item.app_name
            });
          }
          return acc;
        }, []);
        newProjectList.unshift({
          value: '',
          label: '所有应用'
        });
        this.setState({
          projectList: newProjectList,
        });
      }
      this.setState({
        serviceCostSummary: res?.data?.data || [],
        serviceCostTotal: res?.data?.total || 0,
        serviceCostLoading: false
      });
    }).catch(err => {
      notification.error({
        message: '获取服务费用汇总失败',
        description: err.message
      });
      this.setState({ serviceCostLoading: false, serviceCostSummary: [], serviceCostTotal: 0, projectList: [] });
    });
  }

  // 获取费用汇总
  getCostSummary = () => {
    this.setState({ summaryLoading: true });
    const { dateRange, selectedProject } = this.state;
    const { globalUtile } = this.props;
    const params = {
      start_time: dateRange[0] ? moment(dateRange[0]).format('YYYY-MM-DD HH:mm:ss') : '',
      end_time: dateRange[1] ? moment(dateRange[1]).format('YYYY-MM-DD HH:mm:ss') : '',
      app_id: selectedProject || '',
      namespace: globalUtile?.getCurrTeamName() || ''
    }
    getCostSummary(params).then(res => {

      this.setState({
        summaryData: res.data,
        summaryLoading: false
      });
    }).catch(err => {
      notification.error({
        message: '获取费用汇总失败',
        description: err.message
      });
      this.setState({ summaryLoading: false });
    });
  }
  // 日期选择
  onDateChange = (dates) => {
    if (!dates || dates.length === 0) {
      this.setState({ dateRange: [], dateValue: [] });
    } else {
      const formattedDates = dates.map(date => date.format('YYYY-MM-DD HH:mm:ss'));
      this.setState({ dateRange: formattedDates, dateValue: dates });
    }
  };
  onProjectChange = (value) => {
    this.setState({ selectedProject: value });
  }
  handleSearch = () => {
    this.setState({ serviceCostPage: 1}, () => {
      this.getServiceCostSummary();
      this.getCostSummary();
    });
  }
  handleReset = () => {
    this.setState({ selectedProject: '', dateRange: [], dateValue: [], serviceCostPage: 1 }, () => {
      this.getServiceCostSummary();
      this.getCostSummary();
    });
  }

  render() {
    const { summaryData, serviceCostSummary, projectList, serviceCostLoading, summaryLoading, serviceCostPage, serviceCostPageSize, serviceCostTotal } = this.state;
    const summaryDataArray = [
      { key: '1', label: '内存', value: `¥${summaryData?.memory_cost?.toFixed(2) || 0}` },
      { key: '2', label: 'CPU', value: `¥${summaryData?.cpu_cost?.toFixed(2) || 0}` },
      { key: '3', label: '存储', value: `¥${summaryData?.storage_cost?.toFixed(2) || 0}` },
      { key: '4', label: '流量', value: `¥${summaryData?.network_cost?.toFixed(2) || 0}` },
    ];
    const columns = [
      { title: '应用', dataIndex: 'app_id', key: 'app_id' },
      { title: '内存', dataIndex: 'memory_cost', key: 'memory_cost', render: (text) => `¥${text?.toFixed(2) || 0}` },
      { title: 'CPU', dataIndex: 'cpu_cost', key: 'cpu_cost', render: (text) => `¥${text?.toFixed(2) || 0}` },
      { title: '存储', dataIndex: 'storage_cost', key: 'storage_cost', render: (text) => `¥${text?.toFixed(2) || 0}` },
      { title: '流量', dataIndex: 'network_cost', key: 'network_cost', render: (text) => `¥${text?.toFixed(2) || 0}` },
      { title: '总计', dataIndex: 'total_cost', key: 'total_cost', render: (text) => `¥${text?.toFixed(2) || 0}` }
    ];

    return (
      <div className={styles.container}>
        <Title level={2}>用量明细</Title>
        <Text type="secondary">此页面展示您的资源使用详情，您可以通过选择时间范围查看特定期间的使用数据。</Text>
        <div className={styles.expenseContent}>
          <div className={styles.filterContainer}>
            <div className={styles.filterGroup}>
              <div className={styles.filterItem}>
                <span className={styles.filterLabel}>交易时间：</span>
                <RangePicker
                  value={this.state.dateValue}
                  showTime
                  format="YYYY/MM/DD HH:mm:ss"
                  onChange={this.onDateChange}
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
        </div>
        {summaryLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : (
          <>
            <div className={styles.summary}>
              {summaryDataArray.map(item => (
                <div key={item.key} className={styles.summaryItem}>
                  <p className={styles.summaryLabel}>{item.label}</p>
                  <p>{item.value}</p>
                </div>
              ))
              }
            </div>
            <Card className={styles.totalCard}>
              <p className={styles.summaryLabel}>总金额</p>
              <p className={styles.totalAmount}>¥{summaryData?.total_cost?.toFixed(2) || 0}</p>
            </Card>
          </>
        )}
        <Table columns={columns} dataSource={serviceCostSummary} pagination={
          {
            total: serviceCostTotal,
            pageSize: serviceCostPageSize,
            current: serviceCostPage,
            onChange: (page, pageSize) => {
              this.setState({ serviceCostPage: page, serviceCostPageSize: pageSize }, () => {
                this.getServiceCostSummary();
                this.getCostSummary();
              });
            },
            onShowSizeChange: (current, size) => {
              this.setState({ serviceCostPage: 1, serviceCostPageSize: size }, () => {
                this.getServiceCostSummary();
                this.getCostSummary();
              });
            },
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            hideOnSinglePage: serviceCostTotal <= 5,
            showSizeChanger: true,
            pageSizeOptions: ['5', '10', '20', '50', '100']
          }
        } loading={serviceCostLoading} />
      </div>
    );
  }
}
