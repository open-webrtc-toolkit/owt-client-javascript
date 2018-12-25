// Sample Testacular configuration file, that contain pretty much all the available options
// It's used for running client tests on Travis (http://travis-ci.org/#!/vojtajina/testacular)
// Most of the options can be overriden by cli arguments (see testacular --help)
//
// For all available config options and default values, see:
// https://github.com/vojtajina/testacular/blob/stable/lib/config.js#L54


// base path, that will be used to resolve files and exclude
var fs = require("fs");
module.exports = function (config){
  config.set({
    basePath : '../../..',
    frameworks : ["jasmine"],
    // list of files / patterns to load in the browser
    files : [
    'https://code.jquery.com/jquery-1.10.2.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/socket.io/1.4.5/socket.io.min.js',
    'https://webrtchacks.github.io/adapter/adapter-7.0.0.js',
    './dist/samples/p2p/js/sc.websocket.js',
    './dist/sdk/oms.js',
    './test/p2ptest/js/errorHandler.js',
    './test/p2ptest/js/test_functions.js',
    './test/p2ptest/js/video_detector.js',
    './test/p2ptest/js/videoFrameChecker.js',
    './test/p2ptest/js/test.js',
    './test/p2ptest/js/qq.js',
    './test/p2ptest/test-ci.js',
    './test/p2ptest/js/config.js',
    ],

    // list of files to exclude
    exclude : [],

    reporters : ['progress','junit', 'coverage'],

    junitReporter: {
        outputDir: './test/p2ptest',
        outputFile: 'full-test-firefox-results.xml',
        useBrowserName: false
    },

    coverageReporter : {
      type : 'html',
      dir : 'test/coverage/'
    },

    // web server port
    // CLI --port 9876
    port : 9876,

    // cli runner port
    // CLI --runner-port 9100
    runnerPort : 9100,

    // enable / disable colors in the output (reporters and logs)
    // CLI --colors --no-colors
    colors : true,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    // CLI --log-level debug
    logLevel : config.LOG_DEBUG,

    // enable / disable watching file and executing tests whenever any file changes
    // CLI --auto-watch --no-auto-watch
    autoWatch : false,

    // Start these browsers, currently available:
    browsers: ['FirefoxAutoAllowGUM'],
    customLaunchers: {
       FirefoxAutoAllowGUM: {
           base: 'Firefox',
           prefs: {
                'media.navigator.permission.disabled': true,
                'media.navigator.streams.fake' : true,
                'network.proxy.type' : 5
           }
        }
    },
    browserDisconnectTimeout : 60000,
    browserNoActivityTimeout : 60000,

    // If browser does not capture in given timeout [ms], kill it
    // CLI --capture-timeout 5000
    captureTimeout : 60000,

    // Auto run tests on start (when browsers are captured) and exit
    // CLI --single-run --no-single-run
    singleRun : true,

    // CLI --report-slower-than 500
    reportSlowerThan : 500,

    // compile coffee scripts
    preprocessors : {
    '**/*.coffee': 'coffee',
    './src/sdk/p2p/p2pclient.js':'coverage'
    },

    plugins:[
      require('karma-coffee-preprocessor'),
      require('karma-firefox-launcher'),
      require('karma-coverage'),
      require('karma-jasmine'),
      require('karma-script-launcher'),
      require('karma-junit-reporter'),
      require('requirejs')
    ]
  });
};
