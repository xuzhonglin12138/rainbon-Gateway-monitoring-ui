import React from 'react'
import styles from './index.less'

const WIDTH = 160
const HEIGHT = 42
const PADDING = 3

const getTrendPath = values => {
  if (!values.length) {
    return ''
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const innerWidth = WIDTH - PADDING * 2
  const innerHeight = HEIGHT - PADDING * 2
  return values.map((value, index) => {
    const x = PADDING + (values.length === 1 ? innerWidth : (index * innerWidth) / (values.length - 1))
    const y = PADDING + innerHeight - ((value - min) / range) * innerHeight
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')
}

const MetricTrend = ({ points = [], metric }) => {
  const values = points
    .map(point => Number(point?.[metric] || 0))
    .filter(value => Number.isFinite(value))

  if (!values.length) {
    return <div className={styles.empty}>暂无趋势</div>
  }

  const path = getTrendPath(values)
  const lastValue = values[values.length - 1]
  const previousValue = values.length > 1 ? values[values.length - 2] : lastValue
  const isUp = lastValue >= previousValue

  return (
    <div className={styles.trend}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        <path d={path} className={isUp ? styles.pathUp : styles.pathDown} />
      </svg>
    </div>
  )
}

export default MetricTrend
