const chromeFlags = [
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  '--no-sandbox',
  '--headless',
  '--disable-gpu',
];
const firefoxFlags = ['-headless'];
const safariFlags = '';

process.on('infrastructure_error', (error) => {
  console.error('infrastructure_error', error);
});

module.exports = function (config) {
  config.set({
    basePath: '../../..',
    frameworks: ['mocha', 'chai'],
    browsers: [process.env.BROWSER],
    customLaunchers: {
      ChromeWithFlags: {
        base: 'ChromeHeadless',
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
      },
      EdgeWithFlags: {
        base: 'EdgeHeadless',
        flags: chromeFlags
      },
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
        ui: 'bdd',
      }
    },
    reporters: ['mocha'],
    singleRun: true,
    concurrency: 1,
    color: true,
    plugins: [
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
      require('karma-safari-launcher'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-mocha-reporter'),
      require('@chiragrupani/karma-chromium-edge-launcher'),
    ],
  });
};