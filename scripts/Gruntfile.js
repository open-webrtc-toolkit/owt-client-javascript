/*global module:false*/
module.exports = function(grunt) {

  var srcFiles = [
    '../src/sdk/base/property.js',
    '../src/sdk/base/events.js',
    '../src/sdk/base/common.legacy.js',
    '../src/sdk/base/L.Base64.js',
    '../src/sdk/base/L.Logger.js',
    '../src/sdk/base/stream.legacy.js',
    '../src/sdk/conference/conferencesignaling.js',
    '../src/sdk/conference/conference.legacy.js',
    '../src/sdk/conference/webrtc-stacks/ChromeStableStack.js',
    '../src/sdk/conference/webrtc-stacks/FirefoxStack.js',
    '../src/sdk/conference/webrtc-stacks/EdgeORTCStack.js',
    '../src/sdk/p2p/errors.js',
    '../src/sdk/p2p/gab.proxy.js',
    '../src/sdk/p2p/peer.legacy.js'
  ];

  var uiSrcFiles = [
    '../src/sdk/ui/AudioPlayer.js',
    '../src/sdk/ui/Bar.js',
    '../src/sdk/ui/L.Resizer.js',
    '../src/sdk/ui/Speaker.js',
    '../src/sdk/ui/View.js',
    '../src/sdk/ui/VideoPlayer.js',
    '../src/sdk/ui/ui.js'
  ];

  var nuveFiles = [
    '../src/sdk/nuve/xmlhttprequest.js',
    '../src/sdk/nuve/hmac-sha256.js',
    '../src/sdk/nuve/N.js',
    '../src/sdk/nuve/N.Base64.js',
    '../src/sdk/nuve/N.API.js'
  ];

  var icsRESTFiles = [
    '../src/sdk/icsREST/xmlhttprequest.js',
    '../src/sdk/icsREST/hmac-sha256.js',
    '../src/sdk/icsREST/Base64.js',
    '../src/sdk/icsREST/API.js'
  ];

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '\
/*\n\
 * Intel WebRTC SDK version <%= pkg.version %>\n\
 * Copyright (c) <%= grunt.template.today("yyyy") %> Intel <http://webrtc.intel.com>\n\
 * Homepage: http://webrtc.intel.com\n\
 */\n\n\n',
      header: '(function(window) {\n\n\n',
      footer: '\
\n\n\nwindow.Erizo = Erizo;\n\
window.Woogeen = Woogeen;\n\
window.L = L;\n\
}(window));\n\n\n'
    },
    eslint: {
      options: {
        configFile: '../src/.eslintrc.json'
      },
      src: srcFiles
    },
    browserify: {
      dist: {
        src: ['../src/sdk/export.js'],
        dest: '../dist/sdk/ics.js',
              banner: '\
/*\n\
 * Intel WebRTC SDK version <%= pkg.version %>\n\
 * Copyright (c) <%= grunt.template.today("yyyy") %> Intel <http://webrtc.intel.com>\n\
 * Homepage: http://webrtc.intel.com\n\
 */\n\n\n',
        options: {
          browserifyOptions: {
            debug: true,
            standalone: 'Ics'
          },
          transform: [["babelify", { "presets": ["es2015"] }]],
        },
      }
    },
    concat: {
      dist: {
        src: srcFiles,
        dest: '../dist/sdk/<%= pkg.name %>.js',
        options: {
          banner: '<%= meta.banner %>' + '<%= meta.header %>',
          separator: '\n\n\n',
          footer: '<%= meta.footer %>',
          process: true
        },
        nonull: true
      },
      ui_dist: {
        src: uiSrcFiles,
        dest: '../dist/sdk/<%= pkg.name %>.ui.js',
        options: {
          banner: '<%= meta.banner %>' + '<%= meta.header %>',
          separator: '\n\n\n',
          footer: '<%= meta.footer %>',
          process: true
        },
        nonull: true
      },
      dist_debug: {
        src: srcFiles,
        dest: '../dist/sdk-debug/<%= pkg.name %>.debug.js',
        options: {
          banner: '<%= meta.banner %>' + '<%= meta.header %>',
          separator: '\n\n\n',
          footer: '<%= meta.footer %>',
          process: true
        },
        nonull: true
      },
      ui_dist_debug: {
        src: uiSrcFiles,
        dest: '../dist/sdk-debug/<%= pkg.name %>.ui.debug.js',
        options: {
          banner: '<%= meta.banner %>' + '<%= meta.header %>',
          separator: '\n\n\n',
          footer: '<%= meta.footer %>',
          process: true
        },
        nonull: true
      },
      nuve: {
        src: nuveFiles,
        dest: '../dist/sdk/nuve.js',
        options:{
           footer:'module.exports = N;',
           process: true
        },
        nonull: true
      },
      nuve_debug: {
        src: nuveFiles,
        dest: '../dist/sdk-debug/nuve.debug.js',
        options:{
           footer:'module.exports = N;',
           process: true
        },
        nonull: true
      },
      icsREST: {
        src: icsRESTFiles,
        dest: '../dist/sdk/icsREST.js',
        options:{
           footer:'module.exports = ICS_REST;',
           process: true
        },
        nonull: true
      },
      icsREST_debug: {
        src: icsRESTFiles,
        dest: '../dist/sdk-debug/icsREST.debug.js',
        options:{
           footer:'module.exports = ICS_REST;',
           process: true
        },
        nonull: true
      },
      merge: {
        src: '../dist/sdk/<%= pkg.name %>.js',
        dest: '../dist/sdk/<%= pkg.name %>.js',
        nonull: true
      }
    },
    jshint: {
      dist: '../dist/sdk/<%= pkg.name %>.js',
      ui_dist: '../dist/sdk/<%= pkg.name %>.ui.js',
      options: {
        esversion: 6,
        browser: true,
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: false,
        newcap: false,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        onecase: true,
        unused: true,
        supernew: true,
        laxcomma: true
      },
      globals: {}
    },
    uglify: {
      dist: {
        files: {
          '../dist/sdk/<%= pkg.name %>.js': ['../dist/sdk/<%= pkg.name %>.js'],
          '../dist/sdk/nuve.js': ['../dist/sdk/nuve.js'],
          '../dist/sdk/icsREST.js': ['../dist/sdk/icsREST.js']
        },
        options: {
          banner: '<%= meta.banner %>'
          //sourceMap:true
        }
      }
    },
    copy:{
      dist:{
        files:[
          {expand: true,cwd:'../src/samples/p2p/',src:['**'],dest:'../dist/samples/p2p/',flatten:false},
          {expand: true,cwd:'../src/samples/conference/',src:['**'],dest:'../dist/samples/conference/',flatten:false},
          {expand: true,cwd:'../src/samples/conference/',src:['initcert.js'],dest:'../dist/samples/conference/',flatten:false,mode:true},
          {expand: true,cwd:'../src/samples/conference/cert/',src:['.woogeen.keystore'],dest:'../dist/samples/conference/cert/',flatten:false,mode:true},
          {expand: true,cwd:'../src/samples/sipgw/',src:['**'],dest:'../dist/samples/sipgw/',flatten:false},
          {expand: true,cwd:'../src/sdk/base/',src:['socket.io.js'],dest:'../dist/sdk/dependencies/',flatten:false},
          {expand: true,cwd:'../src/sdk/base/',src:['adapter.js'],dest:'../dist/sdk/dependencies',flatten:false},
          {expand: true,cwd:'../src/sdk/base/',src:['adapter.js'],dest:'../dist/samples/conference/public/',flatten:false},
          {expand: true,cwd:'../src/sdk/base/',src:['adapter.js'],dest:'../dist/samples/sipgw/public/',flatten:false},
          {expand: true,cwd:'../src/extension/',src:['**'],dest:'../dist/',flatten:false},
          {expand: true,cwd:'../src/sdk/base/',src:['socket.io.js'],dest:'../dist/samples/conference/public/',flatten:false},
          {expand: true,cwd:'../src/sdk/base/',src:['socket.io.js'],dest:'../dist/samples/sipgw/public/',flatten:false},
          {expand: true,cwd:'../dist/sdk/',src:['woogeen.sdk.js'],dest:'../dist/samples/conference/public/',flatten:false},
          {expand: true,cwd:'../dist/sdk/',src:['woogeen.sdk.js'],dest:'../dist/samples/sipgw/public/',flatten:false},
          {expand: true,cwd:'../dist/sdk/',src:['woogeen.sdk.ui.js'],dest:'../dist/samples/conference/public/',flatten:false},
          {expand: true,cwd:'../dist/sdk/',src:['woogeen.sdk.ui.js'],dest:'../dist/samples/sipgw/public/',flatten:false},
          {expand: true,cwd:'../dist/sdk/',src:['nuve.js'],dest:'../dist/samples/conference/',flatten:false},
          {expand: true,cwd:'../dist/sdk/',src:['nuve.js'],dest:'../src/samples/conference/',flatten:false},
          {expand: true,cwd:'../dist/sdk/',src:['icsREST.js'],dest:'../dist/samples/conference/',flatten:false},
          {expand: true,cwd:'../dist/sdk/',src:['icsREST.js'],dest:'../src/samples/conference/',flatten:false}
        ]
      }
    },
    'string-replace': {
      dist_p2p: {
        files: {
          '../dist/samples/p2p/peercall.html': '../src/samples/p2p/peercall.html',
        },
        options: {
        replacements: [
          {
            pattern: '<script src="../../sdk/base/adapter.js" type="text/javascript"></script>',
            replacement: '<script src="../../sdk/dependencies/adapter.js" type="text/javascript"></script>'
          },
          {
            pattern: '<script src="../../sdk/base/socket.io.js" type="text/javascript"></script>',
            replacement: '<script src="../../sdk/dependencies/socket.io.js" type="text/javascript"></script>'
          },
          {
            pattern: /<!-- SDK Starts -->[\w\W]+<!-- SDK Stops -->/gm,
            replacement: '<script src="../../sdk/woogeen.sdk.js" type="text/javascript"></script>'
          },
          {
            pattern: /var serverAddress.*/g,
            replacement: 'var serverAddress=\'https://example.com:8096\';  // Please change example.com to signaling server\'s address.'
          }
         ]
        }
      },
      dist_conference:{
         files: {
          '../dist/samples/conference/public/index.html': '../src/samples/conference/public/index.html',
        },
        options: {
        replacements: [
          {
            pattern: '<script src="sdk/base/socket.io.js" type="text/javascript"></script>',
            replacement: '<script src="socket.io.js" type="text/javascript"></script>'
          },
          {
            pattern: '<script src="sdk/base/adapter.js" type="text/javascript"></script>\n    <script src="sdk/conference/property.js" type="text/javascript"></script>\n    <script src="sdk/base/events.js" type="text/javascript"></script>\n    <script src="sdk/base/L.Base64.js" type="text/javascript"></script>\n    <script src="sdk/base/L.Logger.js" type="text/javascript"></script>\n    <script src="sdk/base/stream.js" type="text/javascript"></script>\n    <script src="sdk/conference/conference.js" type="text/javascript"></script>\n    <script src="sdk/conference/webrtc-stacks/ChromeStableStack.js" type="text/javascript"></script>\n    <script src="sdk/conference/webrtc-stacks/FirefoxStack.js" type="text/javascript"></script>\n    <script src="sdk/conference/webrtc-stacks/IEStableStack.js" type="text/javascript"></script>\n    <script src="sdk/conference/webrtc-stacks/EdgeORTCStack.js" type="text/javascript"></script>',
            replacement:'<script src="adapter.js" type="text/javascript"></script>\n    <script src="woogeen.sdk.js" type="text/javascript"></script>'
          },
          {
            pattern: '<script src="sdk/ui/AudioPlayer.js" type="text/javascript"></script>\n    <script src="sdk/ui/Bar.js" type="text/javascript"></script>\n    <script src="sdk/ui/L.Resizer.js" type="text/javascript"></script>\n    <script src="sdk/ui/View.js" type="text/javascript"></script>\n    <script src="sdk/ui/Speaker.js" type="text/javascript"></script>\n    <script src="sdk/ui/VideoPlayer.js" type="text/javascript"></script>\n    <script src="sdk/ui/ui.js" type="text/javascript"></script>',
            replacement: '<script src="woogeen.sdk.ui.js" type="text/javascript"></script>'
          }
         ]
        }
      }
    },
    compress:{
      dist:{
        options:{
          archive:'../release-<%= pkg.version %>.zip'
        },
        files:[
          {src:['../dist/**'],dest:'../'}
        ]
      }
    }
  });


  // Load Grunt plugins.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('build', ['eslint:src', 'concat:dist', 'concat:ui_dist', 'concat:nuve', 'concat:icsREST', 'jshint:dist', 'concat:merge', 'uglify:dist','copy:dist','string-replace','compress:dist']);

  // Default task is an alias for 'build'.
  grunt.registerTask('default', ['build']);

  grunt.registerTask('debug', ['concat:dist_debug', 'concat:ui_dist_debug', 'concat:nuve_debug', 'concat:icsREST_debug']);

};
