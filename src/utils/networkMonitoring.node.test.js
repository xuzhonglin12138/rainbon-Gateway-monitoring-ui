const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');

function test(name, fn) {
  fn();
  console.log(`ok - ${name}`);
}

function loadNetworkMonitoring() {
  const filename = path.join(__dirname, 'networkMonitoring.js');
  let source = fs.readFileSync(filename, 'utf8');
  source = source.replace(/export const /g, 'const ');
  source += '\nmodule.exports = { resolveComponentContext, resolveTeamPathFromRecord, getLatestTrendPoint, getPeakTrendValues, getRealtimeMetricPoint, getTeamThroughputItems, getWindowSeconds, getRouteThroughput, getDelayedQueryEndTime, buildWindowQueryParams, buildComponentDisplayMap, getComponentDisplayName, DEFAULT_REFRESH_INTERVAL_MS, REFRESH_INTERVAL_OPTIONS };';
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(__dirname);
  mod._compile(source, filename);
  return mod.exports;
}

const {
  resolveComponentContext,
  resolveTeamPathFromRecord,
  getLatestTrendPoint,
  getPeakTrendValues,
  getRealtimeMetricPoint,
  getTeamThroughputItems,
  getWindowSeconds,
  getRouteThroughput,
  getDelayedQueryEndTime,
  buildWindowQueryParams,
  buildComponentDisplayMap,
  getComponentDisplayName,
  DEFAULT_REFRESH_INTERVAL_MS,
  REFRESH_INTERVAL_OPTIONS,
} = loadNetworkMonitoring();

test('resolveTeamPathFromRecord maps namespace to Rainbond team name via user teams', function () {
  const teamPath = resolveTeamPathFromRecord(
    { namespace: 'xuzl', team_alias: '研发团队' },
    {
      baseInfo: {
        currentUser: {
          teams: [
            { namespace: 'xuzl', team_name: '9tmvzlgs', team_alias: '研发团队' },
          ],
        },
      },
    },
  );

  assert.equal(teamPath, '9tmvzlgs');
});

test('resolveTeamPathFromRecord does not use namespace as team route fallback', function () {
  const teamPath = resolveTeamPathFromRecord({ namespace: 'xuzl' }, {});

  assert.equal(teamPath, '');
});

test('resolveComponentContext reads component id from baseInfo', function () {
  const context = resolveComponentContext({
    baseInfo: {
      componentID: 'gr1ea4bc',
      appDetail: {
        group_name: 'demo-app',
      },
    },
  });

  assert.equal(context.componentID, 'gr1ea4bc');
  assert.equal(context.appName, 'demo-app');
});

test('resolveComponentContext falls back to service alias', function () {
  const context = resolveComponentContext({
    baseInfo: {
      appDetail: {
        service: {
          service_alias: 'grservice',
          service_cname: 'web',
        },
      },
    },
  });

  assert.equal(context.componentID, 'grservice');
  assert.equal(context.name, 'web');
});

test('resolveComponentContext prefers service alias used by route-level buckets', function () {
  const context = resolveComponentContext({
    baseInfo: {
      componentID: 'gr-alias',
      service_alias: 'gr-alias',
      appDetail: {
        service: {
          service_id: 'svc-real-id',
          service_alias: 'gr-alias',
        },
      },
    },
  });

  assert.equal(context.componentID, 'gr-alias');
});

test('resolveComponentContext reads component id from current url query', function () {
  global.window = {
    location: {
      hash: '#/team/t1/region/r1/apps/1023/overview?type=components&componentID=grquery&tab=plugin',
    },
  };

  const context = resolveComponentContext({});

  assert.equal(context.componentID, 'grquery');

  delete global.window;
});

test('getLatestTrendPoint returns partial preview point', function () {
  const latest = getLatestTrendPoint([
    { timestamp: 1000, request_per_second: 4 },
    { timestamp: 1005, request_per_second: 9, partial: true },
  ]);

  assert.equal(latest.timestamp, 1005);
  assert.equal(latest.partial, true);
});

test('getPeakTrendValues ignores partial preview point', function () {
  const peaks = getPeakTrendValues([
    { timestamp: 1000, request_per_second: 4, avg_latency_ms: 10 },
    { timestamp: 1005, request_per_second: 99, avg_latency_ms: 80, partial: true },
  ]);

  assert.equal(peaks.request_per_second, 4);
  assert.equal(peaks.avg_latency_ms, 10);
});

test('getRealtimeMetricPoint prefers overview realtime fields', function () {
  const realtime = getRealtimeMetricPoint(
    {
      realtime_request_per_second: 12,
      realtime_egress_bytes_per_sec: 2048,
      realtime_error_rate: 0.2,
      realtime_avg_latency_ms: 80,
    },
    [
      { timestamp: 1005, request_per_second: 1, egress_bytes_per_sec: 2, error_rate: 0.01, avg_latency_ms: 10 },
    ],
  );

  assert.equal(realtime.request_per_second, 12);
  assert.equal(realtime.egress_bytes_per_sec, 2048);
  assert.equal(realtime.error_rate, 0.2);
  assert.equal(realtime.avg_latency_ms, 80);
});

test('getRealtimeMetricPoint falls back to latest trend point for old responses', function () {
  const realtime = getRealtimeMetricPoint({}, [
    { timestamp: 1005, request_per_second: 9, egress_bytes_per_sec: 512, error_rate: 0.1, avg_latency_ms: 32 },
  ]);

  assert.equal(realtime.request_per_second, 9);
  assert.equal(realtime.egress_bytes_per_sec, 512);
  assert.equal(realtime.error_rate, 0.1);
  assert.equal(realtime.avg_latency_ms, 32);
});

test('getRealtimeMetricPoint does not use window aggregate fields as realtime values', function () {
  const realtime = getRealtimeMetricPoint({
    throughput_per_second: 6,
    egress_bytes_per_sec: 1024,
    error_rate: 0.03,
    avg_latency_ms: 45,
  }, []);

  assert.equal(realtime.request_per_second, 0);
  assert.equal(realtime.egress_bytes_per_sec, 0);
  assert.equal(realtime.error_rate, 0);
  assert.equal(realtime.avg_latency_ms, 0);
});

test('refresh interval defaults to 5 seconds and omits 2 second option', function () {
  assert.equal(DEFAULT_REFRESH_INTERVAL_MS, 5000);
  assert.equal(REFRESH_INTERVAL_OPTIONS.some(item => item.value === 2000), false);
  assert.equal(REFRESH_INTERVAL_OPTIONS[0].value, 5000);
});

test('getTeamThroughputItems aggregates app throughput by team', function () {
  const teams = getTeamThroughputItems([
    {
      app_id: 'app-a',
      app_name: '订单服务',
      team_name: 'team-a',
      team_alias: '研发团队',
      request_count: 100,
      error_count: 5,
      throughput_per_second: 20,
    },
    {
      app_id: 'app-b',
      app_name: '支付服务',
      team_name: 'team-a',
      team_alias: '研发团队',
      request_count: 50,
      error_count: 0,
      throughput_per_second: 30,
    },
    {
      app_id: 'app-c',
      app_name: '文档服务',
      team_name: 'team-b',
      team_alias: '运营团队',
      request_count: 60,
      error_count: 6,
      throughput_per_second: 10,
    },
  ]);

  assert.equal(teams.length, 2);
  assert.equal(teams[0].name, '研发团队');
  assert.equal(teams[0].request_count, 150);
  assert.equal(teams[0].error_count, 5);
  assert.equal(teams[0].app_count, 2);
  assert.equal(teams[0].top_app_name, '支付服务');
  assert.equal(teams[0].top_app_throughput_per_second, 30);
  assert.equal(teams[0].throughput_per_second, 50);
  assert.equal(Number(teams[0].error_rate.toFixed(4)), 0.0333);
});

test('getRouteThroughput uses the selected query window', function () {
  assert.equal(getWindowSeconds('5m'), 300);
  assert.equal(getWindowSeconds('10m'), 600);
  assert.equal(getWindowSeconds('30m'), 1800);
  assert.equal(getRouteThroughput({ request_count: 600 }, '10m'), 1);
});

test('buildWindowQueryParams delays end_time by 6 seconds', function () {
  const nineOClock = Date.UTC(2026, 0, 1, 9, 0, 0);
  const params = buildWindowQueryParams('5m', { limit: 10 }, nineOClock);

  assert.equal(params.window, '5m');
  assert.equal(params.limit, 10);
  assert.equal(params.end_time, Date.UTC(2026, 0, 1, 8, 59, 54) / 1000);
  assert.equal(getDelayedQueryEndTime(nineOClock), params.end_time);
});

test('component display map resolves service alias to Chinese component name', function () {
  const map = buildComponentDisplayMap([
    {
      service_alias: 'gr1ea4bc',
      service_id: 'svc-real-id',
      service_cname: '网关测试组件',
    },
  ]);

  assert.equal(map.gr1ea4bc, '网关测试组件');
  assert.equal(map['svc-real-id'], '网关测试组件');
  assert.equal(getComponentDisplayName({ component_id: 'gr1ea4bc' }, map), '网关测试组件');
});
