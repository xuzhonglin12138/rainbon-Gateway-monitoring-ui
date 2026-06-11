import React, { Component } from 'react'
import { Alert, Card, Col, Empty, Radio, Row, Select, Spin, Tooltip } from 'antd'
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
  formatLatency,
  formatNumber,
  formatPercent,
  formatThroughput,
  buildWindowQueryParams,
  getPeakTrendValues,
  getRealtimeMetricPoint,
  getResponseData,
  getResponseList,
  getResponseTrendPoints,
  getResponseWarnings,
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
      const params = buildWindowQueryParams(window, { limit: 50 })
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
        getComponentOverview(context.componentID, buildWindowQueryParams(window, { limit: 50 })),
        getComponentOverviewTrend(context.componentID, buildWindowQueryParams(window)),
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
    const { overview, trendPoints } = this.state
    const realtime = getRealtimeMetricPoint(overview, trendPoints)
    const peaks = getPeakTrendValues(trendPoints)
    const cards = [
      {
        title: '吞吐率',
        value: formatThroughput(realtime.request_per_second),
        metric: 'request_per_second',
        format: formatThroughput,
        description: '吞吐率表示组件单位时间内处理请求的能力。',
      },
      {
        title: '整体错误率',
        value: formatPercent(overview.error_rate),
        metric: 'error_rate',
        format: formatPercent,
        description: '整体错误率表示组件失败请求在全部请求中的占比。',
      },
      {
        title: '平均延迟',
        value: formatLatency(overview.avg_latency_ms),
        metric: 'avg_latency_ms',
        format: formatLatency,
        description: '平均延迟表示组件处理请求并返回响应所花费的平均时间。',
      },
    ]
    return (
      <Row gutter={[12, 12]}>
        {cards.map(item => (
          <Col xs={24} sm={12} lg={8} key={item.title}>
            <Card className={styles.metricCard}>
              <div className={styles.metricTitle}>{item.title}</div>
              <div className={styles.metricValue}>{item.value}</div>
              <div className={styles.metricMeta}>
                <span>实时 <span className={styles.metricNumber}>{item.format(realtime[item.metric])}</span></span>
                <span>峰值 <span className={styles.metricNumber}>{item.format(peaks[item.metric])}</span></span>
              </div>
              <MetricTrend points={trendPoints} metric={item.metric} />
              <div className={styles.metricDesc}>{item.description}</div>
            </Card>
          </Col>
        ))}
      </Row>
    )
  }

  renderTextWithTooltip = (value, className) => {
    const text = displayText(value, '-')
    return (
      <Tooltip title={text}>
        <span className={className}>{text}</span>
      </Tooltip>
    )
  }

  renderRouteRankingCard({ dataSource, emptyText, getItem, title }) {
    const list = Array.isArray(dataSource) ? dataSource : []
    return (
      <Card className={`${styles.sectionCard} ${styles.rankingCard}`}>
        <div className={styles.rankingHeader}>
          <div className={styles.sectionTitle}>{title}</div>
        </div>
        <div className={styles.rankingList}>
          {list.length ? list.map((record, index) => {
            const item = getItem(record)

            return (
              <div className={styles.rankingListItem} key={item.key || index}>
                <div className={styles.rankingIdentity}>
                  <span className={styles.rankingIndex}>{String(index + 1).padStart(2, '0')}</span>
                  {this.renderTextWithTooltip(item.name, styles.rankingName)}
                </div>
                <div className={styles.rankingMetricList}>
                  {item.metrics.map(metric => (
                    <div className={styles.rankingMetric} key={metric.label}>
                      {this.renderTextWithTooltip(metric.label, styles.rankingMetricLabel)}
                      {this.renderTextWithTooltip(metric.value, `${styles.rankingMetricValue} ${metric.danger ? styles.rankingMetricDanger : ''}`)}
                    </div>
                  ))}
                </div>
              </div>
            )
          }) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
          )}
        </div>
      </Card>
    )
  }

  renderErrorRouteTable(dataSource) {
    return this.renderRouteRankingCard({
      dataSource,
      emptyText: '暂无错误聚合数据',
      title: '错误排行',
      getItem: record => ({
        key: record.route_group,
        name: displayText(record.route_group, '-'),
        metrics: [
          { label: '错误总数', value: formatNumber(record.error_count), danger: Number(record.error_count || 0) > 0 },
          { label: '错误率', value: formatPercent(record.error_rate), danger: Number(record.error_rate || 0) > 0 },
        ],
      }),
    })
  }

  renderLatencyRouteTable(dataSource) {
    const { window } = this.state
    return this.renderRouteRankingCard({
      dataSource,
      emptyText: '暂无耗时聚合数据',
      title: window === '5m' ? '过去 5 分钟耗时排行' : '耗时排行',
      getItem: record => ({
        key: record.route_group,
        name: displayText(record.route_group, '-'),
        metrics: [
          { label: '平均耗时', value: formatLatency(record.avg_latency_ms) },
          { label: '请求总数', value: formatNumber(record.request_count) },
        ],
      }),
    })
  }

  render() {
    const { loading, realtimeWarning, refreshInterval, routes, warnings, window } = this.state
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
        </Spin>
      </div>
    )
  }
}
