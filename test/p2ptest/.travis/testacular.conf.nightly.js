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
    basePath : '../',
    frameworks : ["jasmine"],
    // list of files / patterns to load in the browser
    files : [
    '../dist/samples/p2p/js/jquery-1.10.2.min.js',
    '../dist/samples/p2p/js/utils.js',
    '../dist/samples/p2p/js/sc.websocket.js',
    '../dist/sdk/dependencies/adapter.js',
    '../dist/sdk/woogeen.sdk.js',
    '../dist/sdk/woogeen.sdk.ui.js',
    '../dist/sdk/dependencies/socket.io.js',
    'errorHandler.js',
    './js/test_functions.js',
    './js/video_detector.js',
    './js/test.n.js',
    './js/qq.js',
    './js/MediaStreamTest.js',
    'test-peer.js'
    ],

    // list of files to exclude
    exclude : [],

    // use dots reporter, as travis terminal does not support escaping sequences
    // possible values: 'dots', 'progress', 'junit'
    // CLI --reporters progress
    //reporters : ['dots','junit','coverage'],
    reporters : ['progress','jenkins'],

    jenkinsReporter : {
      useBrowserName:false,
      outputFile:'./test-results.xml',
      suite:''
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
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    // CLI --browsers Chrome,Firefox,Safari
    browsers : [".travis/chrome-start.sh"],

    browserDisconnectTimeout : 60000,
    browserNoActivityTimeout : 60000,
    // If browser does not capture in given timeout [ms], kill it
    // CLI --capture-timeout 5000
    captureTimeout : 10000,

    protocol: 'https',

    httpsServerOptions: {
        key: fs.readFileSync('../server/dist/server/cert/key.pem', 'utf8'),
        cert: fs.readFileSync('../server/dist/server/cert/cert.pem', 'utf8')
    },
    // Auto run tests on start (when browsers are captured) and exit
    // CLI --single-run --no-single-run
    singleRun : true,

    // report which specs are slower than 500ms
    // CLI --report-slower-than 500
    reportSlowerThan : 500,

    // compile coffee scripts
    preprocessors : {
      '**/*.coffee': 'coffee'
    },

    plugins:[
      'karma-*',
      'karma-junit-reporter',
      'karma-jenkins-reporter'
    ]
  });
};
