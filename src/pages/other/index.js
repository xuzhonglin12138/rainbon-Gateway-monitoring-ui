import React, { Component } from 'react'
import { Alert, Card, Col, Empty, Radio, Row, Spin, Table, Tag } from 'antd'
import {
  getAppComponentSummary,
  getAppOverview,
  getAppRouteSummary,
  getAppSLA,
  getAppTopErrors,
  getAppTopLatency,
  syncAppHTTPLogger,
} from '../../api'
import {
  WINDOW_OPTIONS,
  formatBytes,
  formatLatency,
  formatNumber,
  formatPercent,
  getResponseData,
  getResponseList,
  getResponseWarnings,
  resolveAppContext,
} from '../../utils/networkMonitoring'
import styles from './index.less'

export default class index extends Component {
  constructor(props) {
    super(props)
    this.state = {
      window: '5m',
      loading: false,
      overview: {},
      sla: {},
      summary: [],
      topErrors: [],
      topLatency: [],
      components: [],
      warnings: [],
      syncMessage: '',
    }
  }

  componentDidMount() {
    this.syncHTTPLogger()
    this.fetchData()
  }

  handleWindowChange = e => {
    this.setState({ window: e.target.value }, this.fetchData)
  }

  syncHTTPLogger = async () => {
    const context = resolveAppContext(this.props)
    if (!context.appID || !context.namespace) {
      this.setState({ syncMessage: '当前应用或团队 namespace 不完整，暂未触发 http-logger 同步' })
      return
    }
    try {
      await syncAppHTTPLogger(context.appID, {
        namespace: context.namespace,
        region_app_id: context.regionAppID,
      })
      this.setState({ syncMessage: '' })
    } catch (error) {
      this.setState({ syncMessage: 'Route 级 http-logger 同步暂时失败，页面仍会读取已有聚合数据' })
    }
  }

  fetchData = async () => {
    const context = resolveAppContext(this.props)
    const { window } = this.state
    if (!context.appID) {
      this.setState({ warnings: ['缺少当前应用 ID，无法查询应用级网络监控'] })
      return
    }
    this.setState({ loading: true })
    try {
      const params = { window, limit: 10 }
      const [overview, sla, summary, topErrors, topLatency, components] = await Promise.all([
        getAppOverview(context.appID, params),
        getAppSLA(context.appID, params),
        getAppRouteSummary(context.appID, params),
        getAppTopErrors(context.appID, params),
        getAppTopLatency(context.appID, params),
        getAppComponentSummary(context.appID, { window, limit: 50 }),
      ])
      this.setState({
        overview: getResponseData(overview),
        sla: getResponseData(sla),
        summary: getResponseList(summary),
        topErrors: getResponseList(topErrors),
        topLatency: getResponseList(topLatency),
        components: getResponseList(components),
        warnings: [
          ...getResponseWarnings(overview),
          ...getResponseWarnings(sla),
          ...getResponseWarnings(summary),
          ...getResponseWarnings(topErrors),
          ...getResponseWarnings(topLatency),
          ...getResponseWarnings(components),
        ],
      })
    } catch (error) {
      this.setState({ warnings: ['应用级网络监控数据暂时不可用'] })
    } finally {
      this.setState({ loading: false })
    }
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
    const { overview } = this.state
    const cards = [
      { title: '应用总请求量', value: formatNumber(overview.request_count) },
      { title: '出口流量速率', value: formatBytes(overview.egress_bytes_per_sec) },
      { title: '整体错误率', value: formatPercent(overview.error_rate) },
      { title: '平均延迟', value: formatLatency(overview.avg_latency_ms) },
    ]
    return cards.map(item => (
      <Col xs={24} sm={12} lg={6} key={item.title}>
        <Card className={styles.metricCard}>
          <div className={styles.metricTitle}>{item.title}</div>
          <div className={styles.metricValue}>{item.value}</div>
        </Card>
      </Col>
    ))
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
          rowKey={(record, index) => `${record.route_group || 'route'}-${index}`}
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无聚合数据" /> }}
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
        render: value => <span className={styles.routeText}>{value || '-'}</span>,
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
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无组件聚合数据" /> }}
        />
      </Card>
    )
  }

  render() {
    const { loading, summary, topErrors, topLatency, warnings, syncMessage, window } = this.state
    const context = resolveAppContext(this.props)
    const notice = [...warnings]
    if (syncMessage) {
      notice.push(syncMessage)
    }
    return (
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div>
            <div className={styles.pageTitle}>应用级网络监控</div>
            <div className={styles.pageDesc}>{context.name} · {context.namespace || 'namespace 未识别'}</div>
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
          <Row gutter={[12, 12]}>
            <Col xs={24} lg={8}>{this.renderSLA()}</Col>
            <Col xs={24} lg={16}>
              <Row gutter={[12, 12]}>{this.renderMetricCards()}</Row>
            </Col>
          </Row>
          <Row gutter={[12, 12]} className={styles.contentGrid}>
            <Col xs={24} lg={8}>
              {this.renderRouteTable('内部路由请求 Top10', summary, 'requests')}
            </Col>
            <Col xs={24} lg={8}>
              {this.renderRouteTable('内部路由错误 Top10', topErrors, 'errors')}
            </Col>
            <Col xs={24} lg={8}>
              {this.renderRouteTable(window === '5m' ? '过去 5 分钟耗时排行' : '耗时排行', topLatency, 'latency')}
            </Col>
          </Row>
          <div className={styles.contentGrid}>
            {this.renderComponentTable()}
          </div>
        </Spin>
      </div>
    )
  }
}
