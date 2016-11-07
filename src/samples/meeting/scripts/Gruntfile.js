/*gruntfile for web app*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      html: {
        files: ['../**.html'],
        options: {
          livereload: true
        }
      },
      css: {
        files: ['../css/*.css'],
        options: {
          livereload: true
        }
      },
      js: {
        files: ['../js/*.js'],
        options: {
          livereload: true
        }
      },
      less: {
        files: ['../css/*.less'],
        options: {
          livereload: true
        }
      }
    }
  });
  grunt.loadNpmTasks('grunt-contrib-livereload');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.registerTask('default', ['watch']);

};
