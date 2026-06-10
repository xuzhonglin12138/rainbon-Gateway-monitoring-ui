export const WINDOW_OPTIONS = [
  { label: '最近 5 分钟', value: '5m' },
  { label: '最近 10 分钟', value: '10m' },
  { label: '最近 30 分钟', value: '30m' },
]

export const REFRESH_INTERVAL_OPTIONS = [
  { label: '5 秒刷新', value: 5000 },
  { label: '10 秒刷新', value: 10000 },
  { label: '30 秒刷新', value: 30000 },
]

export const DEFAULT_REFRESH_INTERVAL_MS = 5000

export const getWindowLabel = value => {
  const option = WINDOW_OPTIONS.find(item => item.value === value)
  return option ? option.label : '当前时间段'
}

export const getWindowSeconds = value => {
  if (value === '10m') {
    return 600
  }
  if (value === '30m') {
    return 1800
  }
  return 300
}

export const getRouteThroughput = (record = {}, window) => {
  const seconds = getWindowSeconds(window)
  if (seconds <= 0) {
    return 0
  }
  return Number(record.request_count || 0) / seconds
}

export const getLatestTrendPoint = points => {
  if (!Array.isArray(points) || !points.length) {
    return {}
  }
  return points[points.length - 1] || {}
}

const firstFiniteNumber = (...values) => {
  for (let i = 0; i < values.length; i += 1) {
    const value = Number(values[i])
    if (Number.isFinite(value)) {
      return value
    }
  }
  return 0
}

export const getRealtimeMetricPoint = (overview = {}, points = []) => {
  const latest = getLatestTrendPoint(points)
  return {
    request_per_second: firstFiniteNumber(overview.realtime_request_per_second, latest.request_per_second),
    egress_bytes_per_sec: firstFiniteNumber(overview.realtime_egress_bytes_per_sec, latest.egress_bytes_per_sec),
    error_rate: firstFiniteNumber(overview.realtime_error_rate, latest.error_rate),
    avg_latency_ms: firstFiniteNumber(overview.realtime_avg_latency_ms, latest.avg_latency_ms),
  }
}

const TREND_METRIC_KEYS = ['request_per_second', 'egress_bytes_per_sec', 'error_rate', 'avg_latency_ms']

export const getPeakTrendValues = points => (points || []).filter(point => !point?.partial).reduce((result, point) => {
  TREND_METRIC_KEYS.forEach(key => {
    const value = Number(point?.[key] || 0)
    if (Number.isFinite(value)) {
      result[key] = Math.max(result[key] || 0, value)
    }
  })
  return result
}, {})

export const getResponseData = response => response?.data?.data || {}

export const getResponseList = response => {
  const data = response?.data?.data
  return Array.isArray(data) ? data : []
}

export const getConsoleResponseList = response => {
  const body = response?.data || {}
  if (Array.isArray(body.list)) {
    return body.list
  }
  if (Array.isArray(body.data?.list)) {
    return body.data.list
  }
  if (Array.isArray(body.bean?.list)) {
    return body.bean.list
  }
  if (Array.isArray(body.data)) {
    return body.data
  }
  return []
}

export const getResponseTrendPoints = response => {
  const points = response?.data?.data?.points
  return Array.isArray(points) ? points : []
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

export const formatInteger = value => formatNumber(Math.round(Number(value || 0)))

export const formatPercent = value => `${(Number(value || 0) * 100).toFixed(2)}%`

export const formatPercentValue = value => `${Number(value || 0).toFixed(2)}%`

export const formatLatency = value => `${Number(value || 0).toFixed(2)} ms`

export const formatThroughput = value => `${formatNumber(value)}/s`

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

export const formatResourceBytes = value => {
	const num = Number(value || 0)
	if (num >= 1024 * 1024 * 1024) {
		return `${(num / 1024 / 1024 / 1024).toFixed(2)} GiB`
	}
	if (num >= 1024 * 1024) {
		return `${(num / 1024 / 1024).toFixed(2)} MiB`
	}
	return `${num.toFixed(0)} B`
}

export const resolvePlatformContext = props => {
  const baseInfo = props?.baseInfo || {}
  const globalUtile = props?.globalUtile || {}
  const currentTeam = baseInfo.currentTeam || {}
  const hash = window.location.hash || ''
  const query = new URLSearchParams(hash.split('?')[1] || '')
  const pathRegion = hash.match(/\/region\/([^/]+)/)

  return {
    teamName: currentTeam.team_name ||
      baseInfo.team_name ||
      (typeof globalUtile.getCurrTeamName === 'function' ? globalUtile.getCurrTeamName() : ''),
    regionName: baseInfo.region_name ||
      baseInfo.regionName ||
      query.get('regionName') ||
      (pathRegion ? pathRegion[1] : '') ||
      (typeof globalUtile.getCurrRegionName === 'function' ? globalUtile.getCurrRegionName() : ''),
  }
}

export const displayText = (...values) => {
  const value = values.find(item => item !== undefined && item !== null && String(item).trim() !== '')
  return value === undefined || value === null ? '' : String(value)
}

const getUserTeams = props => props?.baseInfo?.currentUser?.teams || []

export const resolveTeamPathFromRecord = (record = {}, props = {}) => {
  const explicitTeamName = displayText(record.team_name, record.tenant_name)
  if (explicitTeamName) {
    return explicitTeamName
  }
  const currentTeam = props?.baseInfo?.currentTeam || {}
  const userTeams = getUserTeams(props)
  const matchedTeam = userTeams.find(team => (
    (record.namespace && team.namespace === record.namespace) ||
    (record.team_id && (team.team_id === record.team_id || team.tenant_id === record.team_id)) ||
    (record.team_alias && (team.team_alias === record.team_alias || team.alias === record.team_alias))
  )) || {}
  if (matchedTeam.team_name || matchedTeam.tenant_name) {
    return displayText(matchedTeam.team_name, matchedTeam.tenant_name)
  }
  if (record.namespace && currentTeam.namespace === record.namespace) {
    return displayText(currentTeam.team_name, currentTeam.tenant_name)
  }
  if (record.team_id && (currentTeam.team_id === record.team_id || currentTeam.tenant_id === record.team_id)) {
    return displayText(currentTeam.team_name, currentTeam.tenant_name)
  }
  return ''
}

export const getTeamThroughputItems = (apps = [], limit = 10) => {
  const teams = {}
  ;(apps || []).forEach(app => {
    const teamKey = displayText(app.team_id, app.team_name, app.team_alias, app.namespace, 'unknown_team')
    const current = teams[teamKey] || {
      team_id: app.team_id,
      team_name: app.team_name,
      team_alias: app.team_alias,
      namespace: app.namespace,
      name: displayText(app.team_alias, app.team_name, app.team_id, app.namespace, '未知团队'),
      request_count: 0,
      error_count: 0,
      throughput_per_second: 0,
      appIDs: new Set(),
      top_app_name: '',
      top_app_id: '',
      top_app_throughput_per_second: 0,
    }
    const requestCount = Number(app.request_count || 0)
    const errorCount = Number(app.error_count || 0)
    const throughput = Number(app.throughput_per_second || 0)
    current.request_count += Number.isFinite(requestCount) ? requestCount : 0
    current.error_count += Number.isFinite(errorCount) ? errorCount : 0
    current.throughput_per_second += Number.isFinite(throughput) ? throughput : 0
    if (app.app_id) {
      current.appIDs.add(app.app_id)
    }
    if (throughput >= current.top_app_throughput_per_second) {
      current.top_app_name = displayText(app.app_name, app.name, app.app_id, '-')
      current.top_app_id = app.app_id || ''
      current.top_app_throughput_per_second = Number.isFinite(throughput) ? throughput : 0
    }
    teams[teamKey] = current
  })
  return Object.keys(teams)
    .map(key => {
      const item = teams[key]
      return {
        team_id: item.team_id,
        team_name: item.team_name,
        team_alias: item.team_alias,
        namespace: item.namespace,
        name: item.name,
        request_count: item.request_count,
        error_count: item.error_count,
        error_rate: item.request_count > 0 ? item.error_count / item.request_count : 0,
        throughput_per_second: item.throughput_per_second,
        app_count: item.appIDs.size,
        top_app_name: item.top_app_name,
        top_app_id: item.top_app_id,
        top_app_throughput_per_second: item.top_app_throughput_per_second,
      }
    })
    .sort((a, b) => {
      if (b.throughput_per_second === a.throughput_per_second) {
        return b.request_count - a.request_count
      }
      return b.throughput_per_second - a.throughput_per_second
    })
    .slice(0, limit)
}

export const resolveAppContext = props => {
  const baseInfo = props?.baseInfo || {}
  const appDetail = baseInfo.appDetail || props?.appDetail || props?.groupDetail || {}
  const service = appDetail.service || {}
  const globalUtile = props?.globalUtile || {}
  const currentTeam = baseInfo.currentTeam || {}
  const platformContext = resolvePlatformContext(props)
  const teamName = appDetail.team_name ||
    service.tenant_name ||
    currentTeam.team_name ||
    platformContext.teamName ||
    (typeof globalUtile.getCurrTeamName === 'function' ? globalUtile.getCurrTeamName() : '')
  const userTeams = getUserTeams(props)
  const matchedTeam = userTeams.find(team => team.team_name === teamName || team.tenant_name === teamName) || {}
  const appID = props?.appID ||
    props?.group_id ||
    props?.groupId ||
    appDetail.group_id ||
    service.group_id ||
    (typeof globalUtile.getAppID === 'function' ? globalUtile.getAppID() : '')

  return {
    appID,
    regionAppID: props?.region_app_id || appDetail.region_app_id || appDetail.region_app_id_str || appDetail.region_app_id_alias || service.region_app_id || '',
    namespace: baseInfo.namespace || currentTeam.namespace || appDetail.namespace || service.namespace || matchedTeam.namespace || '',
    name: displayText(appDetail.group_name, appDetail.group_alias, appDetail.app_name, service.group_name, appID, '当前应用'),
    teamAlias: displayText(currentTeam.team_alias, currentTeam.alias, matchedTeam.team_alias, matchedTeam.alias, currentTeam.team_name),
    regionName: platformContext.regionName,
    teamName,
    teamPath: displayText(teamName, matchedTeam.team_name, matchedTeam.tenant_name),
  }
}

export const resolveServiceAliases = (...sources) => {
  const aliases = []
  const visit = item => {
    if (!item) {
      return
    }
    if (Array.isArray(item)) {
      item.forEach(visit)
      return
    }
    if (typeof item !== 'object') {
      return
    }
    const alias = item.service_alias || item.serviceAlias
    if (alias) {
      aliases.push(alias)
    }
    visit(item.service)
    visit(item.services)
    visit(item.components)
    visit(item.component_list)
    visit(item.list)
  }
  sources.forEach(visit)
  return [...new Set(aliases.map(alias => String(alias).trim()).filter(Boolean))]
}

export const buildComponentDisplayMap = services => {
  const result = {}
  ;(services || []).forEach(service => {
    if (!service || typeof service !== 'object') {
      return
    }
    const displayName = displayText(
      service.service_cname,
      service.serviceCname,
      service.component_name,
      service.componentName,
      service.name,
      service.service_alias,
      service.serviceAlias,
      service.component_id,
      service.componentID,
      service.service_id,
    )
    const keys = [
      service.service_alias,
      service.serviceAlias,
      service.component_id,
      service.componentID,
      service.service_id,
      service.serviceID,
    ]
    keys.forEach(key => {
      const normalized = displayText(key)
      if (normalized) {
        result[normalized] = displayName
      }
    })
  })
  return result
}

export const getComponentDisplayName = (record = {}, componentDisplayMap = {}) => {
  const keys = [
    record.component_id,
    record.componentID,
    record.service_alias,
    record.serviceAlias,
    record.service_id,
    record.serviceID,
  ]
  for (let i = 0; i < keys.length; i += 1) {
    const key = displayText(keys[i])
    if (key && componentDisplayMap[key]) {
      return componentDisplayMap[key]
    }
  }
  return displayText(record.name, record.service_alias, record.component_id, '-')
}

const firstNonEmpty = (...values) => {
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]
    if (value !== undefined && value !== null && `${value}`.trim()) {
      return `${value}`.trim()
    }
  }
  return ''
}

const getCurrentQueryValue = (...keys) => {
  if (typeof window === 'undefined' || !window.location) {
    return ''
  }
  const hash = window.location.hash || ''
  const search = hash.indexOf('?') >= 0
    ? hash.split('?')[1]
    : (window.location.search || '').replace(/^\?/, '')
  const query = new URLSearchParams(search || '')
  for (let i = 0; i < keys.length; i += 1) {
    const value = query.get(keys[i])
    if (value) {
      return value
    }
  }
  return ''
}

export const resolveComponentContext = props => {
  const baseInfo = props?.baseInfo || {}
  const appDetail = baseInfo.appDetail || props?.appDetail || {}
  const service = appDetail.service || baseInfo.service || props?.service || {}
  const currentTeam = baseInfo.currentTeam || {}
  const componentID = firstNonEmpty(
    props?.componentID,
    props?.componentId,
    props?.component_id,
    props?.service_alias,
    getCurrentQueryValue('componentID', 'componentId', 'component_id', 'service_alias'),
    baseInfo.componentID,
    baseInfo.componentId,
    baseInfo.component_id,
    baseInfo.service_alias,
    service.service_alias,
    service.serviceAlias,
    appDetail.service_alias,
    props?.serviceID,
    props?.serviceId,
    props?.service_id,
    baseInfo.serviceID,
    baseInfo.serviceId,
    baseInfo.service_id,
    service.service_id,
    appDetail.service_id,
    getCurrentQueryValue('serviceID', 'serviceId', 'service_id'),
  )

  return {
    componentID,
    name: service.service_cname || service.service_alias || appDetail.service_cname || appDetail.service_alias || componentID || '当前组件',
    appName: appDetail.group_name || appDetail.group_alias || '',
    teamName: baseInfo.team_name || appDetail.team_name || service.tenant_name || currentTeam.team_alias || currentTeam.team_name || '',
  }
}

export const sortByLatency = list => [...(list || [])].sort((a, b) => Number(b.avg_latency_ms || 0) - Number(a.avg_latency_ms || 0))

export const sortByErrors = list => [...(list || [])].sort((a, b) => Number(b.error_count || 0) - Number(a.error_count || 0))
