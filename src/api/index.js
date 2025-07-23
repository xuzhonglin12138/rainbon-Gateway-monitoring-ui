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