const path = require('path')
const { merge } = require('webpack-merge')
const baseConfig = require('./webpack.base.config')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = merge(baseConfig, {
  mode: 'development',
  devtool: 'eval-cheap-module-source-map',
  output: {
    clean: true,
    path: path.join(__dirname, '..', 'dist'),
    filename: '[name].js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, '..', 'public', 'index.html')
    })
  ],
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
  devServer: {
    compress: true,
    historyApiFallback: true,
    proxy: {
      '/api/v1': {
        target: 'http://14.103.232.255:32222',
        changeOrigin: true,
      },
    },
  }
})