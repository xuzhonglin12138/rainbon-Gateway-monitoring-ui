import React, { Component } from 'react'
import { Alert, Card, Col, Empty, Radio, Row, Select, Spin, Table, Tag } from 'antd'
import {
  getConsoleAppServices,
  getAppComponentSummary,
  getAppOverview,
  getAppOverviewTrend,
  getAppRouteSummary,
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
  getConsoleResponseList,
  getComponentDisplayName,
  getPeakTrendValues,
  getRealtimeMetricPoint,
  getRouteThroughput,
  getResponseData,
  getResponseList,
  getResponseTrendPoints,
  getResponseWarnings,
  getWindowLabel,
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
      summary: [],
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
      const params = { window, limit: 10 }
      const [sla, summary, topErrors, topLatency, components] = await Promise.all([
        this.safeRequest(getAppSLA(context.appID, params)),
        this.safeRequest(getAppRouteSummary(context.appID, params)),
        this.safeRequest(getAppTopErrors(context.appID, params)),
        this.safeRequest(getAppTopLatency(context.appID, params)),
        this.safeRequest(getAppComponentSummary(context.appID, { window, limit: 50 })),
      ])
      const warnings = [
        ...this.getResultWarnings(sla, '应用 SLA 暂时不可用'),
        ...this.getResultWarnings(summary, '应用内部路由汇总暂时不可用'),
        ...this.getResultWarnings(topErrors, '应用内部错误路由排序暂时不可用'),
        ...this.getResultWarnings(topLatency, '应用内部慢路由排序暂时不可用'),
        ...this.getResultWarnings(components, '应用组件汇总暂时不可用'),
      ]
      this.setState({
        sla: this.getResultData(sla, {}),
        summary: this.getResultList(summary),
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
        this.safeRequest(getAppOverview(context.appID, { window, limit: 10 })),
        this.safeRequest(getAppOverviewTrend(context.appID, { window })),
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

  renderSLA() {
    const { sla } = this.state
    const current = formatPercent(sla.current)
    const target = formatPercent(sla.target)
    return (
      <Card className={styles.slaCard}>
        <div className={styles.slaHeader}>
          <div>
            <div className={styles.metricTitle}>应用 SLA</div>
            <div className={styles.slaValue}>{current}</div>
          </div>
          <Tag color={sla.meeting_target ? 'green' : 'red'}>
            {sla.meeting_target ? '达标' : '未达标'}
          </Tag>
        </div>
        <div className={styles.slaMeta}>
          <span>目标 {target}</span>
          <span>总请求 {formatNumber(sla.total_requests)}</span>
          <span>错误请求 {formatNumber(sla.error_requests)}</span>
        </div>
      </Card>
    )
  }

  renderMetricCards() {
    const { overview, trendPoints, window } = this.state
    const realtime = getRealtimeMetricPoint(overview, trendPoints)
    const peaks = getPeakTrendValues(trendPoints)
    const windowLabel = getWindowLabel(window)
    const cards = [
      { title: '应用总请求量', value: `${formatNumber(overview.request_count)} 次`, metric: 'request_per_second', format: formatThroughput },
      { title: '出口流量速率', value: formatBytes(overview.egress_bytes_per_sec), metric: 'egress_bytes_per_sec', format: formatBytes },
      { title: '整体错误率', value: formatPercent(overview.error_rate), metric: 'error_rate', format: formatPercent },
      { title: '平均延迟', value: formatLatency(overview.avg_latency_ms), metric: 'avg_latency_ms', format: formatLatency },
    ]
    return cards.map(item => (
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
    ))
  }

  renderRouteName = value => (
    <span className={styles.routeText}>{displayText(value, '-')}</span>
  )

  jumpToComponentGateway = record => {
    const context = resolveAppContext(this.props)
    const componentID = displayText(record?.component_id, record?.service_alias)
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

  renderComponentName = record => (
    <div className={styles.cellStack}>
      <span className={styles.primaryText}>{getComponentDisplayName(record, this.state.componentDisplayMap)}</span>
      <span className={styles.secondaryText}>{displayText(record.component_id, record.service_alias, '')}</span>
    </div>
  )

  renderRequestRouteTable(dataSource) {
    const { window } = this.state
    const columns = [
      {
        title: '内部路由',
        dataIndex: 'route_group',
        key: 'route_group',
        render: this.renderRouteName,
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
      {
        title: '平均耗时',
        dataIndex: 'avg_latency_ms',
        key: 'avg_latency_ms',
        width: 140,
        render: value => formatLatency(value),
      },
    ]
    return (
      <Card title="内部路由请求 Top10" className={styles.sectionCard}>
        <Table
          size="small"
          rowKey={(record, index) => `${record.route_group || 'route-request'}-${index}`}
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: 760 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无请求聚合数据" /> }}
        />
      </Card>
    )
  }

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
      <Card title="内部路由错误 Top10" className={styles.sectionCard}>
        <Table
          size="small"
          rowKey={(record, index) => `${record.route_group || 'route-error'}-${index}`}
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: 640 }}
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
          scroll={{ x: 760 }}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无耗时聚合数据" /> }}
        />
      </Card>
    )
  }

  renderComponentTable() {
    const { components } = this.state
    const columns = [
      {
        title: '组件',
        dataIndex: 'name',
        key: 'name',
        render: (value, record) => this.renderComponentName(record),
      },
      {
        title: '请求量',
        dataIndex: 'request_count',
        key: 'request_count',
        width: 140,
        render: value => formatNumber(value),
      },
      {
        title: '错误数',
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
        title: '平均耗时',
        dataIndex: 'avg_latency_ms',
        key: 'avg_latency_ms',
        width: 140,
        render: value => formatLatency(value),
      },
    ]
    return (
      <Card title="组件摘要" className={styles.sectionCard}>
        <Table
          size="small"
          rowKey={(record, index) => record.component_id || `${record.name || 'component'}-${index}`}
          columns={columns}
          dataSource={components}
          pagination={false}
          onRow={record => ({
            onClick: () => this.jumpToComponentGateway(record),
            className: styles.clickableRow,
          })}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无组件聚合数据" /> }}
        />
      </Card>
    )
  }

  render() {
    const { loading, realtimeWarning, refreshInterval, summary, topErrors, topLatency, warnings, window } = this.state
    const context = resolveAppContext(this.props)
    const notice = [...warnings]
    if (realtimeWarning) {
      notice.push(realtimeWarning)
    }
    return (
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div>
            <div className={styles.pageTitle}>应用级网络监控</div>
            <div className={styles.pageDesc}>{context.name} · {context.namespace || 'namespace 未识别'}</div>
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
          <div className={styles.contentGrid}>
            {this.renderComponentTable()}
          </div>
          <Row gutter={[12, 12]} className={styles.contentGrid}>
            <Col xs={24} lg={8}>
              {this.renderRequestRouteTable(summary)}
            </Col>
            <Col xs={24} lg={8}>
              {this.renderErrorRouteTable(topErrors)}
            </Col>
            <Col xs={24} lg={8}>
              {this.renderLatencyRouteTable(topLatency)}
            </Col>
          </Row>
        </Spin>
      </div>
    )
  }
}
