const webpack = require('webpack');
const loaders = require('../webpack/loaders');
const plugins = require('../webpack/plugins');

module.exports = config => {
  config.set({
    basePath: '../',
    singleRun: !config.dev, // Keep browser open in dev mode
    browsers: ['Firefox'],
    frameworks: ['jasmine'],
    client: {
      jasmine: {
        clearContext: false,
        random: !config.dev // Randomly run test when not developping them
      }
    },
    files: [
      'test/testContext.js',
      'test/testStyle.css',
      'test/templates/index.html',
      { pattern: 'assets/lib/*.css', included: false, served: true },
      { pattern: 'assets/lib/*.js', included: false, served: true }
    ],
    reporters: ['kjhtml', 'progress'],
    preprocessors: {
      'test/testContext.js': ['webpack'],
      '**/*.html': ['html2js']
    },
    babelPreprocessor: {
      options: {
        presets: ['env'],
        sourceMap: false
      }
    },
    html2JsPreprocessor: {
      stripPrefix: 'public/',
      prependPrefix: 'served/',
      processPath: filePath => {
        return filePath.replace(/\.html$/, '');
      }
    },
    webpack: {
      devtool: false,
      module: {
        rules: [
          loaders.JSLoader,
          loaders.CSSLoader
        ]
      },
      plugins: [
        new webpack.ProgressPlugin(),
        plugins.CleanWebpackPlugin,
        plugins.ESLintPlugin,
        plugins.StyleLintPlugin,
        plugins.MiniCssExtractPlugin
      ],
      watch: true,
      mode: 'development'
    },
    webpackServer: {
      noInfo: true
    }
  });
};
