import React, { Component } from 'react'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import styles from './index.less'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const METRIC_LABELS = {
  request_per_second: '请求速率',
  egress_bytes_per_sec: '出口流量',
  error_rate: '错误率',
  avg_latency_ms: '平均延迟',
}

const METRIC_COLORS = {
  request_per_second: '#2E70EB',
  egress_bytes_per_sec: '#17A34A',
  avg_latency_ms: '#EBB30B',
  error_rate: '#DC2627',
}

const getMetricColor = metric => METRIC_COLORS[metric] || '#708090'

const alphaColor = (color, alpha) => {
  const hex = color.trim()
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const red = parseInt(hex.slice(1, 3), 16)
    const green = parseInt(hex.slice(3, 5), 16)
    const blue = parseInt(hex.slice(5, 7), 16)
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`
  }
  const rgbMatch = hex.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`
  }
  return color
}

const formatBytesPerSecond = value => {
  const number = Number(value || 0)
  if (number >= 1024 * 1024) {
    return `${(number / 1024 / 1024).toFixed(2)} MiB/s`
  }
  if (number >= 1024) {
    return `${(number / 1024).toFixed(2)} KiB/s`
  }
  return `${number.toFixed(0)} B/s`
}

const formatMetricValue = (metric, value) => {
  const number = Number(value || 0)
  if (metric === 'egress_bytes_per_sec') {
    return formatBytesPerSecond(number)
  }
  if (metric === 'error_rate') {
    return `${(number * 100).toFixed(2)}%`
  }
  if (metric === 'avg_latency_ms') {
    return `${number.toFixed(1)} ms`
  }
  return `${number.toFixed(2)} req/s`
}

const toChartData = (points, metric) => (points || [])
  .map(point => {
    const timestamp = Number(point?.timestamp || 0)
    const value = Number(point?.[metric] || 0)
    if (!timestamp || !Number.isFinite(value)) {
      return null
    }
    return [timestamp * 1000, value]
  })
  .filter(Boolean)

const splitChartData = (points, metric) => {
  const closedPoints = (points || []).filter(point => !point?.partial)
  const partialPoint = [...(points || [])].reverse().find(point => point?.partial)
  const closedData = toChartData(closedPoints, metric)
  const partialData = partialPoint ? toChartData([partialPoint], metric) : []
  if (!partialData.length) {
    return { closedData, previewData: [] }
  }
  const previousPoint = closedData.length ? closedData[closedData.length - 1] : null
  return {
    closedData,
    previewData: previousPoint ? [previousPoint, partialData[0]] : partialData,
  }
}

const getSeriesValues = data => data
  .map(item => Number(item?.[1] || 0))
  .filter(value => Number.isFinite(value))

const getYAxisBounds = data => {
  const values = getSeriesValues(data)
  if (!values.length) {
    return {}
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) {
    if (max === 0) {
      return { min: 0, max: 1 }
    }
    return { min: Math.max(0, min * 0.9), max: max * 1.1 }
  }
  const padding = (max - min) * 0.12
  return { min: Math.max(0, min - padding), max: max + padding }
}

const getSeriesStyle = color => ({
  lineStyle: {
    width: 1.8,
    color,
    cap: 'round',
    join: 'round',
  },
  areaStyle: {
    origin: 'start',
    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: alphaColor(color, 0.22) },
      { offset: 0.72, color: alphaColor(color, 0.09) },
      { offset: 1, color: alphaColor(color, 0.02) },
    ]),
  },
})

class MetricTrend extends Component {
  componentDidMount() {
    this.observeSize()
    this.scheduleUpdate()
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize)
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.points !== this.props.points || prevProps.metric !== this.props.metric) {
      this.scheduleUpdate()
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize)
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.updateFrame) {
      cancelAnimationFrame(this.updateFrame)
      this.updateFrame = null
    }
    if (this.chart) {
      this.chart.dispose()
      this.chart = null
    }
    this.baseOptionReady = false
    this.optionMetric = ''
  }

  setWrapperRef = node => {
    this.wrapper = node
    this.observeSize()
  }

  setContainerRef = node => {
    this.container = node
    this.scheduleUpdate()
  }

  handleResize = () => {
    if (this.chart) {
      this.chart.resize()
    }
  }

  observeSize() {
    if (!this.wrapper || this.resizeObserver || typeof ResizeObserver === 'undefined') {
      return
    }
    this.resizeObserver = new ResizeObserver(() => {
      this.scheduleUpdate()
      this.handleResize()
    })
    this.resizeObserver.observe(this.wrapper)
  }

  scheduleUpdate() {
    if (typeof window === 'undefined') {
      this.updateChart()
      return
    }
    if (this.updateFrame) {
      cancelAnimationFrame(this.updateFrame)
    }
    this.updateFrame = requestAnimationFrame(() => {
      this.updateFrame = null
      this.updateChart()
    })
  }

  mountChart() {
    if (!this.container || this.chart) {
      return
    }
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (width < 2 || height < 2) {
      return
    }
    this.chart = echarts.init(this.container, null, { renderer: 'canvas' })
  }

  ensureBaseOption(metric) {
    if (!this.chart || (this.baseOptionReady && this.optionMetric === metric)) {
      return
    }
    this.optionMetric = metric
    this.chart.setOption({
      animation: false,
      grid: { left: 2, right: 2, top: 8, bottom: 6 },
      tooltip: {
        trigger: 'axis',
        confine: true,
        appendToBody: true,
        formatter: params => {
          const item = params && params[0]
          if (!item) {
            return ''
          }
          const time = new Date(item.value[0]).toLocaleTimeString()
          return `${time}<br/>${METRIC_LABELS[metric] || metric}: ${formatMetricValue(metric, item.value[1])}`
        },
      },
      xAxis: {
        type: 'time',
        show: false,
        boundaryGap: false,
      },
      yAxis: {
        type: 'value',
        show: false,
        scale: true,
      },
      series: [
        {
          id: 'metric-trend-line',
          type: 'line',
          data: [],
          showSymbol: false,
          smooth: true,
          connectNulls: true,
          clip: true,
          animation: false,
        },
        {
          id: 'metric-trend-preview',
          type: 'line',
          data: [],
          showSymbol: false,
          smooth: true,
          connectNulls: true,
          clip: true,
          animation: false,
        },
      ],
    }, { notMerge: false, lazyUpdate: true })
    this.baseOptionReady = true
  }

  updateChart() {
    const { points = [], metric } = this.props
    const { closedData, previewData } = splitChartData(points, metric)
    const displayData = closedData.length ? closedData : previewData
    if (!displayData.length) {
      if (this.chart) {
        this.chart.clear()
        this.baseOptionReady = false
      }
      return
    }
    this.mountChart()
    if (!this.chart) {
      return
    }
    const color = getMetricColor(metric)
    const yAxisBounds = getYAxisBounds(closedData.length ? closedData : previewData)
    this.ensureBaseOption(metric)
    this.chart.setOption({
      yAxis: {
        type: 'value',
        show: false,
        scale: true,
        ...yAxisBounds,
      },
      series: [
        {
          id: 'metric-trend-line',
          type: 'line',
          data: closedData,
          animation: false,
          ...getSeriesStyle(color),
        },
        {
          id: 'metric-trend-preview',
          type: 'line',
          data: previewData,
          showSymbol: false,
          smooth: true,
          connectNulls: true,
          animation: false,
          lineStyle: {
            width: 1.8,
            color,
            cap: 'round',
            join: 'round',
          },
          itemStyle: { color },
          areaStyle: {
            origin: 'start',
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: alphaColor(color, 0.22) },
              { offset: 0.72, color: alphaColor(color, 0.09) },
              { offset: 1, color: alphaColor(color, 0.02) },
            ]),
          },
        },
      ],
    }, { notMerge: false, lazyUpdate: true })
  }

  render() {
    const { closedData, previewData } = splitChartData(this.props.points, this.props.metric)
    const hasData = closedData.length || previewData.length
    return (
      <div ref={this.setWrapperRef} className={styles.trend}>
        {!hasData && <div className={styles.empty}>暂无趋势</div>}
        <div ref={this.setContainerRef} className={styles.chart} />
      </div>
    )
  }
}

export default MetricTrend
