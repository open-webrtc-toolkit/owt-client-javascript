const chromeFlags = [
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  '--no-sandbox',
  '--headless',
];
const firefoxFlags = ['-headless'];
const safariFlags = '';

module.exports = function (config) {
  config.set({
    basePath: '../../..',
    frameworks: ['jasmine', 'mocha', 'chai'],
    browsers: ['ChromeWithFlags', 'SafariWithFlags'],
    customLaunchers: {
      ChromeWithFlags: {
        base: 'Chrome',
        flags: chromeFlags
      },
      FirefoxWithFlags: {
        base:'Firefox',
        prefs: {
          'media.navigator.streams.fake': true,
          'media.navigator.permission.disabled': true
        },
        flags: firefoxFlags,
      },
      SafariWithFlags: {
        base: 'Safari',
        flags: safariFlags,
      }
    },
    files: [{
        pattern: './test/unit/resources/scripts/gen/chai-as-promised-browserified.js'
      },
      {
        pattern: './test/unit/resources/scripts/gen/sinon-browserified.js'
      },
      {
        pattern: './src/sdk/!(rest)/*.js',
        type: 'module'
      },
      {
        pattern: './test/unit/resources/scripts/!(runner.js)',
        type: 'module'
      },
    ],
    client: {
      mocha: {
        reporter: 'html',
      }
    },
    reporters: ['mocha'],
    singleRun: true,
    concurrency: 1,
    plugins: [
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-safari-launcher'),
      require('karma-jasmine'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-mocha-reporter'),
    ],
  });
};