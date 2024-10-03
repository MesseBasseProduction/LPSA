const path = require('path');
const webpack = require('webpack');
const loaders = require('./loaders');
const plugins = require('./plugins');

module.exports = {
  entry: {
    LPSA: ['./src/js/LPSA.js'],
    LPSAML: ['./src/js/LPSAML.js']
  },
  module: {
    rules: [
      loaders.JSLoader,
      loaders.CSSLoader
    ]
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, '../assets/dist/'),
    library: '[name]', // We set a library name to bundle the export default of the class
    libraryTarget: 'window', // Make it globally available
    libraryExport: 'default'
  },
  plugins: [
    new webpack.ProgressPlugin(),
    plugins.CleanWebpackPlugin,
    plugins.ESLintPlugin,
    plugins.StyleLintPlugin,
    plugins.MiniCssExtractPlugin
  ]
};
