# Rainbond 插件前端开发文档

## 项目概述

本项目是 Rainbond 平台的插件模板项目，基于 React 16 + Ant Design 5 + Webpack 5 构建。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 16.8.6 | 前端框架 |
| Ant Design | 5.19.3 | UI 组件库 |
| Webpack | 5.53.0 | 构建工具 |
| Babel | 7.x | JavaScript 编译器 |
| SWC | 1.7.6 | 高性能 JavaScript/TypeScript 编译器 |
| Less | 4.2.0 | CSS 预处理器 |
| ESLint | 8.1.0 | 代码规范检查 |
| Axios | 0.24.0 | HTTP 请求库 |

## 项目结构

```
├── build/                      # Webpack 配置目录
│   ├── webpack.base.config.js  # 基础配置
│   ├── webpack.dev.config.js   # 开发环境配置
│   ├── webpack.prod.config.js  # 生产环境配置
│   ├── webpack.watch.config.js # 监听模式配置
│   └── utils.js                # 构建工具函数
├── public/                     # 静态资源目录
│   └── index.html              # HTML 模板
├── src/                        # 源代码目录
│   ├── api/                    # API 接口定义
│   │   └── index.js
│   ├── assets/                 # 静态资源
│   │   └── images/
│   ├── components/             # 公共组件
│   ├── locales/                # 国际化文件
│   │   ├── en-US.json
│   │   └── zh-CN.json
│   ├── modules/                # 模块入口
│   │   ├── root.js             # 主模块
│   │   └── other.js            # 其他模块
│   ├── pages/                  # 页面组件
│   │   ├── content/            # 主页面
│   │   └── other/              # 其他页面
│   ├── utils/                  # 工具函数
│   │   ├── global.js
│   │   └── request.js          # HTTP 请求封装
│   ├── index.js                # 开发环境入口
│   ├── moudle.js               # 生产环境入口
│   └── pluginData.json         # 插件配置文件
├── .eslintrc.js                # ESLint 配置
├── babel.config.js             # Babel 配置
├── postcss.config.js           # PostCSS 配置
└── package.json                # 项目配置
```

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（自动打开浏览器）
npm run dev

# 构建生产版本
npm run build

# 监听模式构建（自动同步到主项目）
npm run dev:watch

# 构建并生成分析报告
npm run build:report

# ESLint 修复
npm run eslint:fix
```

## 开发模式

### 1. 独立开发模式 (`npm run dev`)

- 启动本地开发服务器
- 支持热更新
- 使用 `src/index.js` 作为入口
- 代理配置在 `webpack.dev.config.js` 中设置

```javascript
// 代理配置示例
proxy: {
  '/api/v1': {
    target: 'http://14.103.232.255:32222',
    changeOrigin: true,
  },
}
```

### 2. 监听模式 (`npm run dev:watch`)

- 监听文件变化自动重新构建
- 构建完成后自动同步到主项目目录
- 适合在主项目中调试插件

**配置主项目路径：**

修改 `build/webpack.watch.config.js` 中的 `MAIN_PROJECT_PLUGIN_PATH`：

```javascript
const MAIN_PROJECT_PLUGIN_PATH = path.resolve(__dirname, '../../主项目路径/public/plugins/dist')
```

### 3. 生产构建 (`npm run build`)

- 使用 `src/moudle.js` 作为入口
- 输出 AMD 模块格式
- 外部化依赖：lodash, moment, react, react-dom
- 生成内容哈希文件名

## 路径别名

项目配置了 `@` 别名指向 `src` 目录：

```javascript
import { getBackupList } from '@/api'
import styles from '@/components/Modal/index.less'
```

## 样式开发

### Less 模块化

项目使用 CSS Modules，样式文件自动模块化：

```jsx
import styles from './index.less'

<div className={styles.container}>
  <span className={styles.title}>标题</span>
</div>
```

### 样式文件命名

- 组件样式：`index.less`（与组件同目录）
- 全局样式：放在 `src/styles/` 目录

### Ant Design 样式隔离（重要）

由于主项目使用 Ant Design 3.x，而插件使用 Ant Design 5.x，为避免样式冲突和污染，**必须配置样式前缀隔离**。

#### 1. 配置 prefixCls

在 `src/modules/root.js` 中，通过 `ConfigProvider` 设置样式前缀：

```jsx
import { ConfigProvider } from 'antd'

<ConfigProvider prefixCls='demo-ant'>
  <App />
</ConfigProvider>
```

#### 2. 同步 Less 文件中的前缀

当修改 `prefixCls` 值时，**必须同步修改**以下文件中 `:global` 块内的类名前缀：

- `src/pages/content/index.less`
- `src/pages/other/index.less`

**示例：** 如果将 `prefixCls` 修改为 `code-ant`，则需要将所有 `.demo-ant-xxx` 修改为 `.code-ant-xxx`：

```less
// 修改前
:global {
  .demo-ant-tabs-nav-container {
    overflow: visible !important;
  }
  .demo-ant-table-thead > tr > th {
    background-color: var(--rbd-background-color) !important;
  }
}

// 修改后
:global {
  .code-ant-tabs-nav-container {
    overflow: visible !important;
  }
  .code-ant-table-thead > tr > th {
    background-color: var(--rbd-background-color) !important;
  }
}
```

### 主项目公共变量

插件样式需要与主项目保持一致，应使用主项目定义的 CSS 变量。以下是可用的公共变量：

#### 主题色变量

```less
--rbd-primary-color      // 主题色 #155aef
--rbd-success-color      // 成功色 #18B633
--rbd-warning-color      // 警告色 #FF8D3C
--rbd-error-color        // 错误色 #FC481B
```

#### 文字色变量

```less
--rbd-heading-color      // 标题色 #495464
--rbd-text-color         // 主文本色 #495464
--rbd-text-color-secondary  // 次文本色 #676f83
--rbd-label-color        // 标签色 #444444
```

#### 边框和背景变量

```less
--rbd-border-color-base  // 边框色 #E2E2E2
--rbd-background-color   // 背景色 #f2f4f7
--rbd-label-color-secondary  // 次标签色 #8d9bad
```

#### 阴影变量

```less
--rbd-card-shadow        // 卡片阴影
--rbd-card-shadow-hover  // 卡片悬停阴影
```

#### 字体大小变量

```less
--rbd-title-size         // 一级标题 18px
--rbd-sub-title-size     // 二级标题 16px
--rbd-content-size       // 正文 14px
--rbd-auxiliary-size     // 辅助文字 12px
```

#### 状态色变量

```less
--rbd-success-status     // 成功状态 #00D777
--rbd-error-status       // 异常状态 #CD0200
--rbd-warning-status     // 警告状态 #F69D4A
--rbd-down-status        // 下线状态 #708090
--rbd-processing-status  // 处理中状态 #1890ff
```

#### 使用示例

```less
.myComponent {
  color: var(--rbd-text-color);
  background-color: var(--rbd-background-color);
  border: 1px solid var(--rbd-border-color-base);
  box-shadow: var(--rbd-card-shadow);

  &:hover {
    box-shadow: var(--rbd-card-shadow-hover);
  }

  .title {
    font-size: var(--rbd-title-size);
    color: var(--rbd-heading-color);
  }

  .success {
    color: var(--rbd-success-status);
  }

  .error {
    color: var(--rbd-error-status);
  }
}
```

## API 开发规范

### 基础路径配置

所有 API 请求都基于统一的基础路径，由以下两个函数生成：

```javascript
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
```

**路径说明：**

| 部分 | 来源 | 示例 |
|------|------|------|
| `/console/regions/` | 固定前缀 | - |
| `${regionID}` | URL hash 参数 `regionName` | `rainbond` |
| `/backend/plugins/` | 固定中间路径 | - |
| `${pluginName}` | `pluginData.json` 中的 `id` | `rainbod-demo` |

**完整路径示例：**
```
/console/regions/rainbond/backend/plugins/rainbod-demo/api/storages
```

### 请求封装

API 请求使用 `src/utils/request.js` 封装的 axios 实例，结合 `getBasePath()` 构建完整路径：

```javascript
import request from '../utils/request'
import pluginData from '../pluginData.json'

// 获取基础路径（参考上方配置）
const getBasePath = () => { /* ... */ }

// GET 请求示例
export async function getStorageList(params) {
  return request(`${getBasePath()}/api/storages`, {
    method: 'get',
    params,
  })
}

// POST 请求示例
export async function createStorage(data) {
  return request(`${getBasePath()}/api/storages`, {
    method: 'post',
    data,
  })
}

// PUT 请求示例
export async function updateStorage(id, data) {
  return request(`${getBasePath()}/api/storages/${id}`, {
    method: 'put',
    data,
  })
}

// DELETE 请求示例
export async function deleteStorage(id) {
  return request(`${getBasePath()}/api/storages/${id}`, {
    method: 'delete',
  })
}

// 获取下载地址（返回 URL 字符串，不是 Promise）
export function getDownloadUrl(id) {
  return `${getBasePath()}/api/files/${id}/download`
}
```

### 响应处理

API 响应统一格式：

```javascript
{
  status: 200,        // HTTP 状态码
  data: {
    code: 200,        // 业务状态码
    message: 'Success',
    data: {}          // 业务数据
  }
}
```

## 插件配置

### pluginData.json

```json
{
  "type": "page-app",      // 插件类型
  "name": "plugin-name",   // 插件名称
  "id": "plugin-id",       // 插件唯一标识
  "version": "%VERSION%",  // 版本号（构建时替换）
  "updated": "%TODAY%",    // 更新日期（构建时替换）
  "to": "/plugins/%PLUGIN_ID%"  // 路由路径
}
```

### 模块注册

在 `src/moudle.js` 中注册插件模块：

```javascript
import App from './modules/root'
import Other from './modules/other'
import { RainbondRootPagePlugin } from 'xu-demo-data'

export const plugin = new RainbondRootPagePlugin()
  .setRootPage(App)
  .addOtherPage(Other)
```

## 代码规范

### ESLint 规则

项目使用以下 ESLint 插件：
- eslint-plugin-react
- eslint-plugin-react-hooks
- eslint-config-prettier

### Git 提交规范

项目配置了 husky + commitlint，提交信息需遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```bash
feat: 新增功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```



## 依赖说明

### 生产依赖

| 包名 | 说明 |
|------|------|
| antd | UI 组件库 |
| @ant-design/icons | Ant Design 图标 |
| axios | HTTP 客户端 |
| react | React 核心 |
| react-dom | React DOM |
| react-intl-universal | 国际化 |
| moment | 日期处理 |

### 开发依赖

| 包名 | 说明 |
|------|------|
| webpack | 构建工具 |
| webpack-dev-server | 开发服务器 |
| babel-loader | Babel 加载器 |
| swc-loader | SWC 加载器（高性能编译） |
| less-loader | Less 加载器 |
| eslint | 代码检查 |
| husky | Git hooks |
| commitlint | 提交信息检查 |
