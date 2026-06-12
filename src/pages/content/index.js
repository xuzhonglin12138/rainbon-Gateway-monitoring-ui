import React, { Component } from 'react'
import { Alert, Button, Card, Col, Empty, Radio, Row, Select, Spin, Tabs, Tooltip } from 'antd'
import {
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
  buildWindowQueryParams,
  getPeakTrendValues,
  getRealtimeMetricPoint,
  getResponseData,
  getResponseList,
  getResponseTrendPoints,
  getResponseWarnings,
  getTeamThroughputItems,
  displayText,
  resolvePlatformContext,
  resolveTeamPathFromRecord,
} from '../../utils/networkMonitoring'
import styles from './index.less'

const MONITOR_PAGES = [
  { key: 'cluster-overview', name: '集群概览', path: 'd/cluster-overview/ji-qun-jian-kong-gai-lan?orgId=1&refresh=1m' },
  { key: 'ns-overview', name: '团队监控', path: 'd/ns-overview/ji-qun-namespacegai-lan?orgId=1&refresh=1m' },
  { key: 'node-overview', name: '节点监控', path: 'd/node-overview/ji-qun-jie-dian-jian-kong-xiang-qing?orgId=1&refresh=1m' },
  { key: 'node-resources-top', name: '节点性能', path: 'd/node-resources-top/ji-qun-jie-dian-xing-neng-topnjian-kong?orgId=1&refresh=1m' },
  { key: 'pod', name: 'Pod监控', path: 'd/pod/podjian-kong?orgId=1&refresh=1m' },
  { key: 'pod-top', name: 'Pod性能', path: 'd/pod-top/podxing-neng-topjian-kong?orgId=1&refresh=1m' },
  { key: 'daemonset', name: '守护进程监控', path: 'd/daemonset/shou-hu-jin-cheng-ji-ying-yong-jian-kong?orgId=1&refresh=1m' },
  { key: 'workload', name: '工作负载监控', path: 'd/workload/gong-zuo-fu-zai-jian-kong-gai-lan?orgId=1&refresh=1m' },
  { key: 'deployment', name: '无状态应用监控', path: 'd/deployment/wu-zhuang-tai-ying-yong-jian-kong?orgId=1&refresh=1m' },
  { key: 'statefulset', name: '有状态应用监控', path: 'd/statefulset/you-zhuang-tai-ying-yong-jian-kong?orgId=1&refresh=1m' },
]

export default class index extends Component {
  constructor(props) {
    super(props)
    this.state = {
      activeTab: 'gateway',
      currentMonitorPage: MONITOR_PAGES[0].key,
      window: '5m',
      refreshInterval: DEFAULT_REFRESH_INTERVAL_MS,
      loading: false,
      overview: {},
      trendPoints: [],
      topAppErrors: [],
      topAppLatency: [],
      topTeamThroughput: [],
      nodes: [],
      monitorOverviewData: {},
      monitorPerformanceOverview: {},
      warnings: [],
      realtimeWarning: '',
    }
  }

  componentDidMount() {
    setNetworkMonitoringBaseInfo(this.props?.baseInfo)
    this.fetchMonitorCenterOverview()
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

  handleTabChange = activeTab => {
    this.setState({ activeTab })
  }

  handleMonitorPageChange = currentMonitorPage => {
    this.setState({ currentMonitorPage })
  }

  fetchMonitorCenterOverview = () => {
    const { dispatch } = this.props
    if (typeof dispatch !== 'function') {
      return
    }
    dispatch({
      type: 'teamControl/fetchToken',
      payload: {
        team_name: 'default',
        tokenNode: 'observability',
      },
      callback: res => {
        if (res && res.status_code === 200) {
          const token = res.bean?.access_key || false
          if (token) {
            this.fetchObservabilityOverview(token)
            this.fetchPerformanceOverview(token)
          }
        }
      },
    })
  }

  fetchObservabilityOverview = token => {
    const { dispatch } = this.props
    if (typeof dispatch !== 'function') {
      return
    }
    dispatch({
      type: 'region/fetchObservabilityOverview',
      payload: { token },
      callback: res => {
        this.setState({
          monitorOverviewData: res?.response_data || {},
        })
      },
    })
  }

  fetchPerformanceOverview = token => {
    const { dispatch } = this.props
    if (typeof dispatch !== 'function') {
      return
    }
    dispatch({
      type: 'region/fetchPerformanceOverview',
      payload: { token },
      callback: res => {
        this.setState({
          monitorPerformanceOverview: res?.response_data || {},
        })
      },
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
      const params = buildWindowQueryParams(window, { limit: 10 })
      const throughputParams = buildWindowQueryParams(window, { limit: 200 })
      const [topAppErrors, topAppLatency, topAppThroughput, nodes] = await Promise.all([
        getPlatformAppTopErrors(params),
        getPlatformAppTopLatency(params),
        getPlatformAppTopThroughput(throughputParams),
        getPlatformNodeSummary(buildWindowQueryParams(window)),
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
        getPlatformOverview(buildWindowQueryParams(window, { limit: 10 })),
        getPlatformOverviewTrend(buildWindowQueryParams(window)),
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

  jumpToTeamHome = record => {
    const context = resolvePlatformContext(this.props)
    const teamName = resolveTeamPathFromRecord(record, this.props) || context.teamName
    const regionName = record?.region_name || context.regionName
    if (!teamName || !regionName) {
      return
    }
    window.location.hash = `/team/${encodeURIComponent(teamName)}/region/${encodeURIComponent(regionName)}/index`
  }

  getGrafanaProxyBase = () => {
    const context = resolvePlatformContext(this.props)
    const regionName = context.regionName || 'rainbond'
    return `/console/regions/${encodeURIComponent(regionName)}/proxy/plugins/rainbond-gateway-monitoring/grafana/`
  }

  getGrafanaPageURL = page => `${this.getGrafanaProxyBase()}${page.path}`

  handleGrafanaIframeLoad = e => {
    const iframe = e?.target
    if (!iframe) {
      return
    }
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document
      const style = iframeDoc.createElement('style')
      style.textContent = '.sidemenu { display: none !important; }'
      iframeDoc.head.appendChild(style)
    } catch (err) {
      console.warn('无法访问 iframe 内容:', err)
    }
    iframe.style.opacity = '1'
  }

  renderGatewayControls() {
    const { refreshInterval, window } = this.state
    return (
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
    )
  }

  renderMetricCards() {
    const { overview, trendPoints } = this.state
    const realtime = getRealtimeMetricPoint(overview, trendPoints)
    const peaks = getPeakTrendValues(trendPoints)
    const cards = [
      {
        title: '总请求量',
        value: `${formatNumber(overview.request_count)} 次`,
        metric: 'request_per_second',
        format: formatThroughput,
        description: '总请求量表示平台入口接收到的请求总次数。',
      },
      {
        title: '出口流量速率',
        value: formatBytes(overview.egress_bytes_per_sec),
        metric: 'egress_bytes_per_sec',
        format: formatBytes,
        description: '出口流量速率表示响应数据离开平台时的网络传输速度。',
      },
      {
        title: '整体错误率',
        value: formatPercent(overview.error_rate),
        metric: 'error_rate',
        format: formatPercent,
        description: '整体错误率表示失败请求在全部请求中的占比。',
      },
      {
        title: '平均延迟',
        value: formatLatency(overview.avg_latency_ms),
        metric: 'avg_latency_ms',
        format: formatLatency,
        description: '平均延迟表示请求从进入到收到响应所花费的平均时间。',
      },
    ]
    return (
      <Row gutter={[12, 12]}>
        {cards.map(item => (
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
        ))}
      </Row>
    )
  }

  renderRankingCard({ dataSource, description, emptyText, getItem, title }) {
    const list = Array.isArray(dataSource) ? dataSource : []
    return (
      <Card className={`${styles.sectionCard} ${styles.rankingCard}`}>
        <div className={styles.rankingHeader}>
          <div>
            <div className={styles.rankingTitle}>{title}</div>
            {description ? <div className={styles.rankingDesc}>{description}</div> : null}
          </div>
        </div>
        <div className={styles.rankingList}>
          {list.length ? list.map((record, index) => {
            const item = getItem(record, index)

            return (
              <div key={item.key || index} className={styles.rankingListItem}>
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
                {item.action ? (
                  <Button
                    className={styles.rankingActionButton}
                    onClick={item.action.onClick}
                  >
                    {item.action.label}
                  </Button>
                ) : null}
              </div>
            )
          }) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />
          )}
        </div>
      </Card>
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

  renderErrorAppTable(dataSource) {
    return this.renderRankingCard({
      dataSource,
      description: '按应用错误请求数量排序，帮助定位平台级异常入口。',
      emptyText: '暂无应用错误聚合数据',
      title: '应用错误排行',
      getItem: (record, index) => ({
        key: `${record.app_id || 'app-error'}-${index}`,
        name: displayText(record.app_name, record.name) || displayText(record.app_id, record.region_app_id, '-'),
        metrics: [
          {
            label: '错误率',
            value: formatPercent(record.error_rate),
            danger: Number(record.error_rate || 0) > 0,
          },
          {
            label: '错误最多路由',
            value: displayText(record.top_error_route_group, '-'),
          },
        ],
        action: {
          label: '查看',
          onClick: () => this.jumpToAppGateway(record),
        },
      }),
    })
  }

  renderLatencyAppTable(dataSource) {
    return this.renderRankingCard({
      dataSource,
      description: '按应用平均响应延迟排序，展示最需要关注的慢应用。',
      emptyText: '暂无应用延迟聚合数据',
      title: '应用延迟排行',
      getItem: (record, index) => ({
        key: `${record.app_id || 'app-latency'}-${index}`,
        name: displayText(record.app_name, record.name) || displayText(record.app_id, record.region_app_id, '-'),
        metrics: [
          {
            label: '平均延时',
            value: formatLatency(record.avg_latency_ms),
          },
          {
            label: '耗时最多路由',
            value: displayText(record.top_latency_route_group, '-'),
          },
        ],
        action: {
          label: '查看',
          onClick: () => this.jumpToAppGateway(record),
        },
      }),
    })
  }

  renderTeamThroughputTable(dataSource) {
    return this.renderRankingCard({
      dataSource,
      description: '按团队吞吐率排序，展示平台内流量最集中的团队。',
      emptyText: '暂无团队吞吐聚合数据',
      title: '团队吞吐率排行',
      getItem: (record, index) => ({
        key: `${record.team_id || record.team_name || record.namespace || 'team'}-${index}`,
        name: displayText(record.team_alias, record.team_name, record.name) || displayText(record.namespace, record.team_id, '-'),
        metrics: [
          {
            label: '吞吐率',
            value: formatThroughput(record.throughput_per_second),
          },
        ],
        action: {
          label: '查看',
          onClick: () => this.jumpToTeamHome(record),
        },
      }),
    })
  }

  renderMonitorOverviewCards() {
    const { monitorOverviewData, monitorPerformanceOverview } = this.state
    const cpuUseSum = monitorPerformanceOverview?.cpu_use_sum || 0
    const memoryUseSum = Math.round(Number(monitorPerformanceOverview?.memory_use_sum || 0) / 1024)
    const diskUseSum = parseInt(monitorPerformanceOverview?.disk_use_sum || 0, 10)
    const items = [
      {
        label: 'CPU',
        value: cpuUseSum || 0,
        unit: 'Core',
      },
      {
        label: '团队',
        value: monitorOverviewData?.teams || 0,
        unit: '个',
      },
      {
        label: '内存',
        value: memoryUseSum || 0,
        unit: 'GB',
      },
      {
        label: '应用',
        value: monitorOverviewData?.apps || 0,
        unit: '个',
      },
      {
        label: '磁盘',
        value: diskUseSum || 0,
        unit: 'GB',
      },
      {
        label: '实例',
        value: monitorOverviewData?.instances || 0,
        unit: '个',
      },
    ]

    return (
      <Row gutter={[12, 12]} className={styles.monitorOverview}>
        {items.map(item => (
          <Col xs={12} sm={8} lg={4} key={item.label}>
            <Card className={styles.monitorOverviewCard}>
              <div className={styles.monitorOverviewLabel}>{item.label}</div>
              <div className={styles.monitorOverviewValue}>{item.value} {item.unit}</div>
            </Card>
          </Col>
        ))}
      </Row>
    )
  }

  renderNodeCards(options = {}) {
    const { nodes } = this.state
    const title = options.title || '节点总览'
    const description = options.description || '按节点维度展示平台流量、响应、错误和资源分配情况。'
    return (
      <Card className={`${styles.sectionCard} ${styles.nodeCard}`}>
        <div className={styles.nodeHeader}>
          <div>
            <div className={styles.rankingTitle}>{title}</div>
            <div className={styles.rankingDesc}>{description}</div>
          </div>
        </div>
        <div className={styles.nodeList}>
          {nodes.length ? nodes.map(node => {
            const status = String(node.status || 'unknown')
            const isReady = status.toLowerCase() === 'ready'
            const metrics = [
              { label: '请求量', value: formatInteger(node.request_count) },
              { label: '平均延时', value: formatLatency(node.avg_latency_ms) },
              { label: '错误率', value: formatPercent(node.error_rate), danger: Number(node.error_rate || 0) > 0 },
              { label: '出口流量', value: formatBytes(node.egress_bytes_per_sec) },
              {
                label: 'CPU 分配',
                value: formatPercentValue(node.cpu_allocated_percent),
                hint: `${Number(node.cpu_requested_cores || 0).toFixed(2)} / ${Number(node.cpu_allocatable_cores || 0).toFixed(2)} Core`,
              },
              {
                label: '内存分配',
                value: formatPercentValue(node.memory_allocated_percent),
                hint: `${formatResourceBytes(node.memory_requested_bytes)} / ${formatResourceBytes(node.memory_allocatable_bytes)}`,
              },
            ]

            return (
              <div className={styles.nodeItem} key={node.name || node.cluster}>
                <div className={styles.nodeIdentity}>
                  <div className={styles.nodeNameRow}>
                    {this.renderTextWithTooltip(node.name || '-', styles.nodeName)}
                    {this.renderTextWithTooltip(status, `${styles.nodeStatus} ${isReady ? styles.nodeStatusReady : styles.nodeStatusWarning}`)}
                  </div>
                </div>
                <div className={styles.nodeMetricList}>
                  {metrics.map(metric => (
                    <div className={styles.nodeMetric} key={metric.label}>
                      {this.renderTextWithTooltip(metric.label, styles.nodeMetricLabel)}
                      {this.renderTextWithTooltip(metric.value, `${styles.nodeMetricValue} ${metric.danger ? styles.nodeMetricDanger : ''}`)}
                      {metric.hint ? this.renderTextWithTooltip(metric.hint, styles.nodeMetricHint) : null}
                    </div>
                  ))}
                </div>
              </div>
            )
          }) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无节点数据" />
          )}
        </div>
      </Card>
    )
  }

  renderGatewayTraffic() {
    const { loading, realtimeWarning, topAppErrors, topAppLatency, topTeamThroughput, warnings } = this.state
    const notice = [...warnings]
    if (realtimeWarning) {
      notice.push(realtimeWarning)
    }

    return (
      <>
        <div className={styles.gatewayToolbar}>
          {this.renderGatewayControls()}
        </div>

        {notice.length > 0 && (
          <Alert className={styles.notice} type="warning" showIcon message={notice.join('；')} />
        )}

        {this.renderMetricCards()}

        <Spin spinning={loading}>
          <div className={styles.contentGrid}>
            {this.renderNodeCards()}
          </div>
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
        </Spin>
      </>
    )
  }

  renderMonitorCenter() {
    const { currentMonitorPage } = this.state
    const currentPage = MONITOR_PAGES.find(page => page.key === currentMonitorPage) || MONITOR_PAGES[0]

    return (
      <>
        {this.renderMonitorOverviewCards()}
          <Tabs
            activeKey={currentMonitorPage}
            onChange={this.handleMonitorPageChange}
            items={MONITOR_PAGES.map(page => ({
              key: page.key,
              label: page.name,
            }))}
          />
          <iframe
            id={`gateway-monitoring-grafana-${currentPage.key}`}
            key={currentPage.key}
            src={this.getGrafanaPageURL(currentPage)}
            className={styles.monitorIframe}
            title={currentPage.name}
            onLoad={this.handleGrafanaIframeLoad}
          />
      </>
    )
  }

  render() {
    const { activeTab } = this.state
    return (
      <div className={styles.container}>
        <Tabs
          activeKey={activeTab}
          onChange={this.handleTabChange}
          className={`${styles.platformTabs} ${styles.tabBarStyle}`}
          items={[
            {
              key: 'gateway',
              label: '网关监控',
              children: this.renderGatewayTraffic(),
            },
            {
              key: 'monitor',
              label: '资源监控',
              children: this.renderMonitorCenter(),
            },
          ]}
        />
      </div>
    )
  }
}
