import React, { Component } from 'react'
import { Alert, Card, Col, Empty, Radio, Row, Spin, Table, Tag } from 'antd'
import {
  getComponentInternalRoutes,
  getComponentOverview,
  getComponentOverviewTrend,
  setNetworkMonitoringBaseInfo,
} from '../../api'
import MetricTrend from '../../components/MetricTrend'
import {
  WINDOW_OPTIONS,
  formatBytes,
  formatLatency,
  formatNumber,
  formatPercent,
  getResponseData,
  getResponseList,
  getResponseTrendPoints,
  getResponseWarnings,
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
      loading: false,
      realtimeLoading: false,
      overview: {},
      trendPoints: [],
      routes: [],
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
    const context = resolveComponentContext(this.props)
    const { window } = this.state
    if (!context.componentID) {
      this.setState({ warnings: ['缺少当前组件 ID，无法查询组件级网络监控'] })
      return
    }
    this.setState({ loading: true })
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
      this.setState({ loading: false })
    }
  }

  fetchRealtimeData = async () => {
    const context = resolveComponentContext(this.props)
    if (!context.componentID) {
      return
    }
    this.setState({ realtimeLoading: true })
    try {
      const [overview, trend] = await Promise.all([
        getComponentOverview(context.componentID, { window: '5m', limit: 50 }),
        getComponentOverviewTrend(context.componentID),
      ])
      this.setState({
        overview: getResponseData(overview),
        trendPoints: getResponseTrendPoints(trend),
        realtimeWarning: '',
      })
    } catch (error) {
      this.setState({ realtimeWarning: '组件级实时网络指标暂时不可用' })
    } finally {
      this.setState({ realtimeLoading: false })
    }
  }

  renderMetricCards() {
    const { overview, realtimeLoading, trendPoints } = this.state
    const cards = [
      { title: '总请求量', value: formatNumber(overview.request_count), metric: 'request_per_second' },
      { title: '出口流量速率', value: formatBytes(overview.network_transmit_bps || overview.egress_bytes_per_sec), metric: 'egress_bytes_per_sec' },
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

  renderRouteTable(title, dataSource, type) {
    const columns = [
      {
        title: '内部路由',
        dataIndex: 'route_group',
        key: 'route_group',
        render: value => <span className={styles.routeText}>{value || '-'}</span>,
      },
      {
        title: type === 'latency' ? '平均耗时' : '错误率',
        dataIndex: type === 'latency' ? 'avg_latency_ms' : 'error_rate',
        key: 'primary',
        width: 140,
        render: value => type === 'latency' ? formatLatency(value) : formatPercent(value),
      },
      {
        title: '调用次数',
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
          rowKey={(record, index) => `${record.route_group || 'route'}-${index}`}
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无聚合数据" /> }}
        />
      </Card>
    )
  }

  render() {
    const { loading, overview, realtimeWarning, routes, warnings, window } = this.state
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
            <Col xs={24} lg={12}>
              {this.renderRouteTable('错误排行', errorRoutes, 'errors')}
            </Col>
            <Col xs={24} lg={12}>
              {this.renderRouteTable(window === '5m' ? '过去 5 分钟耗时排行' : '耗时排行', latencyRoutes, 'latency')}
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
