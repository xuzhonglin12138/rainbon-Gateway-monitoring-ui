import React, { Component } from 'react'
import { Alert, Button, Card, Col, Empty, Modal, Radio, Row, Select, Spin, Tag, Tooltip, message } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import {
  deleteAppSLAConfig,
  getConsoleAppServices,
  getAppComponentSummary,
  getAppOverview,
  getAppOverviewTrend,
  getAppSLA,
  getAppSLAConfig,
  getAppTopErrors,
  getAppTopLatency,
  saveAppSLAConfig,
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
  normalizeSLAGatewayDomains,
  resolveRecordComponentID,
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
      loading: {},
      overview: {},
      trendPoints: [],
      sla: {},
      topErrors: [],
      topLatency: [],
      components: [],
      componentDisplayMap: {},
      warnings: {},
      realtimeWarning: '',
      slaConfigVisible: false,
      slaConfigSaving: false,
      slaDomains: [],
      slaDomainLoading: false,
      slaDomainSelectionRequired: false,
      slaDomainWarning: '',
      slaSelectedDomain: '',
      slaSelectedScheme: 'http',
    }
  }

  componentDidMount() {
    setNetworkMonitoringBaseInfo(this.props?.baseInfo)
    this.bootstrapPage()
  }

  componentWillUnmount() {
    this.unmounted = true
    this.clearRefreshTimer()
  }

  handleWindowChange = e => {
    this.setState({ window: e.target.value }, () => this.refreshNow({ showLoading: true }))
  }

  handleRefreshIntervalChange = refreshInterval => {
    this.setState({ refreshInterval }, () => this.refreshNow())
  }

  bootstrapPage = async () => {
    this.loadAppServices()
    await this.refreshPageData({ showLoading: true })
    this.startRefreshTimer()
  }

  clearRefreshTimer = () => {
    if (this.realtimeTimer) {
      clearTimeout(this.realtimeTimer)
      this.realtimeTimer = null
    }
  }

  startRefreshTimer = () => {
    this.clearRefreshTimer()
    if (this.unmounted) {
      return
    }
    this.realtimeTimer = setTimeout(this.handleScheduledRefresh, this.state.refreshInterval)
  }

  handleScheduledRefresh = async () => {
    this.realtimeTimer = null
    await this.refreshPageData()
    this.startRefreshTimer()
  }

  refreshNow = async (options = {}) => {
    this.clearRefreshTimer()
    await this.refreshPageData(options)
    this.startRefreshTimer()
  }

  refreshPageData = async (options = {}) => {
    if (this.pageRefreshing) {
      return
    }
    this.pageRefreshing = true
    const requestOptions = {
      ...options,
      queryNow: Date.now(),
    }
    try {
      await Promise.allSettled([
        this.fetchRealtimeData(requestOptions),
        this.fetchSLA(requestOptions),
        this.fetchTopErrors(requestOptions),
        this.fetchTopLatency(requestOptions),
        this.fetchComponents(requestOptions),
      ])
    } finally {
      this.pageRefreshing = false
    }
  }

  safeRequest = promise => promise.then(response => ({ response })).catch(error => ({ error }))

  setSectionLoading = (key, value) => {
    this.setState(prevState => ({
      loading: {
        ...prevState.loading,
        [key]: value,
      },
    }))
  }

  setSectionWarnings = (key, warnings = []) => {
    this.setState(prevState => ({
      warnings: {
        ...prevState.warnings,
        [key]: warnings,
      },
    }))
  }

  runSectionRequest = async (key, options, request) => {
    this.refreshingSections = this.refreshingSections || {}
    if (this.refreshingSections[key]) {
      return
    }
    this.refreshingSections[key] = true
    if (options.showLoading) {
      this.setSectionLoading(key, true)
    }
    try {
      await request()
    } finally {
      if (options.showLoading) {
        this.setSectionLoading(key, false)
      }
      this.refreshingSections[key] = false
    }
  }

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

  fetchSLA = async (options = {}) => {
    const context = resolveAppContext(this.props)
    const { window } = this.state
    if (!context.appID) {
      this.setSectionWarnings('app', ['缺少当前应用 ID，无法查询应用级网络监控'])
      return
    }
    await this.runSectionRequest('sla', options, async () => {
      const params = buildWindowQueryParams(window, { limit: 10 }, options.queryNow)
      const result = await this.safeRequest(getAppSLA(context.appID, params))
      this.setState({ sla: this.getResultData(result, {}) })
      this.setSectionWarnings('sla', this.getResultWarnings(result, '应用 SLA 暂时不可用'))
    })
  }

  fetchTopErrors = async (options = {}) => {
    const context = resolveAppContext(this.props)
    const { window } = this.state
    if (!context.appID) {
      this.setSectionWarnings('app', ['缺少当前应用 ID，无法查询应用级网络监控'])
      return
    }
    await this.runSectionRequest('topErrors', options, async () => {
      const result = await this.safeRequest(getAppTopErrors(context.appID, buildWindowQueryParams(window, { limit: 5 }, options.queryNow)))
      this.setState({ topErrors: this.getResultList(result) })
      this.setSectionWarnings('topErrors', this.getResultWarnings(result, '应用内部错误路由排序暂时不可用'))
    })
  }

  fetchTopLatency = async (options = {}) => {
    const context = resolveAppContext(this.props)
    const { window } = this.state
    if (!context.appID) {
      this.setSectionWarnings('app', ['缺少当前应用 ID，无法查询应用级网络监控'])
      return
    }
    await this.runSectionRequest('topLatency', options, async () => {
      const result = await this.safeRequest(getAppTopLatency(context.appID, buildWindowQueryParams(window, { limit: 5 }, options.queryNow)))
      this.setState({ topLatency: this.getResultList(result) })
      this.setSectionWarnings('topLatency', this.getResultWarnings(result, '应用内部慢路由排序暂时不可用'))
    })
  }

  fetchComponents = async (options = {}) => {
    const context = resolveAppContext(this.props)
    const { window } = this.state
    if (!context.appID) {
      this.setSectionWarnings('app', ['缺少当前应用 ID，无法查询应用级网络监控'])
      return
    }
    await this.runSectionRequest('components', options, async () => {
      const result = await this.safeRequest(getAppComponentSummary(context.appID, buildWindowQueryParams(window, { limit: 50 }, options.queryNow)))
      this.setState({ components: this.getResultList(result) })
      this.setSectionWarnings('components', this.getResultWarnings(result, '应用组件汇总暂时不可用'))
    })
  }

  fetchRealtimeData = async (options = {}) => {
    const context = resolveAppContext(this.props)
    if (!context.appID) {
      return
    }
    const { window } = this.state
    try {
      const [overview, trend] = await Promise.all([
        this.safeRequest(getAppOverview(context.appID, buildWindowQueryParams(window, { limit: 10 }, options.queryNow))),
        this.safeRequest(getAppOverviewTrend(context.appID, buildWindowQueryParams(window, {}, options.queryNow))),
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
    if (rate <= 0) {
      return {
        className: styles.slaValueWarning,
        tagColor: 'default',
        tagText: '等待采样',
      }
    }
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

  openSLAConfig = async () => {
    const context = resolveAppContext(this.props)
    if (!context.appID) {
      message.warning('缺少当前应用 ID，无法配置 SLA')
      return
    }
    this.setState({
      slaConfigVisible: true,
      slaDomainLoading: true,
      slaDomainWarning: '',
      slaSelectedDomain: '',
      slaSelectedScheme: 'http',
    })
    let config = {}
    try {
      const response = await getAppSLAConfig(context.appID)
      config = getResponseData(response) || {}
    } catch (error) {
      config = this.state.sla || {}
    }
    this.loadSLAGatewayDomains(config)
  }

  closeSLAConfig = () => {
    this.setState({ slaConfigVisible: false })
  }

  loadSLAGatewayDomains = config => {
    const context = resolveAppContext(this.props)
    const dispatch = this.props?.dispatch
    if (!context.teamName || !context.appID || typeof dispatch !== 'function') {
      this.setState({
        slaDomains: [],
        slaDomainLoading: false,
        slaDomainSelectionRequired: false,
        slaDomainWarning: '无法获取应用网关域名，请确认当前页面已加载团队和应用上下文。',
      })
      return
    }
    dispatch({
      type: 'gateWay/getApiGatewayList',
      payload: {
        teamName: context.teamName,
        appID: context.appID,
        type: 'http',
        query: '',
      },
      callback: res => {
        const normalized = normalizeSLAGatewayDomains(res?.list || getConsoleResponseList(res))
        const configuredDomain = displayText(config?.domain, this.state.sla?.domain)
        const configuredScheme = displayText(config?.scheme, this.state.sla?.scheme, 'http').toLowerCase()
        const selected = normalized.items.find(item => item.domain === configuredDomain && item.scheme === configuredScheme) ||
          normalized.items.find(item => item.domain === configuredDomain) ||
          (normalized.items.length === 1 ? normalized.items[0] : null)
        this.setState({
          slaDomains: normalized.items,
          slaDomainLoading: false,
          slaDomainSelectionRequired: normalized.selection_required,
          slaDomainWarning: normalized.items.length ? '' : '当前应用没有可用于 SLA 的 HTTP 网关域名。',
          slaSelectedDomain: selected?.domain || '',
          slaSelectedScheme: selected?.scheme || configuredScheme || 'http',
        })
      },
      handleError: () => {
        this.setState({
          slaDomains: [],
          slaDomainLoading: false,
          slaDomainSelectionRequired: false,
          slaDomainWarning: '获取应用网关域名失败，请稍后重试。',
        })
      },
    })
  }

  handleSLADomainChange = value => {
    const item = this.state.slaDomains.find(domain => `${domain.scheme}://${domain.domain}` === value)
    this.setState({
      slaSelectedDomain: item?.domain || '',
      slaSelectedScheme: item?.scheme || 'http',
    })
  }

  saveSLAConfig = async () => {
    const context = resolveAppContext(this.props)
    const domain = this.state.slaSelectedDomain
    const selected = this.state.slaDomains.find(item => item.domain === domain && item.scheme === this.state.slaSelectedScheme)
    if (!selected) {
      message.warning('请选择 SLA 主域名')
      return
    }
    this.setState({ slaConfigSaving: true })
    try {
      await saveAppSLAConfig(context.appID, {
        domain: selected.domain,
        scheme: selected.scheme,
      })
      message.success('SLA 主域名已保存')
      this.setState({ slaConfigVisible: false })
      this.refreshNow()
    } catch (error) {
      message.error('保存 SLA 主域名失败')
    } finally {
      this.setState({ slaConfigSaving: false })
    }
  }

  deleteSLAConfig = async () => {
    const context = resolveAppContext(this.props)
    this.setState({ slaConfigSaving: true })
    try {
      await deleteAppSLAConfig(context.appID)
      message.success('SLA 健康检查已停用')
      this.setState({
        slaConfigVisible: false,
        slaSelectedDomain: '',
        slaSelectedScheme: 'http',
      })
      this.refreshNow()
    } catch (error) {
      message.error('停用 SLA 健康检查失败')
    } finally {
      this.setState({ slaConfigSaving: false })
    }
  }

  renderSLA() {
    const { sla } = this.state
    const configured = Boolean(sla.configured)
    const hasSamples = Number(sla.total_checks || 0) > 0
    const availableRatio = Number(sla.available_ratio ?? sla.current ?? 0)
    const unavailableRatio = Number(sla.unavailable_ratio ?? (hasSamples ? 1 - availableRatio : 0))
    const current = configured && hasSamples ? formatPercent(availableRatio) : '--'
    const target = formatPercent(sla.target || 0.99)
    const status = configured && hasSamples ? this.getSLAStatus(availableRatio) : {
      className: styles.slaValueWarning,
      tagColor: configured ? 'processing' : 'default',
      tagText: configured ? '等待采样' : '未配置',
    }
    const lastUnavailable = sla.last_unavailable_at
      ? new Date(Number(sla.last_unavailable_at) * 1000).toLocaleString()
      : '暂无不可用记录'
    const domainText = displayText(sla.domain, sla.url, '-')
    return (
      <Card className={styles.slaCard}>
        <div className={styles.slaHeader}>
          <div>
            <div className={styles.slaTitleRow}>
              <div className={styles.metricTitle}>应用 SLA</div>
              <Tooltip title="配置 SLA 主域名">
                <Button
                  className={styles.slaSettingButton}
                  icon={<SettingOutlined />}
                  size="small"
                  type="text"
                  onClick={this.openSLAConfig}
                />
              </Tooltip>
            </div>
            <div className={`${styles.slaValue} ${status.className}`}>{current}</div>
          </div>
          <Tag color={status.tagColor}>{status.tagText}</Tag>
        </div>
        <div className={styles.slaMeta}>
          <div className={styles.slaMetaItem}>
            <span className={styles.slaMetaKey}>可用时间占比</span>
            <span className={`${styles.slaMetaValue} ${styles.slaMetaValueSuccess}`}>{configured && hasSamples ? formatPercent(availableRatio) : '--'}</span>
          </div>
          <div className={styles.slaMetaItem}>
            <span className={styles.slaMetaKey}>不可用时间占比</span>
            <span className={`${styles.slaMetaValue} ${styles.slaMetaValueError}`}>{configured && hasSamples ? formatPercent(unavailableRatio) : '--'}</span>
          </div>
          <div className={styles.slaMetaItem}>
            <span className={styles.slaMetaKey}>目标</span>
            <span className={`${styles.slaMetaValue} ${styles.slaMetaValueTarget}`}>{target}</span>
          </div>
        </div>
        <div className={styles.slaMetaSecondary}>
          <span>监测域名 {domainText}</span>
        </div>
        <div className={styles.slaDesc}>
          {configured
            ? `最近不可用时间：${lastUnavailable}。`
            : '未配置 SLA 主域名，无法计算应用 SLA。点击齿轮后从应用 HTTP 网关域名中选择主域名即可。'}
        </div>
      </Card>
    )
  }

  renderSLAConfigModal() {
    const {
      slaConfigSaving,
      slaConfigVisible,
      sla,
      slaDomains,
      slaDomainLoading,
      slaDomainSelectionRequired,
      slaDomainWarning,
      slaSelectedDomain,
      slaSelectedScheme,
    } = this.state
    const selectedValue = slaSelectedDomain ? `${slaSelectedScheme}://${slaSelectedDomain}` : undefined
    return (
      <Modal
        title="应用 SLA 主域名"
        open={slaConfigVisible}
        onCancel={this.closeSLAConfig}
        onOk={this.saveSLAConfig}
        confirmLoading={slaConfigSaving}
        okText="保存"
        cancelText="取消"
        footer={[
          <Button key="delete" danger disabled={!sla.configured} loading={slaConfigSaving} onClick={this.deleteSLAConfig}>
            停用
          </Button>,
          <Button key="cancel" onClick={this.closeSLAConfig}>取消</Button>,
          <Button key="save" type="primary" loading={slaConfigSaving} onClick={this.saveSLAConfig}>保存</Button>,
        ]}
      >
        <div className={styles.slaConfigForm}>
          <label className={styles.slaConfigLabel}>主域名</label>
          <Select
            value={selectedValue}
            placeholder="请选择主域名"
            loading={slaDomainLoading}
            disabled={!slaDomains.length}
            onChange={this.handleSLADomainChange}
            optionLabelProp="label"
          >
            {slaDomains.map(item => (
              <Select.Option key={`${item.scheme}://${item.domain}`} value={`${item.scheme}://${item.domain}`} label={item.domain}>
                <div className={styles.slaDomainOption}>
                  <span className={styles.slaDomainName}>{item.domain}</span>
                  <span className={styles.slaDomainMeta}>{item.scheme.toUpperCase()}{item.component_name ? ` · ${item.component_name}` : ''}</span>
                </div>
              </Select.Option>
            ))}
          </Select>
          {slaDomainWarning ? (
            <Alert type="warning" showIcon message={slaDomainWarning} />
          ) : (
            <Alert
              type="info"
              showIcon
              message={slaDomainSelectionRequired ? '检测到多个应用 HTTP 网关域名，请选择一个作为 SLA 主域名。' : '检测到单个应用 HTTP 网关域名，系统已自动选中。'}
            />
          )}
          <div className={styles.slaConfigHint}>
            系统固定每 10 秒检查一次，3 秒超时，HTTP 200-399 视为成功，SLA 目标为 99%，数据保留 30 天。
          </div>
        </div>
      </Modal>
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
        title: '平均延迟',
        value: formatLatency(overview.avg_latency_ms),
        metric: 'avg_latency_ms',
        format: formatLatency,
        description: '平均延迟表示应用处理请求并返回响应所花费的平均时间。',
      },
      {
        title: '整体错误率',
        value: formatPercent(overview.error_rate),
        metric: 'error_rate',
        format: formatPercent,
        description: '整体错误率表示应用失败请求在全部请求中的占比。',
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

  getRecordComponentID = record => resolveRecordComponentID(record)

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
      title: '内部路由请求',
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
      title: '内部路由错误',
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
    const notice = Object.values(warnings || {}).reduce((items, current) => items.concat(current || []), [])
    if (realtimeWarning) {
      notice.push(realtimeWarning)
    }
    return (
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div>
            <div className={styles.pageTitle}>流量分析</div>
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
            <Spin spinning={Boolean(loading.sla)}>{this.renderSLA()}</Spin>
          </Col>
          <Col xs={24} lg={16}>
            <Row gutter={[12, 12]}>{this.renderMetricCards()}</Row>
          </Col>
        </Row>

        <Row gutter={[12, 12]} className={styles.contentGrid}>
          <Col xs={24}>
            <Spin spinning={Boolean(loading.components)}>
              {this.renderComponentTable()}
            </Spin>
          </Col>
        </Row>
        <Row gutter={[12, 12]} className={styles.contentGrid}>
          <Col xs={24} lg={12}>
            <Spin spinning={Boolean(loading.topLatency)}>
              {this.renderLatencyRouteTable(topLatency)}
            </Spin>
          </Col>
          <Col xs={24} lg={12}>
            <Spin spinning={Boolean(loading.topErrors)}>
              {this.renderErrorRouteTable(topErrors)}
            </Spin>
          </Col>
        </Row>
        {this.renderSLAConfigModal()}
      </div>
    )
  }
}
