import React, { Component } from 'react'
import { Alert, Card, Col, Descriptions, Empty, Modal, Radio, Row, Spin, Table, Tag } from 'antd'
import {
  getPlatformNodeDetail,
  getPlatformNodeSummary,
  getPlatformOverview,
  getPlatformOverviewTrend,
  getPlatformAppTopErrors,
  getPlatformAppTopLatency,
  getPlatformAppTopThroughput,
  setNetworkMonitoringBaseInfo,
} from '../../api'
import MetricTrend from '../../components/MetricTrend'
import {
  WINDOW_OPTIONS,
  formatBytes,
  formatLatency,
  formatNumber,
  formatPercent,
  formatPercentValue,
  formatThroughput,
  getResponseData,
  getResponseList,
  getResponseTrendPoints,
  getResponseWarnings,
  displayText,
  resolvePlatformContext,
} from '../../utils/networkMonitoring'
import styles from './index.less'

export default class index extends Component {
  constructor(props) {
    super(props)
    this.state = {
      window: '5m',
      loading: false,
      realtimeLoading: false,
      overview: {},
      trendPoints: [],
      topAppErrors: [],
      topAppLatency: [],
      topAppThroughput: [],
      nodes: [],
      nodeDetail: {},
      nodeDetailVisible: false,
      nodeDetailLoading: false,
      warnings: [],
      realtimeWarning: '',
    }
  }

  componentDidMount() {
    setNetworkMonitoringBaseInfo(this.props?.baseInfo)
    this.fetchRealtimeData()
    this.fetchData()
    this.realtimeTimer = setInterval(this.fetchRealtimeData, 5000)
  }

  componentWillUnmount() {
    if (this.realtimeTimer) {
      clearInterval(this.realtimeTimer)
    }
  }

  handleWindowChange = e => {
    this.setState({ window: e.target.value }, this.fetchData)
  }

  fetchData = async () => {
    const { window } = this.state
    this.setState({ loading: true })
    try {
      const params = { window, limit: 10 }
      const [topAppErrors, topAppLatency, topAppThroughput, nodes] = await Promise.all([
        getPlatformAppTopErrors(params),
        getPlatformAppTopLatency(params),
        getPlatformAppTopThroughput(params),
        getPlatformNodeSummary({ window }),
      ])
      this.setState({
        topAppErrors: getResponseList(topAppErrors),
        topAppLatency: getResponseList(topAppLatency),
        topAppThroughput: getResponseList(topAppThroughput),
        nodes: getResponseList(nodes),
        warnings: [
          ...getResponseWarnings(topAppErrors),
          ...getResponseWarnings(topAppLatency),
          ...getResponseWarnings(topAppThroughput),
          ...getResponseWarnings(nodes),
        ],
      })
    } catch (error) {
      this.setState({
        warnings: ['平台级网络监控数据暂时不可用'],
      })
    } finally {
      this.setState({ loading: false })
    }
  }

  fetchRealtimeData = async () => {
    this.setState({ realtimeLoading: true })
    try {
      const [overview, trend] = await Promise.all([
        getPlatformOverview({ window: '5m', limit: 10 }),
        getPlatformOverviewTrend(),
      ])
      this.setState({
        overview: getResponseData(overview),
        trendPoints: getResponseTrendPoints(trend),
        realtimeWarning: '',
      })
    } catch (error) {
      this.setState({
        realtimeWarning: '平台级实时网络指标暂时不可用',
      })
    } finally {
      this.setState({ realtimeLoading: false })
    }
  }

  showNodeDetail = async node => {
    const { window } = this.state
    this.setState({
      nodeDetailVisible: true,
      nodeDetailLoading: true,
      nodeDetail: { name: node.name, cluster: node.cluster },
    })
    try {
      const response = await getPlatformNodeDetail(node.name, { window })
      this.setState({
        nodeDetail: getResponseData(response),
        warnings: [...this.state.warnings, ...getResponseWarnings(response)],
      })
    } catch (error) {
      this.setState({
        warnings: [...this.state.warnings, '节点详情数据暂时不可用'],
      })
    } finally {
      this.setState({ nodeDetailLoading: false })
    }
  }

  hideNodeDetail = () => {
    this.setState({ nodeDetailVisible: false })
  }

  jumpToAppGateway = record => {
    const appID = record?.app_id
    if (!appID) {
      return
    }
    const context = resolvePlatformContext(this.props)
    const teamName = record.team_name || record.team_id || record.namespace || context.teamName
    const regionName = record.region_name || context.regionName
    if (!teamName || !regionName) {
      return
    }
    window.location.hash = `/team/${encodeURIComponent(teamName)}/region/${encodeURIComponent(regionName)}/apps/${encodeURIComponent(appID)}/gateway`
  }

  renderMetricCards() {
    const { overview, realtimeLoading, trendPoints } = this.state
    const cards = [
      { title: '总请求量', value: formatNumber(overview.request_count), metric: 'request_per_second' },
      { title: '出口流量速率', value: formatBytes(overview.egress_bytes_per_sec), metric: 'egress_bytes_per_sec' },
      { title: '整体错误率', value: formatPercent(overview.error_rate), metric: 'error_rate' },
      { title: '平均延迟', value: formatLatency(overview.avg_latency_ms), metric: 'avg_latency_ms' },
    ]
    return (
      <Row gutter={[12, 12]}>
        {cards.map(item => (
          <Col xs={24} sm={12} lg={6} key={item.title}>
            <Card className={styles.metricCard}>
              <Spin spinning={realtimeLoading}>
                <div className={styles.metricTitle}>{item.title}</div>
                <div className={styles.metricValue}>{item.value}</div>
                <MetricTrend points={trendPoints} metric={item.metric} />
              </Spin>
            </Card>
          </Col>
        ))}
      </Row>
    )
  }

  renderAppTable(title, dataSource, type) {
    const columns = [
      {
        title: '应用',
        dataIndex: 'name',
        key: 'name',
        render: (value, record) => (
          <span className={styles.routeText}>{displayText(record.app_name, value, record.app_id, '-')}</span>
        ),
      },
      {
        title: '所属团队',
        dataIndex: 'team_alias',
        key: 'team_alias',
        width: 140,
        render: (value, record) => displayText(value, record.team_name, record.team_id, record.namespace, '-'),
      },
      {
        title: type === 'latency' ? '平均耗时' : type === 'throughput' ? '吞吐率' : '错误率',
        dataIndex: type === 'latency' ? 'avg_latency_ms' : type === 'throughput' ? 'throughput_per_second' : 'error_rate',
        key: 'primary',
        width: 140,
        render: value => {
          if (type === 'latency') {
            return formatLatency(value)
          }
          if (type === 'throughput') {
            return formatThroughput(value)
          }
          return formatPercent(value)
        },
      },
      {
        title: '请求量',
        dataIndex: 'request_count',
        key: 'request_count',
        width: 120,
        render: value => formatNumber(value),
      },
      {
        title: '错误数',
        dataIndex: 'error_count',
        key: 'error_count',
        width: 120,
        render: value => value ? <Tag color="red">{formatNumber(value)}</Tag> : '0',
      },
    ]
    return (
      <Card title={title} className={styles.sectionCard}>
        <Table
          size="small"
          rowKey={(record, index) => `${record.app_id || 'app'}-${index}`}
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          onRow={record => ({
            onClick: () => this.jumpToAppGateway(record),
            className: styles.clickableRow,
          })}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无应用聚合数据" /> }}
        />
      </Card>
    )
  }

  renderNodeTable() {
    const { nodes } = this.state
    const columns = [
      {
        title: '节点',
        dataIndex: 'name',
        key: 'name',
        render: (value, record) => (
          <a onClick={() => this.showNodeDetail(record)} className={styles.nodeLink}>{value || '-'}</a>
        ),
      },
      {
        title: '请求量',
        dataIndex: 'request_count',
        key: 'request_count',
        width: 140,
        render: value => formatNumber(value),
      },
      {
        title: 'P50',
        dataIndex: 'p50_latency_ms',
        key: 'p50_latency_ms',
        width: 140,
        render: value => formatLatency(value),
      },
      {
        title: '错误数',
        dataIndex: 'error_count',
        key: 'error_count',
        width: 120,
        render: value => value ? <Tag color="red">{formatNumber(value)}</Tag> : '0',
      },
      {
        title: '出口流量',
        dataIndex: 'egress_bytes_per_sec',
        key: 'egress_bytes_per_sec',
        width: 160,
        render: value => formatBytes(value),
      },
    ]
    return (
      <Card title="节点总览" className={styles.sectionCard}>
        <Table
          size="small"
          rowKey={record => record.name}
          columns={columns}
          dataSource={nodes}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无节点数据" /> }}
        />
      </Card>
    )
  }

  renderNodeDetailModal() {
    const { nodeDetail, nodeDetailLoading, nodeDetailVisible } = this.state
    return (
      <Modal
        title={nodeDetail.name || '节点详情'}
        open={nodeDetailVisible}
        onCancel={this.hideNodeDetail}
        footer={null}
        destroyOnClose
      >
        <Spin spinning={nodeDetailLoading}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="基础状态">
              <Tag color={nodeDetail.status === 'ready' ? 'green' : 'orange'}>{nodeDetail.status || 'unknown'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="所属集群">{nodeDetail.cluster || '-'}</Descriptions.Item>
            <Descriptions.Item label="CPU">{formatPercentValue(nodeDetail.cpu_usage_percent)}</Descriptions.Item>
            <Descriptions.Item label="内存">{formatPercentValue(nodeDetail.memory_usage_percent)}</Descriptions.Item>
          </Descriptions>
        </Spin>
      </Modal>
    )
  }

  render() {
    const { loading, realtimeWarning, topAppErrors, topAppLatency, topAppThroughput, warnings, window } = this.state
    const notice = [...warnings]
    if (realtimeWarning) {
      notice.push(realtimeWarning)
    }
    return (
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div>
            <div className={styles.pageTitle}>平台级网络监控</div>
            <div className={styles.pageDesc}>聚焦整个平台入口流量、应用错误热点、应用延迟热点和应用吞吐热点</div>
          </div>
          <Radio.Group value={window} onChange={this.handleWindowChange} optionType="button" buttonStyle="solid">
            {WINDOW_OPTIONS.map(item => (
              <Radio.Button key={item.value} value={item.value}>{item.label}</Radio.Button>
            ))}
          </Radio.Group>
        </div>

        {notice.length > 0 && (
          <Alert className={styles.notice} type="warning" showIcon message={notice.join('；')} />
        )}

        <Spin spinning={loading}>
          {this.renderMetricCards()}
          <Row gutter={[12, 12]} className={styles.contentGrid}>
            <Col xs={24} lg={8}>
              {this.renderAppTable('应用错误排行 Top10', topAppErrors, 'errors')}
            </Col>
            <Col xs={24} lg={8}>
              {this.renderAppTable('应用延迟排行 Top10', topAppLatency, 'latency')}
            </Col>
            <Col xs={24} lg={8}>
              {this.renderAppTable('应用吞吐率排行 Top10', topAppThroughput, 'throughput')}
            </Col>
          </Row>
          <div className={styles.contentGrid}>
            {this.renderNodeTable()}
          </div>
        </Spin>
        {this.renderNodeDetailModal()}
      </div>
    )
  }
}
