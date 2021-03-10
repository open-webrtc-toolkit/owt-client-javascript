module.exports = function(config) {
  config.set({
    basePath: '../../..',
    frameworks: ['jasmine', 'mocha', 'chai'],
    files:[
      {pattern: './test/unit/resources/scripts/gen/chai-as-promised-browserified.js'},
      {pattern: './test/unit/resources/scripts/gen/sinon-browserified.js'},
      {pattern: './src/sdk/!(rest)/*.js', type:'module'},
      {pattern: './test/unit/resources/scripts/!(runner.js)', type:'module'},
    ],
    client: {
      mocha:{
        reporter:'html',
      }
    },
    reporters: ['mocha'],
    plugins: [
      require('karma-chrome-launcher'),
      require('karma-safari-launcher'),
      require('karma-jasmine'),
      require('karma-mocha'),
      require('karma-chai'),
      require('karma-mocha-reporter'),
    ],
  });
};