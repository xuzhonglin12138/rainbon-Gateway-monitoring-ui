const path = require('path')
const fs = require('fs')
const { merge } = require('webpack-merge')
const prodConfig = require('./webpack.prod.config')

// ============================================================
// 配置：修改这里指向你的主项目插件目录
// ============================================================
const MAIN_PROJECT_PLUGIN_PATH = path.resolve(__dirname, '../../rainbond-ui/public/plugins/dist')
// ============================================================

// 自定义插件：构建完成后复制文件
class CopyAfterBuildPlugin {
  constructor(options) {
    this.from = options.from
    this.to = options.to
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('CopyAfterBuildPlugin', (compilation, callback) => {
      this.copyDirectory(this.from, this.to)
      console.log('\n✅ 构建完成，已同步到主项目')
      console.log(`   目标路径: ${this.to}\n`)
      callback()
    })
  }

  copyDirectory(src, dest) {
    // 确保目标目录存在
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }

    const entries = fs.readdirSync(src, { withFileTypes: true })

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)

      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }
}

module.exports = merge(prodConfig, {
  // 使用开发模式，不压缩代码，大幅加快构建速度
  mode: 'development',
  devtool: false,
  optimization: {
    minimize: false,
  },

  // watch 模式配置
  watch: true,
  watchOptions: {
    // 忽略不需要监听的目录
    ignored: ['**/node_modules', '**/dist'],
    aggregateTimeout: 500,
  },

  plugins: [
    // 构建完成后（afterEmit）再复制到主项目
    new CopyAfterBuildPlugin({
      from: path.resolve(__dirname, '../dist'),
      to: MAIN_PROJECT_PLUGIN_PATH,
    }),
  ],
})
