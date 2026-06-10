import React, { Component } from 'react'
import { Alert, Card, Col, Descriptions, Empty, Modal, Radio, Row, Select, Spin, Table, Tag } from 'antd'
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
  DEFAULT_REFRESH_INTERVAL_MS,
  REFRESH_INTERVAL_OPTIONS,
  formatBytes,
  formatInteger,
  formatLatency,
  formatNumber,
  formatPercent,
  formatPercentValue,
  formatResourceBytes,
  formatThroughput,
  getPeakTrendValues,
  getRealtimeMetricPoint,
  getResponseData,
  getResponseList,
  getResponseTrendPoints,
  getResponseWarnings,
  getTeamThroughputItems,
  getWindowLabel,
  displayText,
  resolvePlatformContext,
  resolveTeamPathFromRecord,
} from '../../utils/networkMonitoring'
import styles from './index.less'

export default class index extends Component {
  constructor(props) {
    super(props)
    this.state = {
      window: '5m',
      refreshInterval: DEFAULT_REFRESH_INTERVAL_MS,
      loading: false,
      overview: {},
      trendPoints: [],
      topAppErrors: [],
      topAppLatency: [],
      topTeamThroughput: [],
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
    this.refreshPageData({ showLoading: true })
    this.startRefreshTimer()
  }

  componentWillUnmount() {
    if (this.realtimeTimer) {
      clearInterval(this.realtimeTimer)
    }
  }

  handleWindowChange = e => {
    this.setState({ window: e.target.value }, () => this.refreshPageData({ showLoading: true }))
  }

  handleRefreshIntervalChange = refreshInterval => {
    this.setState({ refreshInterval }, () => {
      this.startRefreshTimer()
      this.refreshPageData()
    })
  }

  startRefreshTimer = () => {
    if (this.realtimeTimer) {
      clearInterval(this.realtimeTimer)
    }
    this.realtimeTimer = setInterval(this.refreshPageData, this.state.refreshInterval)
  }

  refreshPageData = async (options = {}) => {
    if (this.pageRefreshing) {
      return
    }
    this.pageRefreshing = true
    try {
      await Promise.all([
        this.fetchRealtimeData(),
        this.fetchData(options),
      ])
    } finally {
      this.pageRefreshing = false
    }
  }

  fetchData = async (options = {}) => {
    const { window } = this.state
    if (options.showLoading) {
      this.setState({ loading: true })
    }
    try {
      const params = { window, limit: 10 }
      const throughputParams = { window, limit: 200 }
      const [topAppErrors, topAppLatency, topAppThroughput, nodes] = await Promise.all([
        getPlatformAppTopErrors(params),
        getPlatformAppTopLatency(params),
        getPlatformAppTopThroughput(throughputParams),
        getPlatformNodeSummary({ window }),
      ])
      this.setState({
        topAppErrors: getResponseList(topAppErrors),
        topAppLatency: getResponseList(topAppLatency),
        topTeamThroughput: getTeamThroughputItems(getResponseList(topAppThroughput), 10),
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
      if (options.showLoading) {
        this.setState({ loading: false })
      }
    }
  }

  fetchRealtimeData = async () => {
    const { window } = this.state
    try {
      const [overview, trend] = await Promise.all([
        getPlatformOverview({ window, limit: 10 }),
        getPlatformOverviewTrend({ window }),
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
    const appID = displayText(record?.app_id, record?.region_app_id)
    if (!appID) {
      return
    }
    const context = resolvePlatformContext(this.props)
    const teamName = resolveTeamPathFromRecord(record, this.props) || context.teamName
    const regionName = record.region_name || context.regionName
    if (!teamName || !regionName) {
      return
    }
    window.location.hash = `/team/${encodeURIComponent(teamName)}/region/${encodeURIComponent(regionName)}/apps/${encodeURIComponent(appID)}/plugins/rainbond-gateway-monitoring`
  }

  renderMetricCards() {
    const { overview, trendPoints, window } = this.state
    const realtime = getRealtimeMetricPoint(overview, trendPoints)
    const peaks = getPeakTrendValues(trendPoints)
    const windowLabel = getWindowLabel(window)
    const cards = [
      { title: '总请求量', value: `${formatNumber(overview.request_count)} 次`, metric: 'request_per_second', format: formatThroughput },
      { title: '出口流量速率', value: formatBytes(overview.egress_bytes_per_sec), metric: 'egress_bytes_per_sec', format: formatBytes },
      { title: '整体错误率', value: formatPercent(overview.error_rate), metric: 'error_rate', format: formatPercent },
      { title: '平均延迟', value: formatLatency(overview.avg_latency_ms), metric: 'avg_latency_ms', format: formatLatency },
    ]
    return (
      <Row gutter={[12, 12]}>
        {cards.map(item => (
          <Col xs={24} sm={12} lg={6} key={item.title}>
            <Card className={styles.metricCard}>
              <div className={styles.metricTitle}>{item.title}</div>
              <div className={styles.metricValue}>{item.value}</div>
              <div className={styles.metricMeta}>
                <span>实时 {item.format(realtime[item.metric])}</span>
                <span>{windowLabel}峰值 {item.format(peaks[item.metric])}</span>
              </div>
              <MetricTrend points={trendPoints} metric={item.metric} />
            </Card>
          </Col>
        ))}
      </Row>
    )
  }

  renderAppName = record => (
    <div className={styles.cellStack}>
      <span className={styles.primaryText}>{displayText(record.app_name, record.name, record.app_id, record.region_app_id, '-')}</span>
      <span className={styles.secondaryText}>{displayText(record.app_id, record.region_app_id, '')}</span>
    </div>
  )

  renderTeamName = record => (
    <div className={styles.cellStack}>
      <span className={styles.primaryText}>{displayText(record.team_alias, record.team_name, record.name, record.team_id, record.namespace, '-')}</span>
      <span className={styles.secondaryText}>{displayText(record.namespace, record.team_name, '')}</span>
    </div>
  )

  renderRouteMetric = (route, metricText) => (
    <div className={styles.cellStack}>
      <span className={styles.routeText}>{displayText(route, '-')}</span>
      {metricText ? <span className={styles.secondaryText}>{metricText}</span> : null}
    </div>
  )

  renderErrorAppTable(dataSource) {
    const columns = [
      {
        title: '应用',
        dataIndex: 'name',
        key: 'name',
        width: 180,
        render: (value, record) => this.renderAppName(record),
      },
      {
        title: '所属团队',
        dataIndex: 'team_alias',
        key: 'team_alias',
        width: 160,
        render: (value, record) => this.renderTeamName(record),
      },
      {
        title: '请求总数',
        dataIndex: 'request_count',
        key: 'request_count',
        width: 120,
        render: value => formatNumber(value),
      },
      {
        title: '错误总数',
        dataIndex: 'error_count',
        key: 'error_count',
        width: 120,
        render: value => value ? <Tag color="red">{formatNumber(value)}</Tag> : '0',
      },
      {
        title: '错误率',
        dataIndex: 'error_rate',
        key: 'error_rate',
        width: 120,
        render: value => formatPercent(value),
      },
      {
        title: '错误最多内部路由',
        dataIndex: 'top_error_route_group',
        key: 'top_error_route_group',
        width: 220,
        render: (value, record) => this.renderRouteMetric(value, record.top_error_route_errors ? `${formatNumber(record.top_error_route_errors)} 次错误` : ''),
      },
    ]
    return (
      <Card title="应用错误排行 Top10" className={styles.sectionCard}>
        <Table
          size="small"
          rowKey={(record, index) => `${record.app_id || 'app-error'}-${index}`}
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: 860 }}
          onRow={record => ({
            onClick: () => this.jumpToAppGateway(record),
            className: styles.clickableRow,
          })}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无应用错误聚合数据" /> }}
        />
      </Card>
    )
  }

  renderLatencyAppTable(dataSource) {
    const columns = [
      {
        title: '应用',
        dataIndex: 'name',
        key: 'name',
        width: 180,
        render: (value, record) => this.renderAppName(record),
      },
      {
        title: '所属团队',
        dataIndex: 'team_alias',
        key: 'team_alias',
        width: 160,
        render: (value, record) => this.renderTeamName(record),
      },
      {
        title: '平均耗时',
        dataIndex: 'avg_latency_ms',
        key: 'avg_latency_ms',
        width: 120,
        render: value => formatLatency(value),
      },
      {
        title: '耗时最多内部路由',
        dataIndex: 'top_latency_route_group',
        key: 'top_latency_route_group',
        width: 220,
        render: (value, record) => this.renderRouteMetric(value, record.top_latency_route_avg_ms ? `平均 ${formatLatency(record.top_latency_route_avg_ms)}` : ''),
      },
      {
        title: '总请求量',
        dataIndex: 'request_count',
        key: 'request_count',
        width: 120,
        render: value => formatNumber(value),
      },
      {
        title: '错误率',
        dataIndex: 'error_rate',
        key: 'error_rate',
        width: 120,
        render: value => formatPercent(value),
      },
    ]
    return (
      <Card title="应用延迟排行 Top10" className={styles.sectionCard}>
        <Table
          size="small"
          rowKey={(record, index) => `${record.app_id || 'app-latency'}-${index}`}
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: 820 }}
          onRow={record => ({
            onClick: () => this.jumpToAppGateway(record),
            className: styles.clickableRow,
          })}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无应用延迟聚合数据" /> }}
        />
      </Card>
    )
  }

  renderTeamThroughputTable(dataSource) {
    const columns = [
      {
        title: '团队',
        dataIndex: 'name',
        key: 'name',
        width: 180,
        render: (value, record) => this.renderTeamName(record),
      },
      {
        title: '吞吐率',
        dataIndex: 'throughput_per_second',
        key: 'throughput_per_second',
        width: 120,
        render: value => formatThroughput(value),
      },
      {
        title: '请求总数',
        dataIndex: 'request_count',
        key: 'request_count',
        width: 120,
        render: value => formatNumber(value),
      },
      {
        title: '应用数',
        dataIndex: 'app_count',
        key: 'app_count',
        width: 90,
        render: value => formatNumber(value),
      },
      {
        title: '错误率',
        dataIndex: 'error_rate',
        key: 'error_rate',
        width: 110,
        render: value => formatPercent(value),
      },
      {
        title: '吞吐最高应用',
        dataIndex: 'top_app_name',
        key: 'top_app_name',
        width: 200,
        render: (value, record) => this.renderRouteMetric(value, record.top_app_throughput_per_second ? formatThroughput(record.top_app_throughput_per_second) : ''),
      },
      {
        title: '错误总数',
        dataIndex: 'error_count',
        key: 'error_count',
        width: 110,
        render: value => value ? <Tag color="red">{formatNumber(value)}</Tag> : '0',
      },
    ]
    return (
      <Card title="团队吞吐率排行 Top10" className={styles.sectionCard}>
        <Table
          size="small"
          rowKey={(record, index) => `${record.team_id || record.team_name || record.namespace || 'team'}-${index}`}
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: 930 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无团队吞吐聚合数据" /> }}
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
        width: 180,
        render: (value, record) => (
          <a onClick={() => this.showNodeDetail(record)} className={styles.nodeLink}>{value || '-'}</a>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        render: value => <Tag color={value === 'ready' ? 'green' : 'orange'}>{value || 'unknown'}</Tag>,
      },
      {
        title: '请求量',
        dataIndex: 'request_count',
        key: 'request_count',
        width: 110,
        render: value => formatInteger(value),
      },
      {
        title: '平均延时',
        dataIndex: 'avg_latency_ms',
        key: 'avg_latency_ms',
        width: 120,
        render: value => formatLatency(value),
      },
      {
        title: '错误率',
        dataIndex: 'error_rate',
        key: 'error_rate',
        width: 100,
        render: value => {
          const rate = Number(value || 0)
          return rate > 0 ? <Tag color="red">{formatPercent(rate)}</Tag> : formatPercent(0)
        },
      },
      {
        title: '出口流量',
        dataIndex: 'egress_bytes_per_sec',
        key: 'egress_bytes_per_sec',
        width: 160,
        render: value => formatBytes(value),
      },
      {
        title: 'CPU 分配',
        dataIndex: 'cpu_allocated_percent',
        key: 'cpu_allocated_percent',
        width: 190,
        render: (value, record) => `${formatPercentValue(value)} (${Number(record.cpu_requested_cores || 0).toFixed(2)} / ${Number(record.cpu_allocatable_cores || 0).toFixed(2)} Core)`,
      },
      {
        title: '内存分配',
        dataIndex: 'memory_allocated_percent',
        key: 'memory_allocated_percent',
        width: 220,
        render: (value, record) => `${formatPercentValue(value)} (${formatResourceBytes(record.memory_requested_bytes)} / ${formatResourceBytes(record.memory_allocatable_bytes)})`,
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
          scroll={{ x: 1080 }}
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
            <Descriptions.Item label="CPU 使用率">{formatPercentValue(nodeDetail.cpu_usage_percent)}</Descriptions.Item>
            <Descriptions.Item label="内存使用率">{formatPercentValue(nodeDetail.memory_usage_percent)}</Descriptions.Item>
            <Descriptions.Item label="CPU 分配">
              {formatPercentValue(nodeDetail.cpu_allocated_percent)} ({Number(nodeDetail.cpu_requested_cores || 0).toFixed(2)} / {Number(nodeDetail.cpu_allocatable_cores || 0).toFixed(2)} Core)
            </Descriptions.Item>
            <Descriptions.Item label="内存分配">
              {formatPercentValue(nodeDetail.memory_allocated_percent)} ({formatResourceBytes(nodeDetail.memory_requested_bytes)} / {formatResourceBytes(nodeDetail.memory_allocatable_bytes)})
            </Descriptions.Item>
          </Descriptions>
        </Spin>
      </Modal>
    )
  }

  render() {
    const { loading, realtimeWarning, refreshInterval, topAppErrors, topAppLatency, topTeamThroughput, warnings, window } = this.state
    const notice = [...warnings]
    if (realtimeWarning) {
      notice.push(realtimeWarning)
    }
    return (
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div>
            <div className={styles.pageTitle}>平台级网络监控</div>
            <div className={styles.pageDesc}>聚焦整个平台入口流量、应用错误热点、应用延迟热点和团队吞吐热点</div>
          </div>
          <div className={styles.toolbarControls}>
            <Radio.Group value={window} onChange={this.handleWindowChange} optionType="button" buttonStyle="solid">
              {WINDOW_OPTIONS.map(item => (
                <Radio.Button key={item.value} value={item.value}>{item.label}</Radio.Button>
              ))}
            </Radio.Group>
            <Select
              value={refreshInterval}
              onChange={this.handleRefreshIntervalChange}
              options={REFRESH_INTERVAL_OPTIONS}
              style={{ width: 120 }}
            />
          </div>
        </div>

        {notice.length > 0 && (
          <Alert className={styles.notice} type="warning" showIcon message={notice.join('；')} />
        )}

        {this.renderMetricCards()}

        <Spin spinning={loading}>
          <Row gutter={[12, 12]} className={styles.contentGrid}>
            <Col xs={24} lg={8}>
              {this.renderErrorAppTable(topAppErrors)}
            </Col>
            <Col xs={24} lg={8}>
              {this.renderLatencyAppTable(topAppLatency)}
            </Col>
            <Col xs={24} lg={8}>
              {this.renderTeamThroughputTable(topTeamThroughput)}
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
