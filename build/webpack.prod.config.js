const path = require('path')
const { merge } = require('webpack-merge')
const baseConfig = require('./webpack.base.config')
const MiniCssExtractPlugin = require("mini-css-extract-plugin")
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ReplaceInFileWebpackPlugin = require('replace-in-file-webpack-plugin');
const { hasReadme, getPackageJsonInfo, getPluginId, getTodayDate } = require('./utils');

const REPORT = process.env.REPORT
const prodConfig = {
  mode: 'production',
  devtool: false,
  output: {
    clean: true,
    path: path.join(__dirname, '..', 'dist'),
    filename: 'static/[name].js',
    library: {
      type: 'amd',
    },
  },
  module: {
    rules: [{
      test: /\.less$/,
      exclude: /node_modules/,
      use: [
        'style-loader',
        {
          loader: 'css-loader',
          options: {
            modules: true
          }
        },
        'postcss-loader',
        'less-loader'
      ]
    }]
  },
  externals: [
    'lodash',
    'moment',
    'react',
    'react-dom',
    'xu-demo-data'
  ],
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'static/[name].css',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: hasReadme() ? 'README.md' : '../README.md', to: '.', force: true },
        { from: 'pluginData.json', to: '.' },
        { from: '../LICENSE', to: '.', noErrorOnMissing: true },
        { from: '../CHANGELOG.md', to: '.', force: true, noErrorOnMissing: true },
        { from: '**/*.json', to: '.' }
      ],
    }),
    new ReplaceInFileWebpackPlugin([
      {
        dir: 'dist',
        files: ['pluginData.json', 'README.md'],
        rules: [
          {
            search: /\%VERSION\%/g,
            replace: getPackageJsonInfo().version,
          },
          {
            search: /\%TODAY\%/g,
            replace: getTodayDate(),
          },
          {
            search: /\%PLUGIN_ID\%/g,
            replace: getPluginId(),
          },
        ],
      },
    ]),
  ]
}

if (REPORT) {
  prodConfig.plugins.push(new BundleAnalyzerPlugin())
}

module.exports = merge(baseConfig, prodConfig)
