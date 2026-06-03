import React, { Component } from 'react'
import { Alert, Card, Col, Descriptions, Empty, Modal, Radio, Row, Spin, Table, Tag } from 'antd'
import {
  getPlatformNodeDetail,
  getPlatformNodeSummary,
  getPlatformOverview,
  getPlatformTopErrors,
  getPlatformTopLatency,
} from '../../api'
import {
  WINDOW_OPTIONS,
  formatBytes,
  formatLatency,
  formatNumber,
  formatPercent,
  formatPercentValue,
  getResponseData,
  getResponseList,
  getResponseWarnings,
} from '../../utils/networkMonitoring'
import styles from './index.less'

export default class index extends Component {
  constructor(props) {
    super(props)
    this.state = {
      window: '5m',
      loading: false,
      overview: {},
      topErrors: [],
      topLatency: [],
      nodes: [],
      nodeDetail: {},
      nodeDetailVisible: false,
      nodeDetailLoading: false,
      warnings: [],
    }
  }

  componentDidMount() {
    this.fetchData()
  }

  componentWillUnmount() {
    if (this.timer) {
      clearInterval(this.timer)
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
      const [overview, topErrors, topLatency, nodes] = await Promise.all([
        getPlatformOverview(params),
        getPlatformTopErrors(params),
        getPlatformTopLatency(params),
        getPlatformNodeSummary({ window }),
      ])
      this.setState({
        overview: getResponseData(overview),
        topErrors: getResponseList(topErrors),
        topLatency: getResponseList(topLatency),
        nodes: getResponseList(nodes),
        warnings: [
          ...getResponseWarnings(overview),
          ...getResponseWarnings(topErrors),
          ...getResponseWarnings(topLatency),
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

  renderMetricCards() {
    const { overview } = this.state
    const cards = [
      { title: '总请求量', value: formatNumber(overview.request_count) },
      { title: '出口流量速率', value: formatBytes(overview.egress_bytes_per_sec) },
      { title: '整体错误率', value: formatPercent(overview.error_rate) },
      { title: '平均延迟', value: formatLatency(overview.avg_latency_ms) },
    ]
    return (
      <Row gutter={[12, 12]}>
        {cards.map(item => (
          <Col xs={24} sm={12} lg={6} key={item.title}>
            <Card className={styles.metricCard}>
              <div className={styles.metricTitle}>{item.title}</div>
              <div className={styles.metricValue}>{item.value}</div>
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
    const { loading, topErrors, topLatency, warnings, window } = this.state
    return (
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <div>
            <div className={styles.pageTitle}>平台级网络监控</div>
            <div className={styles.pageDesc}>聚焦整个平台入口流量、错误热点和延迟热点</div>
          </div>
          <Radio.Group value={window} onChange={this.handleWindowChange} optionType="button" buttonStyle="solid">
            {WINDOW_OPTIONS.map(item => (
              <Radio.Button key={item.value} value={item.value}>{item.label}</Radio.Button>
            ))}
          </Radio.Group>
        </div>

        {warnings.length > 0 && (
          <Alert className={styles.notice} type="warning" showIcon message={warnings.join('；')} />
        )}

        <Spin spinning={loading}>
          {this.renderMetricCards()}
          <Row gutter={[12, 12]} className={styles.contentGrid}>
            <Col xs={24} lg={12}>
              {this.renderRouteTable('错误内部路由 Top10', topErrors, 'errors')}
            </Col>
            <Col xs={24} lg={12}>
              {this.renderRouteTable('耗时内部路由 Top10', topLatency, 'latency')}
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
