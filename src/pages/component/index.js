import React, { Component } from 'react'
import { Alert, Card, Col, Empty, Radio, Row, Select, Spin, Table, Tag } from 'antd'
import {
  getComponentInternalRoutes,
  getComponentOverview,
  getComponentOverviewTrend,
  setNetworkMonitoringBaseInfo,
} from '../../api'
import MetricTrend from '../../components/MetricTrend'
import {
  WINDOW_OPTIONS,
  DEFAULT_REFRESH_INTERVAL_MS,
  REFRESH_INTERVAL_OPTIONS,
  formatBytes,
  formatLatency,
  formatNumber,
  formatPercent,
  formatThroughput,
  getPeakTrendValues,
  getRealtimeMetricPoint,
  getRouteThroughput,
  getResponseData,
  getResponseList,
  getResponseTrendPoints,
  getResponseWarnings,
  getWindowLabel,
  displayText,
  resolveComponentContext,
  sortByErrors,
  sortByLatency,
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
      routes: [],
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
    const context = resolveComponentContext(this.props)
    const { window } = this.state
    if (!context.componentID) {
      this.setState({ warnings: ['缺少当前组件 ID，无法查询组件级网络监控'] })
      return
    }
    if (options.showLoading) {
      this.setState({ loading: true })
    }
    try {
      const params = { window, limit: 50 }
      const [routes] = await Promise.all([
        getComponentInternalRoutes(context.componentID, params),
      ])
      this.setState({
        routes: getResponseList(routes),
        warnings: [
          ...getResponseWarnings(routes),
        ],
      })
    } catch (error) {
      this.setState({ warnings: ['组件级网络监控数据暂时不可用'] })
    } finally {
      if (options.showLoading) {
        this.setState({ loading: false })
      }
    }
  }

  fetchRealtimeData = async () => {
    const context = resolveComponentContext(this.props)
    if (!context.componentID) {
      return
    }
    const { window } = this.state
    try {
      const [overview, trend] = await Promise.all([
        getComponentOverview(context.componentID, { window, limit: 50 }),
        getComponentOverviewTrend(context.componentID, { window }),
      ])
      this.setState({
        overview: getResponseData(overview),
        trendPoints: getResponseTrendPoints(trend),
        realtimeWarning: '',
      })
    } catch (error) {
      this.setState({ realtimeWarning: '组件级实时网络指标暂时不可用' })
    }
  }

  renderMetricCards() {
    const { overview, trendPoints, window } = this.state
    const realtime = getRealtimeMetricPoint(overview, trendPoints)
    const peaks = getPeakTrendValues(trendPoints)
    const windowLabel = getWindowLabel(window)
    const cards = [
      { title: '吞吐率', value: formatThroughput(realtime.request_per_second), metric: 'request_per_second', format: formatThroughput },
      { title: '出口流量速率', value: formatBytes(overview.network_transmit_bps || overview.egress_bytes_per_sec), metric: 'egress_bytes_per_sec', format: formatBytes },
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

  renderRouteName = value => (
    <span className={styles.routeText}>{displayText(value, '-')}</span>
  )

  renderErrorRouteTable(dataSource) {
    const columns = [
      {
        title: '内部路由',
        dataIndex: 'route_group',
        key: 'route_group',
        render: this.renderRouteName,
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
        title: '请求总数',
        dataIndex: 'request_count',
        key: 'request_count',
        width: 120,
        render: value => formatNumber(value),
      },
    ]
    return (
      <Card title="错误排行" className={styles.sectionCard}>
        <Table
          size="small"
          rowKey={(record, index) => `${record.route_group || 'route-error'}-${index}`}
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: 580 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无错误聚合数据" /> }}
        />
      </Card>
    )
  }

  renderLatencyRouteTable(dataSource) {
    const { window } = this.state
    const columns = [
      {
        title: '内部路由',
        dataIndex: 'route_group',
        key: 'route_group',
        render: this.renderRouteName,
      },
      {
        title: '平均耗时',
        dataIndex: 'avg_latency_ms',
        key: 'avg_latency_ms',
        width: 140,
        render: value => formatLatency(value),
      },
      {
        title: '请求总数',
        dataIndex: 'request_count',
        key: 'request_count',
        width: 120,
        render: value => formatNumber(value),
      },
      {
        title: '吞吐率',
        dataIndex: 'request_count',
        key: 'throughput',
        width: 120,
        render: (value, record) => formatThroughput(getRouteThroughput(record, window)),
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
      <Card title={window === '5m' ? '过去 5 分钟耗时排行' : '耗时排行'} className={styles.sectionCard}>
        <Table
          size="small"
          rowKey={(record, index) => `${record.route_group || 'route-latency'}-${index}`}
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: 700 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无耗时聚合数据" /> }}
        />
      </Card>
    )
  }

  render() {
    const { loading, overview, realtimeWarning, refreshInterval, routes, warnings, window } = this.state
    const context = resolveComponentContext(this.props)
    const errorRoutes = sortByErrors(routes).slice(0, 10)
    const latencyRoutes = sortByLatency(routes).slice(0, 10)
    const notice = [...warnings]
    if (realtimeWarning) {
      notice.push(realtimeWarning)
    }
    return (
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div>
            <div className={styles.pageTitle}>组件级网络监控</div>
            <div className={styles.pageDesc}>{context.name} · {context.appName || '应用上下文未识别'}</div>
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
            <Col xs={24} lg={12}>
              {this.renderErrorRouteTable(errorRoutes)}
            </Col>
            <Col xs={24} lg={12}>
              {this.renderLatencyRouteTable(latencyRoutes)}
            </Col>
          </Row>
          {overview.evidence_level && (
            <div className={styles.evidence}>证据等级：{overview.evidence_level}</div>
          )}
        </Spin>
      </div>
    )
  }
}
