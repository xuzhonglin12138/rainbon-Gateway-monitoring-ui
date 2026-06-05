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
  const userTeams = baseInfo.currentUser?.teams || []
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
    service.service_id,
    appDetail.service_id,
    props?.componentID,
    props?.componentId,
    props?.component_id,
    props?.serviceID,
    props?.serviceId,
    props?.service_id,
    props?.service_alias,
    baseInfo.componentID,
    baseInfo.componentId,
    baseInfo.component_id,
    baseInfo.serviceID,
    baseInfo.serviceId,
    baseInfo.service_id,
    baseInfo.service_alias,
    service.service_alias,
    service.serviceAlias,
    appDetail.service_alias,
    getCurrentQueryValue('componentID', 'componentId', 'component_id', 'serviceID', 'serviceId', 'service_id', 'service_alias'),
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
