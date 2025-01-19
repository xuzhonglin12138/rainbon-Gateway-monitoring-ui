import request from '../utils/request'

// 获取费用汇总
// | 参数名     | 类型   | 必填 | 说明                                 |
// | ---------- | ------ | ---- | ------------------------------------ |
// | namespace  | string | 否   | 命名空间                             |
// | app_id     | string | 否   | 应用ID                               |
// | start_time | string | 否   | 开始时间，格式：2024-01-01T00:00:00Z |
// | end_time   | string | 否   | 结束时间，格式：2024-01-02T00:00:00Z |
export async function getCostSummary(params) {
  return request(
    `/api/v1/user/cost/summary`,
    {
      method: 'get',
      params: params
    }
  );
}

// 获取服务级别的费用汇总
// | 参数名     | 类型   | 必填 | 说明                                 |
// | ---------- | ------ | ---- | ------------------------------------ |
// | namespace  | string | 否   | 命名空间                             |
// | app_id     | string | 否   | 应用ID                               |
// | service_id | string | 否   | 服务ID                               |
// | start_time | string | 否   | 开始时间，格式：2024-01-01T00:00:00Z |
// | end_time   | string | 否   | 结束时间，格式：2024-01-02T00:00:00Z |
// | page       | int    | 否   | 页码，从1开始，默认1                 |
// | page_size  | int    | 否   | 每页大小，默认10                     |
export async function getServiceCostSummary(params) {
  return request(
    `/api/v1/user/cost/service`,
    {
      method: 'get',
      params: params
    }
  );
}

// 获取应用级别的费用汇总
// | 参数名     | 类型   | 必填 | 说明                                 |
// | ---------- | ------ | ---- | ------------------------------------ |
// | namespace  | string | 否   | 命名空间                             |
// | app_id     | string | 否   | 应用ID                               |
// | start_time | string | 否   | 开始时间，格式：2024-01-01T00:00:00Z |
// | end_time   | string | 否   | 结束时间，格式：2024-01-02T00:00:00Z |
// | page       | int    | 否   | 页码，从1开始，默认1                 |
// | page_size  | int    | 否   | 每页大小，默认10                     |
export async function getAppCostSummary(params) {
  return request(
    `/api/v1/user/cost/app`,
    {
      method: 'get',
      params: params
    }
  );
}

// 获取账单详情
// | 参数名   | 类型   | 必填 | 说明   |
// | -------- | ------ | ---- | ------ |
// | event_id | string | 是   | 账单ID |
export async function getBillDetails(params) {
  return request(
    `/api/v1/user/cost/bill`,
    {
      method: 'get',
      params: params
    }
  );
}

// 获取当前的资源价格配置
export async function getPricingConfig(params) {
  return request(
    `/api/v1/pricing`,
    {
      method: 'get',
      params: params
    }
  );
}
// PUT /api/v1/admin/pricing
// | 参数名   | 类型   | 必填 | 说明   |
// | -------- | ------ | ---- | ------ |
// | cpu_price_per_core | float | 否   | CPU单价(元/小时) |
// | memory_price_per_mb | float | 否   | 内存单价(元/小时) |
// | storage_price_per_gb | float | 否   | 存储单价(元/小时) |
// | network_price_per_mb | float | 否   | 流量单价(元/MB) |
export async function updatePricingConfig(data) {
  return request(
    `/api/v1/admin/pricing`,
    {
      method: 'put',
      data: data
    }
  );
}

// 获取微信充值二维码
// | 参数名   | 类型   | 必填 | 说明   |
// | -------- | ------ | ---- | ------ |
// | amount   | int    | 是   | 充值金额(分) |
// | description | string | 是   | 充值订单描述 |
export async function getWechatRechargeCode(data) {
  return request(
    `/api/v1/user/recharge`,
    {
      method: 'post',
      data: data
    }
  );
}
// 获取订单交易实时状态
// | 参数名   | 类型   | 必填 | 说明   |
// | -------- | ------ | ---- | ------ |
// | order_no | string | 是   | 订单ID |
export async function getOrderStatus(params) {
  return request(
    `/api/v1/user/recharge/${params.order_no}/query`,
    {
      method: 'get'
    }
  );
} 

// 获取充值订单列表
// | 参数名   | 类型   | 必填 | 说明   |
// | -------- | ------ | ---- | ------ |
// | page     | int    | 否   | 页码   |
// | page_size| int    | 否   | 每页大小 |
// | status   | string | 否   | SUCCESS：支付成功 REFUND：转入退款 NOTPAY：未支付 CLOSED：已关闭 |
// | start_time| string | 否   | 开始时间 |
// | end_time | string | 否   | 结束时间 |
// | time_type | string | 否   | created-下单时间 paid-支付时间。当需要根据开始时间和结束时间筛选时，这个时间类型可以用于决定是根据下单时间筛选还是支付时间筛选 |

export async function getRechargeList(params) {
  return request(
    `/api/v1/user/recharge`,
    {
      method: 'get',
      params: params
    }
  );
}
// 获取充值记录明细
// | 参数名   | 类型   | 必填 | 说明   |
// | -------- | ------ | ---- | ------ |
// | order_no | string | 是   | 订单ID |
export async function getRechargeDetail(params) {
  return request(
    `/api/v1/user/recharge/${params.order_no}`,
    {
      method: 'get'
    }
  );
}
// 获取每日账单列表，支持按时间范围和命名空间查询，包含分页和汇总信息。
// |            | 类型   | 必填 | 说明                                             |
// | ---------- | ------ | ---- | ------------------------------------------------ |
// | start_date | string | 否   | 开始日期，格式：2024-01-01。默认为结束日期前30天 |
// | end_date   | string | 否   | 结束日期，格式：2024-01-02。默认为当前日期       |
// | namespace  | string | 否   | 命名空间                                         |
// | page       | int    | 否   | 页码，从1开始，默认1                             |
// | page_size  | int    | 否   | 每页大小，默认10，最大100                        |
export async function getDailyBillList(params) {
  return request(
    `/api/v1/admin/daily-bills`,
    {
      method: 'get',
      params: params
    }
  );
}
// 获取充值页面数据
export async function getFinancialData() {
  return request(
    `/api/v1/user/account/financial`,
    {
      method: 'get'
    }
  );
}
// 管理员获取全部充值订单
// | 参数名   | 类型   | 必填 | 说明   |
// | -------- | ------ | ---- | ------ |
// | page     | int    | 否   | 页码   |
// | page_size| int    | 否   | 每页大小 |
// | status   | string | 否   | SUCCESS：支付成功 REFUND：转入退款 NOTPAY：未支付 CLOSED：已关闭 |
// | start_time| string | 否   | 开始时间 |
// | end_time | string | 否   | 结束时间 |
// | time_type | string | 否   | created-下单时间 paid-支付时间。当需要根据开始时间和结束时间筛选时，这个时间类型可以用于决定是根据下单时间筛选还是支付时间筛选 |
export async function getAllRechargeList(params) {
  return request(
    `/api/v1/admin/recharges`,
    {
      method: 'get',
      params: params
    }
  );
}
// 管理员手动充值
// | 参数名   | 类型   | 必填 | 说明   |
// | -------- | ------ | ---- | ------ |
// | user_id | int    | 是   | 用户ID |
// | amount | int    | 是   | 充值金额，单位分 |
// | description | string | 否   | 充值描述 |
export async function manualRecharge(data) {
  return request(
    `/api/v1/admin/recharge/manual`,
    {
      method: 'post',
      data: data
    }
  );
}

// 同步数据
// | 参数名   | 类型   | 必填 | 说明   |
// | -------- | ------ | ---- | ------ |
// | region_name | string | 是   | 区域名称 |
export async function syncData(data) {
  return request(
    `/api/v1/user/sync/data`,
    {
      method: 'post',
      data: JSON.stringify(data)
    }
  );
}

// 获取告警设置信息
export async function getAlarmSettingInfo() {
  return request(
    `/api/v1/admin/sms/config`,
    {
      method: 'get'
    }
  );
}

// 设置告警信息
export async function upAlarmSettingInfo(data) {
  return request(
    `/api/v1/admin/sms/config`,
    {
      method: 'put',
      data: data
    }
  );
}

