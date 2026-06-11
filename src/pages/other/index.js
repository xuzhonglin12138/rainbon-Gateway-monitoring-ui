import React, { Component } from 'react'
import { Alert, Button, Card, Col, Empty, Radio, Row, Select, Spin, Tag, Tooltip } from 'antd'
import {
  getConsoleAppServices,
  getAppComponentSummary,
  getAppOverview,
  getAppOverviewTrend,
  getAppSLA,
  getAppTopErrors,
  getAppTopLatency,
  setNetworkMonitoringBaseInfo,
  syncAppHTTPLogger,
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
  buildComponentDisplayMap,
  buildWindowQueryParams,
  getConsoleResponseList,
  getComponentDisplayName,
  getPeakTrendValues,
  getRealtimeMetricPoint,
  getRouteThroughput,
  getResponseData,
  getResponseList,
  getResponseTrendPoints,
  getResponseWarnings,
  resolveServiceAliases,
  displayText,
  resolveAppContext,
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
      sla: {},
      topErrors: [],
      topLatency: [],
      components: [],
      componentDisplayMap: {},
      warnings: [],
      realtimeWarning: '',
    }
  }

  componentDidMount() {
    setNetworkMonitoringBaseInfo(this.props?.baseInfo)
    this.loadAppServices()
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

  safeRequest = promise => promise.then(response => ({ response })).catch(error => ({ error }))

  loadAppServices = async () => {
    const context = resolveAppContext(this.props)
    if (!context.teamName || !context.appID) {
      return
    }
    try {
      const services = await getConsoleAppServices(context.teamName, context.appID)
      const serviceList = getConsoleResponseList(services)
      this.setState({ componentDisplayMap: buildComponentDisplayMap(serviceList) })
      this.syncHTTPLoggerMappings(context, serviceList)
    } catch (error) {
      this.setState({ componentDisplayMap: {} })
    }
  }

  syncHTTPLoggerMappings = async (context, serviceList = []) => {
    if (!context.appID || !context.namespace) {
      return
    }
    try {
      await syncAppHTTPLogger(context.appID, {
        namespace: context.namespace,
        region_app_id: context.regionAppID,
        region_name: context.regionName,
        team_name: context.teamName,
        team_alias: context.teamAlias,
        app_name: context.name,
        service_aliases: resolveServiceAliases(serviceList, this.props?.baseInfo),
      })
    } catch (error) {
      // Mapping refresh is best-effort. Data APIs can still use existing mappings.
    }
  }

  fetchData = async (options = {}) => {
    const context = resolveAppContext(this.props)
    const { window } = this.state
    if (!context.appID) {
      this.setState({ warnings: ['缺少当前应用 ID，无法查询应用级网络监控'] })
      return
    }
    if (options.showLoading) {
      this.setState({ loading: true })
    }
    try {
      const params = buildWindowQueryParams(window, { limit: 10 })
      const [sla, topErrors, topLatency, components] = await Promise.all([
        this.safeRequest(getAppSLA(context.appID, params)),
        this.safeRequest(getAppTopErrors(context.appID, params)),
        this.safeRequest(getAppTopLatency(context.appID, params)),
        this.safeRequest(getAppComponentSummary(context.appID, buildWindowQueryParams(window, { limit: 50 }))),
      ])
      const warnings = [
        ...this.getResultWarnings(sla, '应用 SLA 暂时不可用'),
        ...this.getResultWarnings(topErrors, '应用内部错误路由排序暂时不可用'),
        ...this.getResultWarnings(topLatency, '应用内部慢路由排序暂时不可用'),
        ...this.getResultWarnings(components, '应用组件汇总暂时不可用'),
      ]
      this.setState({
        sla: this.getResultData(sla, {}),
        topErrors: this.getResultList(topErrors),
        topLatency: this.getResultList(topLatency),
        components: this.getResultList(components),
        warnings,
      })
    } catch (error) {
      this.setState({ warnings: ['应用级网络监控数据暂时不可用'] })
    } finally {
      if (options.showLoading) {
        this.setState({ loading: false })
      }
    }
  }

  fetchRealtimeData = async () => {
    const context = resolveAppContext(this.props)
    if (!context.appID) {
      return
    }
    const { window } = this.state
    try {
      const [overview, trend] = await Promise.all([
        this.safeRequest(getAppOverview(context.appID, buildWindowQueryParams(window, { limit: 10 }))),
        this.safeRequest(getAppOverviewTrend(context.appID, buildWindowQueryParams(window))),
      ])
      const realtimeWarnings = [
        ...this.getResultWarnings(overview, '应用级基础网络指标暂时不可用'),
        ...this.getResultWarnings(trend, '应用级实时网络趋势暂时不可用'),
      ]
      this.setState({
        overview: this.getResultData(overview, {}),
        trendPoints: trend.response ? getResponseTrendPoints(trend.response) : [],
        realtimeWarning: realtimeWarnings.join('；'),
      })
    } catch (error) {
      this.setState({ realtimeWarning: '应用级实时网络指标暂时不可用' })
    }
  }

  getResultData(result, fallback) {
    if (!result || result.error || !result.response) {
      return fallback
    }
    return getResponseData(result.response)
  }

  getResultList(result) {
    if (!result || result.error || !result.response) {
      return []
    }
    return getResponseList(result.response)
  }

  getResultWarnings(result, fallback) {
    if (!result || result.error || !result.response) {
      return [fallback]
    }
    return getResponseWarnings(result.response)
  }

  getSLAStatus = value => {
    const rate = Number(value || 0)
    if (rate < 0.6) {
      return {
        className: styles.slaValueError,
        tagColor: 'red',
        tagText: '低于 60%',
      }
    }
    if (rate < 0.999) {
      return {
        className: styles.slaValueWarning,
        tagColor: 'orange',
        tagText: '低于目标',
      }
    }
    return {
      className: styles.slaValueSuccess,
      tagColor: 'green',
      tagText: '达标',
    }
  }

  renderSLA() {
    const { sla } = this.state
    const current = formatPercent(sla.current)
    const target = formatPercent(sla.target)
    const status = this.getSLAStatus(sla.current)
    return (
      <Card className={styles.slaCard}>
        <div className={styles.slaHeader}>
          <div>
            <div className={styles.metricTitle}>应用 SLA</div>
            <div className={`${styles.slaValue} ${status.className}`}>{current}</div>
          </div>
          <Tag color={status.tagColor}>{status.tagText}</Tag>
        </div>
        <div className={styles.slaMeta}>
          <div className={styles.slaMetaItem}>
            <span className={styles.slaMetaKey}>目标</span>
            <span className={`${styles.slaMetaValue} ${styles.slaMetaValueTarget}`}>{target}</span>
          </div>
          <div className={styles.slaMetaItem}>
            <span className={styles.slaMetaKey}>总请求</span>
            <span className={`${styles.slaMetaValue} ${styles.slaMetaValueSuccess}`}>{formatNumber(sla.total_requests)}</span>
          </div>
          <div className={styles.slaMetaItem}>
            <span className={styles.slaMetaKey}>错误请求</span>
            <span className={`${styles.slaMetaValue} ${styles.slaMetaValueError}`}>{formatNumber(sla.error_requests)}</span>
          </div>
        </div>
        <div className={styles.slaDesc}>SLA 表示应用在当前时间窗口内满足可用性目标的服务水平。</div>
      </Card>
    )
  }

  renderMetricCards() {
    const { overview, trendPoints } = this.state
    const realtime = getRealtimeMetricPoint(overview, trendPoints)
    const peaks = getPeakTrendValues(trendPoints)
    const cards = [
      {
        title: '应用总请求量',
        value: `${formatNumber(overview.request_count)} 次`,
        metric: 'request_per_second',
        format: formatThroughput,
        description: '应用总请求量表示当前应用接收到的请求总次数。',
      },
      {
        title: '出口流量速率',
        value: formatBytes(overview.egress_bytes_per_sec),
        metric: 'egress_bytes_per_sec',
        format: formatBytes,
        description: '出口流量速率表示应用响应数据对外传输的网络速度。',
      },
      {
        title: '整体错误率',
        value: formatPercent(overview.error_rate),
        metric: 'error_rate',
        format: formatPercent,
        description: '整体错误率表示应用失败请求在全部请求中的占比。',
      },
      {
        title: '平均延迟',
        value: formatLatency(overview.avg_latency_ms),
        metric: 'avg_latency_ms',
        format: formatLatency,
        description: '平均延迟表示应用处理请求并返回响应所花费的平均时间。',
      },
    ]
    return cards.map(item => (
      <Col xs={24} sm={12} lg={6} key={item.title}>
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
    ))
  }

  renderTextWithTooltip = (value, className) => {
    const text = displayText(value, '-')
    return (
      <Tooltip title={text}>
        <span className={className}>{text}</span>
      </Tooltip>
    )
  }

  jumpToComponentGateway = record => {
    const context = resolveAppContext(this.props)
    const componentID = this.getRecordComponentID(record)
    const teamPath = context.teamPath || context.teamName
    if (!teamPath || !context.regionName || !context.appID || !componentID) {
      return
    }
    const teamName = encodeURIComponent(teamPath)
    const regionName = encodeURIComponent(context.regionName)
    const appID = encodeURIComponent(context.appID)
    const component = encodeURIComponent(componentID)
    window.location.hash = `/team/${teamName}/region/${regionName}/apps/${appID}/overview?type=components&componentID=${component}&tab=rainbond-gateway-monitoring`
  }

  getRecordComponentID = record => displayText(record?.component_id, record?.service_alias)

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
            const canJump = Boolean(this.getRecordComponentID(record))

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
                <Button
                  className={styles.rankingActionButton}
                  disabled={!canJump}
                  onClick={() => this.jumpToComponentGateway(record)}
                >
                  查看
                </Button>
              </div>
            )
          }) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
          )}
        </div>
      </Card>
    )
  }

  renderRequestRouteTable(dataSource) {
    const { window } = this.state
    return this.renderRouteRankingCard({
      dataSource,
      emptyText: '暂无请求聚合数据',
      title: '内部路由请求 Top10',
      getItem: record => ({
        key: record.route_group,
        name: displayText(record.route_group, '-'),
        metrics: [
          { label: '请求总数', value: formatNumber(record.request_count) },
          { label: '吞吐率', value: formatThroughput(getRouteThroughput(record, window)) },
        ],
      }),
    })
  }

  renderErrorRouteTable(dataSource) {
    return this.renderRouteRankingCard({
      dataSource,
      emptyText: '暂无错误聚合数据',
      title: '内部路由错误 Top10',
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

  renderComponentTable() {
    const { components } = this.state
    return (
      <Card className={`${styles.sectionCard} ${styles.componentCard}`}>
        <div className={styles.componentHeader}>
          <div>
            <div className={styles.sectionTitle}>组件摘要</div>
          </div>
        </div>
        <div className={styles.componentList}>
          {components.length ? components.map((record, index) => {
            const componentName = getComponentDisplayName(record, this.state.componentDisplayMap)
            const metrics = [
              { label: '请求量', value: formatNumber(record.request_count) },
              { label: '错误数', value: formatNumber(record.error_count), danger: Number(record.error_count || 0) > 0 },
              { label: '错误率', value: formatPercent(record.error_rate), danger: Number(record.error_rate || 0) > 0 },
              { label: '平均耗时', value: formatLatency(record.avg_latency_ms) },
            ]

            return (
              <div className={styles.componentItem} key={record.component_id || `${record.name || 'component'}-${index}`}>
                <div className={styles.componentIdentity}>
                  <span className={styles.componentName}>{componentName}</span>
                </div>
                <div className={styles.componentMetricList}>
                  {metrics.map(metric => (
                    <div className={styles.componentMetric} key={metric.label}>
                      <span className={styles.componentMetricLabel}>{metric.label}</span>
                      <span className={`${styles.componentMetricValue} ${metric.danger ? styles.componentMetricDanger : ''}`}>{metric.value}</span>
                    </div>
                  ))}
                </div>
                <Button className={styles.componentActionButton} onClick={() => this.jumpToComponentGateway(record)}>
                  查看
                </Button>
              </div>
            )
          }) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无组件聚合数据" />
          )}
        </div>
      </Card>
    )
  }

  render() {
    const { loading, realtimeWarning, refreshInterval, topErrors, topLatency, warnings, window } = this.state
    const notice = [...warnings]
    if (realtimeWarning) {
      notice.push(realtimeWarning)
    }
    return (
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div>
            <div className={styles.pageTitle}>应用流量</div>
            <div className={styles.pageDesc}>聚焦当前应用的入口流量、内部路由质量、组件错误和响应延迟情况</div>
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

        <Row gutter={[12, 12]}>
          <Col xs={24} lg={8}>
            <Spin spinning={loading}>{this.renderSLA()}</Spin>
          </Col>
          <Col xs={24} lg={16}>
            <Row gutter={[12, 12]}>{this.renderMetricCards()}</Row>
          </Col>
        </Row>

        <Spin spinning={loading}>
          <Row gutter={[12, 12]} className={styles.contentGrid}>
            <Col xs={24}>
              {this.renderComponentTable()}
            </Col>
          </Row>
          <Row gutter={[12, 12]} className={styles.contentGrid}>
            <Col xs={24} lg={12}>
              {this.renderLatencyRouteTable(topLatency)}
            </Col>
            <Col xs={24} lg={12}>
              {this.renderErrorRouteTable(topErrors)}
            </Col>
          </Row>
        </Spin>
      </div>
    )
  }
}
