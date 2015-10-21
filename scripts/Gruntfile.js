/*global module:false*/

module.exports = function(grunt) {

  var srcFiles = [
    '../src/sdk/conference/property.js',
    '../src/sdk/base/events.js',
    '../src/sdk/base/L.Base64.js',
    '../src/sdk/base/L.Logger.js',
    '../src/sdk/base/stream.js',
   // '../src/sdk/conference/adapter.js',
    '../src/sdk/conference/conference.js',
    '../src/sdk/conference/ieMediaStream.js',
    '../src/sdk/conference/webrtc-stacks/ChromeStableStack.js',
    '../src/sdk/conference/webrtc-stacks/FirefoxStack.js',
    '../src/sdk/conference/webrtc-stacks/IEStableStack.js',
   // '../src/sdk/p2p/adapter.p2p.js',
    '../src/sdk/p2p/errors.js',
    '../src/sdk/p2p/gab.proxy.js',
    '../src/sdk/p2p/ieMediaStream.p2p.js',
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
window.L = L;\n\
}(window));\n\n\n'
    },
    concat: {
      dist: {
        src: srcFiles,
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
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
        dest: 'dist/<%= pkg.name %>.ui-<%= pkg.version %>.js',
        options: {
          banner: '<%= meta.banner %>' + '<%= meta.header %>',
          separator: '\n\n\n',
          footer: '<%= meta.footer %>',
          process: true
        },
        nonull: true
      },
      merge: {
        src: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
        nonull: true
      }
    },
    jshint: {
      dist: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
      devel: 'dist/<%= pkg.name %>-ui.js',
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
          'dist/<%= pkg.name %>-<%= pkg.version %>.min.js': ['dist/<%= pkg.name %>-<%= pkg.version %>.js'],
          'dist/<%= pkg.name %>.ui-<%= pkg.version %>.min.js': ['dist/<%= pkg.name %>.ui-<%= pkg.version %>.js']
        },
        options: {
          banner: '<%= meta.banner %>',
	  sourceMap:true
        }
      }
    }
  });


  // Load Grunt plugins.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');


  grunt.registerTask('build', ['concat:dist', 'concat:devel', 'jshint:dist', 'concat:merge', 'uglify:dist']);
  // grunt.registerTask('devel', ['concat:devel', 'includereplace:devel', 'jshint:devel', 'concat:post_devel']);

  // Default task is an alias for 'build'.
  grunt.registerTask('default', ['build']);

};
