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
  source += '\nmodule.exports = { resolveComponentContext };';
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(__dirname);
  mod._compile(source, filename);
  return mod.exports;
}

const { resolveComponentContext } = loadNetworkMonitoring();

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

test('resolveComponentContext prefers real service id over aliases', function () {
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

  assert.equal(context.componentID, 'svc-real-id');
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
