export const WINDOW_OPTIONS = [
  { label: '最近 5 分钟', value: '5m' },
  { label: '最近 10 分钟', value: '10m' },
  { label: '最近 30 分钟', value: '30m' },
]

export const getResponseData = response => response?.data?.data || {}

export const getResponseList = response => {
  const data = response?.data?.data
  return Array.isArray(data) ? data : []
}

export const getResponseWarnings = response => response?.data?.warnings || []

export const formatNumber = value => {
  const num = Number(value || 0)
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`
  }
  return num.toFixed(num % 1 === 0 ? 0 : 2)
}

export const formatPercent = value => `${(Number(value || 0) * 100).toFixed(2)}%`

export const formatPercentValue = value => `${Number(value || 0).toFixed(2)}%`

export const formatLatency = value => `${Number(value || 0).toFixed(2)} ms`

export const formatBytes = value => {
  const num = Number(value || 0)
  if (num >= 1024 * 1024) {
    return `${(num / 1024 / 1024).toFixed(2)} MiB/s`
  }
  if (num >= 1024) {
    return `${(num / 1024).toFixed(2)} KiB/s`
  }
  return `${num.toFixed(2)} B/s`
}

export const resolveAppContext = props => {
  const baseInfo = props?.baseInfo || {}
  const appDetail = baseInfo.appDetail || props?.appDetail || props?.groupDetail || {}
  const service = appDetail.service || {}
  const globalUtile = props?.globalUtile || {}
  const appID = props?.appID ||
    props?.group_id ||
    props?.groupId ||
    appDetail.group_id ||
    service.group_id ||
    (typeof globalUtile.getAppID === 'function' ? globalUtile.getAppID() : '')

  return {
    appID,
    regionAppID: appDetail.region_app_id || appDetail.app_id || service.group_id || appID,
    namespace: baseInfo.namespace || appDetail.namespace || service.namespace || '',
    name: appDetail.group_name || appDetail.group_alias || appDetail.app_name || service.group_name || appID || '当前应用',
    teamName: appDetail.team_name || service.tenant_name || '',
  }
}

export const resolveComponentContext = props => {
  const baseInfo = props?.baseInfo || {}
  const appDetail = baseInfo.appDetail || props?.appDetail || {}
  const service = appDetail.service || props?.service || {}
  const componentID = props?.componentID ||
    props?.service_id ||
    service.service_id ||
    appDetail.service_id ||
    ''

  return {
    componentID,
    name: service.service_cname || service.service_alias || appDetail.service_cname || componentID || '当前组件',
    appName: appDetail.group_name || appDetail.group_alias || '',
    teamName: appDetail.team_name || service.tenant_name || '',
  }
}

export const sortByLatency = list => [...(list || [])].sort((a, b) => Number(b.avg_latency_ms || 0) - Number(a.avg_latency_ms || 0))

export const sortByErrors = list => [...(list || [])].sort((a, b) => Number(b.error_count || 0) - Number(a.error_count || 0))
