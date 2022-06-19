/**
@license
*/

const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
// const WorkboxWebpackPlugin = require('workbox-webpack-plugin');

module.exports = {
  devServer: {
    historyApiFallback: true
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { chrome: '90' } }]
            ],
            plugins: ['@babel/plugin-syntax-dynamic-import']
          }
        }
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader'
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.ts']
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        'images/**',
        {
          from: 'node_modules/web-animations-js/web-animations-next-lite.min.js',
          to: 'node_modules/web-animations-js/web-animations-next-lite.min.js'
        },
        'manifest.json'
      ]
    }),
    new HtmlWebpackPlugin({
      chunksSortMode: 'none',
      template: 'src/index.html'
    }) /*,
    new WorkboxWebpackPlugin.GenerateSW({
      include: ['index.html', 'manifest.json', /\.js$/],
      exclude: [/\/@webcomponents\/webcomponentsjs\//],
      navigateFallback: 'index.html',
      swDest: 'service-worker.js',
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /\/@webcomponents\/webcomponentsjs\//,
          handler: 'staleWhileRevalidate'
        },
        {
          urlPattern: /^https:\/\/fonts.gstatic.com\//,
          handler: 'staleWhileRevalidate'
        }
      ]
    }) */
  ]
};
