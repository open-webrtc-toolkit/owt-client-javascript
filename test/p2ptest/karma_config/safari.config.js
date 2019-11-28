var fs = require("fs");
module.exports = function (config) {
  config.set({
    basePath: '../../..',
    frameworks: ["jasmine"],
    // list of files / patterns to load in the browser
    files: [
      './test/p2ptest/dependencies/jquery.min.js',
      './test/p2ptest/dependencies/socket.io.min.js',
      './test/p2ptest/dependencies/q.js',
      './dist/samples/p2p/js/sc.websocket.js',
      './dist/sdk/owt.js',
      './test/p2ptest/js/errorHandler.js',
      './test/p2ptest/js/test_functions.js',
      './test/p2ptest/js/video_detector.js',
      './test/p2ptest/js/videoFrameChecker.js',
      './test/p2ptest/js/test.js',
      './test/p2ptest/test-ci.js',
      './test/p2ptest/js/config.js',
    ],

    exclude: [],

    reporters: ['progress', 'junit', 'coverage'],

    junitReporter: {
      outputDir: './test/p2ptest',
      outputFile: 'full-test-safari-results.xml',
      useBrowserName: false
    },

    coverageReporter: {
      type: 'html',
      dir: 'test/coverage/'
    },

    port: 9876,

    runnerPort: 9100,

    colors: true,

    logLevel: config.LOG_DEBUG,

    autoWatch: false,

    browsers: ["Safari"],
    browserDisconnectTimeout: 60000,
    browserNoActivityTimeout: 60000,

    captureTimeout: 60000,

    singleRun: true,

    reportSlowerThan: 500,

    preprocessors: {
      '**/*.coffee': 'coffee',
      './src/sdk/p2p/p2pclient.js': 'coverage'
    },

    plugins: [
      require('karma-coffee-preprocessor'),
      require('karma-safari-launcher'),
      require('karma-coverage'),
      require('karma-jasmine'),
      require('karma-script-launcher'),
      require('karma-junit-reporter'),
      require('requirejs')
    ]
  });
};
