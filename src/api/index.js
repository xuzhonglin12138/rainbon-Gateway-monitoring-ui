import request from '../utils/request'
import pluginData from '../pluginData.json'

// 从地址栏获取 regionName 参数
const getRegionID = () => {
  const hash = window.location.hash
  const searchParams = new URLSearchParams(hash.split('?')[1] || '')
  return searchParams.get('regionName') || 'rainbond'
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
