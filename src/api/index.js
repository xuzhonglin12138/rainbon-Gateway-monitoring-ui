import request from '../utils/request'
import pluginData from '../pluginData.json'

let runtimeBaseInfo = {}

export const setNetworkMonitoringBaseInfo = baseInfo => {
  runtimeBaseInfo = baseInfo || {}
}

// 从地址栏获取 regionName 参数
const getRegionID = () => {
  if (runtimeBaseInfo.region_name || runtimeBaseInfo.regionName) {
    return runtimeBaseInfo.region_name || runtimeBaseInfo.regionName
  }
  const hash = window.location.hash
  const searchParams = new URLSearchParams(hash.split('?')[1] || '')
  const queryRegion = searchParams.get('regionName')
  if (queryRegion) {
    return queryRegion
  }
  const pathMatch = hash.match(/\/region\/([^/]+)/)
  return pathMatch ? pathMatch[1] : 'rainbond'
}

// 基础路径配置
const getBasePath = () => {
  const pluginName = pluginData.id
  const regionID = getRegionID()
  return `/console/regions/${regionID}/backend/plugins/${pluginName}`
}

// ==================== DEMO API ====================

/**
 * 创建 demo api
 * @param {Object} data - 存储配置
 */
export async function createStorage(data) {
  return request(`${getBasePath()}/demo/demostorages`, {
    method: 'post',
    data,
  })
}

const apiPath = path => `${getBasePath()}/api/v1${path}`

const queryString = params => {
  const search = new URLSearchParams()
  Object.keys(params || {}).forEach(key => {
    const value = params[key]
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, value)
    }
  })
  const text = search.toString()
  return text ? `?${text}` : ''
}

export async function getPlatformOverview(params = {}) {
  return request(apiPath(`/platform/overview${queryString(params)}`), {
    method: 'get',
  })
}

export async function getPlatformOverviewTrend(params = {}) {
  return request(apiPath(`/platform/overview/trend${queryString(params)}`), {
    method: 'get',
  })
}

export async function getPlatformTopErrors(params = {}) {
  return request(apiPath(`/platform/internal-routes/top-errors${queryString(params)}`), {
    method: 'get',
  })
}

export async function getPlatformTopLatency(params = {}) {
  return request(apiPath(`/platform/internal-routes/top-latency${queryString(params)}`), {
    method: 'get',
  })
}

export async function getPlatformAppTopErrors(params = {}) {
  return request(apiPath(`/platform/apps/top-errors${queryString(params)}`), {
    method: 'get',
  })
}

export async function getPlatformAppTopLatency(params = {}) {
  return request(apiPath(`/platform/apps/top-latency${queryString(params)}`), {
    method: 'get',
  })
}

export async function getPlatformAppTopThroughput(params = {}) {
  return request(apiPath(`/platform/apps/top-throughput${queryString(params)}`), {
    method: 'get',
  })
}

export async function getPlatformNodeSummary(params = {}) {
  return request(apiPath(`/platform/nodes/summary${queryString(params)}`), {
    method: 'get',
  })
}

export async function getPlatformNodeDetail(nodeName, params = {}) {
  return request(apiPath(`/platform/nodes/${encodeURIComponent(nodeName)}/detail${queryString(params)}`), {
    method: 'get',
  })
}

export async function getAppOverview(appID, params = {}) {
  return request(apiPath(`/apps/${appID}/overview${queryString(params)}`), {
    method: 'get',
  })
}

export async function getAppOverviewTrend(appID, params = {}) {
  return request(apiPath(`/apps/${appID}/overview/trend${queryString(params)}`), {
    method: 'get',
  })
}

export async function getAppSLA(appID, params = {}) {
  return request(apiPath(`/apps/${appID}/sla${queryString(params)}`), {
    method: 'get',
  })
}

export async function getAppSLAConfig(appID) {
  return request(apiPath(`/apps/${appID}/sla/config`), {
    method: 'get',
  })
}

export async function saveAppSLAConfig(appID, data) {
  return request(apiPath(`/apps/${appID}/sla/config`), {
    method: 'put',
    data,
  })
}

export async function deleteAppSLAConfig(appID) {
  return request(apiPath(`/apps/${appID}/sla/config`), {
    method: 'delete',
  })
}

export async function getAppRouteSummary(appID, params = {}) {
  return request(apiPath(`/apps/${appID}/internal-routes/summary${queryString(params)}`), {
    method: 'get',
  })
}

export async function getAppTopErrors(appID, params = {}) {
  return request(apiPath(`/apps/${appID}/internal-routes/top-errors${queryString(params)}`), {
    method: 'get',
  })
}

export async function getAppTopLatency(appID, params = {}) {
  return request(apiPath(`/apps/${appID}/internal-routes/top-latency${queryString(params)}`), {
    method: 'get',
  })
}

export async function getAppComponentSummary(appID, params = {}) {
  return request(apiPath(`/apps/${appID}/components/summary${queryString(params)}`), {
    method: 'get',
  })
}

export async function syncAppHTTPLogger(appID, data) {
  return request(apiPath(`/apps/${appID}/gateway/http-logger/sync`), {
    method: 'post',
    data,
  })
}

export async function getConsoleAppServices(teamName, appID) {
  return request(`/console/teams/${teamName}/service/group?group_id=${appID}&page_size=200`, {
    method: 'get',
  })
}

export async function getComponentOverview(componentID, params = {}) {
  return request(apiPath(`/components/${componentID}/overview${queryString(params)}`), {
    method: 'get',
  })
}

export async function getComponentOverviewTrend(componentID, params = {}) {
  return request(apiPath(`/components/${componentID}/overview/trend${queryString(params)}`), {
    method: 'get',
  })
}

export async function getComponentInternalRoutes(componentID, params = {}) {
  return request(apiPath(`/components/${componentID}/internal-routes${queryString(params)}`), {
    method: 'get',
  })
}
