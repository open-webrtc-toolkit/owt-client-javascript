/*global module:false*/
module.exports = function(grunt) {

  const sdkEntry = 'src/sdk/export.js';
  const sdkOutput = 'dist/sdk/owt.js';

  var srcFiles = [
    'src/sdk/base/**',
    'src/sdk/p2p/**',
    'src/sdk/conference/**'
  ];

  var restFiles = [
    'src/sdk/rest/hmac-sha256.js',
    'src/sdk/rest/Base64.js',
    'src/sdk/rest/API.js'
  ];

  grunt.file.setBase('../');

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
        configFile: 'src/.eslintrc.json'
      },
      src: srcFiles
    },
    browserify: {
      dist: {
        src: [sdkEntry],
        dest: sdkOutput,
        options: {
          browserifyOptions: {
            standalone: 'Owt',
            debug: false
          },
          transform: [
            ["babelify", { "presets": ["@babel/preset-env"] }]
          ]
        },
      },
      dev: {
        src: [sdkEntry],
        dest: 'dist/sdk-debug/owt.js',
        options: {
          browserifyOptions: {
            standalone: 'Owt',
            debug: true
          },
          transform: [
            ["babelify", { "presets": ["@babel/preset-env"] }]
          ],
          watch: true
        },
      },
      sinon: {
          src: ['node_modules/sinon/lib/sinon.js'],
          dest: 'test/unit/resources/scripts/gen/sinon-browserified.js',
          options: {
            browserifyOptions: {
              standalone: 'sinon',
              debug: false
            },
          },
        },
        chai_as_promised: {
          src: ['node_modules/chai-as-promised/lib/chai-as-promised.js'],
          dest: 'test/unit/resources/scripts/gen/chai-as-promised-browserified.js',
          options: {
            browserifyOptions: {
              standalone: 'chaiAsPromised',
              debug: false
            },
          },
        }
    },
    connect: {
      server: {
        options: {
          base: '.',
          port: 7080,
          keepalive: true
        },
      },
    },
    concat: {
      dist: {
        src: srcFiles,
        dest: 'dist/sdk/<%= pkg.name %>.js',
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
        dest: 'dist/sdk-debug/<%= pkg.name %>.debug.js',
        options: {
          banner: '<%= meta.banner %>' + '<%= meta.header %>',
          separator: '\n\n\n',
          footer: '<%= meta.footer %>',
          process: true
        },
        nonull: true
      },
      rest: {
        src: restFiles,
        dest: 'dist/samples/conference/public/scripts/rest.js',
        options:{
           footer:'module.exports = OWT_REST;',
           process: true
        },
        nonull: true
      },
      merge: {
        src: 'dist/sdk/<%= pkg.name %>.js',
        dest: 'dist/sdk/<%= pkg.name %>.js',
        nonull: true
      }
    },
    jshint: {
      dist: 'dist/sdk/<%= pkg.name %>.js',
      ui_dist: 'dist/sdk/<%= pkg.name %>.ui.js',
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
          'dist/sdk/owt.js': ['dist/sdk/owt.js']
        },
        options: {
          banner: '<%= meta.banner %>',
          // TODO: Enable source map.
          sourceMap: false
        }
      }
    },
    copy:{
      dist:{
        files:[
          {expand: true,cwd:'src/samples/p2p/',src:['**'],dest:'dist/samples/p2p/',flatten:false},
          {expand: true,cwd:'src/samples/conference/',src:['**'],dest:'dist/samples/conference/',flatten:false},
          {expand: true,cwd:'src/samples/conference/',src:['initcert.js'],dest:'dist/samples/conference/',flatten:false,mode:true},
          {expand: true,cwd:'src/samples/conference/cert/',src:['.woogeen.keystore'],dest:'dist/samples/conference/cert/',flatten:false,mode:true},
          {expand: true,cwd:'src/extension/',src:['**'],dest:'dist/',flatten:false},
          {expand: true,cwd:'dist/sdk/',src:['owt.js'],dest:'dist/samples/conference/public/scripts/',flatten:false},
          {expand: true,cwd:'dist/samples/conference/public/scripts',src:['rest.js'],dest:'dist/samples/conference/',flatten:false},
          {expand: true,cwd:'dist/sdk/',src:['owt.js'],dest:'dist/samples/p2p/js/',flatten:false}
        ]
      }
    },
    'string-replace': {
      dist_p2p: {
        files: {
          'dist/samples/p2p/peercall.html': 'src/samples/p2p/peercall.html',
        },
        options: {
        replacements: [
          {
            pattern: /<!-- SDK Starts -->[\w\W]+<!-- SDK Stops -->/gm,
            replacement: '<script src="js/owt.js" type="text/javascript"></script>'
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
          'dist/samples/conference/public/index.html': 'src/samples/conference/public/index.html',
        },
        options: {
        replacements: [
          {
            pattern: '<script src="../../../../dist/sdk-debug/owt.js" type="text/javascript"></script>',
            replacement: '<script src="scripts/owt.js" type="text/javascript"></script>'
          },
         ]
        }
      }
    },
    compress:{
      dist:{
        options:{
          archive:'release-<%= pkg.version %>.zip'
        },
        files:[{
          expand: true,
          cwd: 'dist/',
          src:['samples/**','screen-sharing-chrome-extension/**','sdk/**','ThirdpartyLicenses.txt'],
          dest:'./',
          dot: true
        }]
      }
    },
    jsdoc : {
      dist : {
        src: ['docs/mdfiles/index.md'],
        options: {
          destination: 'dist/docs',
          template : 'node_modules/ink-docstrap/template',
          configure : 'docs/jsdoc/config.json',
          recurse: true
        }
      }
    }
  });


  // Load Grunt plugins.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify-es');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-jsdoc');

  grunt.registerTask('prepare', ['browserify:sinon', 'browserify:chai_as_promised']);
  grunt.registerTask('pack', ['browserify:dist', 'concat:rest', 'uglify:dist', 'copy:dist', 'string-replace', 'compress:dist', 'jsdoc:dist']);
  grunt.registerTask('dev', ['browserify:dev', 'connect:server']);
  grunt.registerTask('default', ['pack']);
};
