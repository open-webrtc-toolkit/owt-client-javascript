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
    //  JASMINE,
    //  JASMINE_ADAPTER,
    './dist/samples/p2p/js/jquery-1.10.2.min.js',
    './dist/samples/p2p/js/sc.websocket.js',
    './dist/samples/p2p/js/socket.io.js',
    './dist/samples/p2p/js/adapter.js',
    './dist/samples/p2p/js/utils.js',
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

    // use dots reporter, as travis terminal does not support escaping sequences
    // possible values: 'dots', 'progress', 'junit'
    // CLI --reporters progress
    //reporters : ['dots','junit','coverage'],
    reporters : ['progress','jenkins', 'coverage'],

    jenkinsReporter : {
      useBrowserName:false,
      outputFile:'./test/p2ptest/full-test-firefox-results.xml',
      suite:''
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
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    // CLI --browsers Chrome,Firefox,Safari
    //browsers : [".travis/chrome-start.sh"],
    browsers: ['FirefoxAutoAllowGUM'],
    customLaunchers: {
       FirefoxAutoAllowGUM: {
           base: 'Firefox',
           prefs: {
                'media.navigator.permission.disabled': true,
                'media.navigator.streams.fake' : true,
                'network.proxy.type' : 0
           }
        }
    },
    // browsers : ["Chrome"],
    browserDisconnectTimeout : 60000,
    browserNoActivityTimeout : 60000,

    // If browser does not capture in given timeout [ms], kill it
    // CLI --capture-timeout 5000
    captureTimeout : 60000,

    // Auto run tests on start (when browsers are captured) and exit
    // CLI --single-run --no-single-run
    singleRun : true,
    /*
    protocol: 'https',
    httpsServerOptions: {
        key: fs.readFileSync('/home/yanbin/workspace/Test/2.8test/p2pserver/dist/server/cert/key.pem', 'utf8'),
        cert: fs.readFileSync('/home/yanbin/workspace/Test/2.8test/p2pserver/dist/server/cert/cert.pem', 'utf8')
    },*/
    //hostname : 'yanbin-12.sh.intel.com',
    // report which specs are slower than 500ms
    // CLI --report-slower-than 500
    reportSlowerThan : 500,

    // compile coffee scripts
    preprocessors : {
      '**/*.coffee': 'coffee',
    './src/sdk/woogeen.js':'coverage',
    './src/sdk/events.js':'coverage',
    './src/sdk/errors.js':'coverage',
    './src/sdk/gab.websocket.js':'coverage',
    './src/sdk/peer.js':'coverage'
    },

    plugins:[
      'karma-*',
      'karma-junit-reporter',
      'karma-jenkins-reporter',
      'requirejs'
    ]
  });
};
