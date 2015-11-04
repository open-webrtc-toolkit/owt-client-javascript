/*global module:false*/

module.exports = function(grunt) {

  var srcFiles = [
    '../src/sdk/conference/property.js',
    '../src/sdk/base/events.js',
    '../src/sdk/base/L.Base64.js',
    '../src/sdk/base/L.Logger.js',
    '../src/sdk/base/ieMediaStream.js',
    '../src/sdk/base/stream.js',
    '../src/sdk/conference/conference.js',
    '../src/sdk/conference/webrtc-stacks/ChromeStableStack.js',
    '../src/sdk/conference/webrtc-stacks/FirefoxStack.js',
    '../src/sdk/conference/webrtc-stacks/IEStableStack.js',
    '../src/sdk/p2p/errors.js',
    '../src/sdk/p2p/gab.proxy.js',
    '../src/sdk/p2p/peer.js'
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
window.Woogeen_IEPlugin = Woogeen_IEPlugin;\n\
window.L = L;\n\
}(window));\n\n\n'
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
      devel: {
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
      merge: {
        src: '../dist/sdk/<%= pkg.name %>.js',
        dest: '../dist/sdk/<%= pkg.name %>.js',
        nonull: true
      }
    },
    jshint: {
      dist: '../dist/sdk/<%= pkg.name %>.js',
      devel: '../dist/sdk/<%= pkg.name %>.ui.js',
      options: {
        browser: true,
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
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
          '../dist/sdk/<%= pkg.name %>.min.js': ['../dist/sdk/<%= pkg.name %>.js'],
          '../dist/sdk/<%= pkg.name %>.ui.min.js': ['../dist/sdk/<%= pkg.name %>.ui.js']
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
          {expand: true,cwd:'../src/samples/',src:['**'],dest:'../dist/samples/',flatten:false},
          {expand: true,cwd:'../src/sdk/base/',src:['strophe.js','socket.io.js'],dest:'../dist/sdk/dependencies/',flatten:false},
          {expand: true,cwd:'../src/sdk/base/',src:['adapter.js'],dest:'../dist/sdk/',flatten:false},
          {expand: true,cwd:'../src/extension/',src:['**'],dest:'../dist/',flatten:false},
          {expand: true,cwd:'../src/sdk/base/',src:['socket.io.js'],dest:'../dist/samples/conference/public/',flatten:false},
          {expand: true,cwd:'../dist/sdk/',src:['woogeen.sdk.js'],dest:'../dist/samples/conference/public/',flatten:false},
          {expand: true,cwd:'../dist/sdk/',src:['woogeen.sdk.ui.js'],dest:'../dist/samples/conference/public/',flatten:false}
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
            replacement: '<script src="../../sdk/adapter.js" type="text/javascript"></script>'
          },
          {
            pattern: '<script src="../../sdk/base/socket.io.js" type="text/javascript"></script>',
            replacement: '<script src="../../sdk/dependencies/socket.io.js" type="text/javascript"></script>'
          },
          {
            pattern: '<script src="../../sdk/conference/property.js" type="text/javascript"></script>\n  <script src="../../sdk/base/events.js" type="text/javascript"></script>\n  <script src="../../sdk/base/L.Base64.js" type="text/javascript"></script>\n  <script src="../../sdk/base/L.Logger.js" type="text/javascript"></script>\n  <script src="../../sdk/base/stream.js" type="text/javascript"></script>\n  <script src="../../sdk/base/ieMediaStream.js" type="text/javascript"></script>\n  <script src="../../sdk/p2p/errors.js" type="text/javascript"></script>\n  <script src="../../sdk/p2p/gab.proxy.js" type="text/javascript"></script>\n  <script src="../../sdk/p2p/peer.js" type="text/javascript"></script>',
            replacement: '<script src="../../sdk/woogeen.sdk.min.js" type="text/javascript"></script>'
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
            pattern: '<script src="sdk/conference/property.js" type="text/javascript"></script>\n    <script src="sdk/base/events.js" type="text/javascript"></script>\n    <script src="sdk/base/L.Base64.js" type="text/javascript"></script>\n    <script src="sdk/base/L.Logger.js" type="text/javascript"></script>\n    <script src="sdk/base/stream.js" type="text/javascript"></script>\n    <script src="sdk/base/ieMediaStream.js" type="text/javascript"></script>\n    <script src="sdk/conference/conference.js" type="text/javascript"></script>\n    <script src="sdk/conference/webrtc-stacks/ChromeStableStack.js" type="text/javascript"></script>\n    <script src="sdk/conference/webrtc-stacks/FirefoxStack.js" type="text/javascript"></script>\n    <script src="sdk/conference/webrtc-stacks/IEStableStack.js" type="text/javascript"></script>',
            replacement:'<script src="woogeen.sdk.js" type="text/javascript"></script>'
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

  grunt.registerTask('build', ['concat:dist', 'concat:devel', 'jshint:dist', 'concat:merge', 'uglify:dist','copy:dist','string-replace','compress:dist']);

  // Default task is an alias for 'build'.
  grunt.registerTask('default', ['build']);

};
