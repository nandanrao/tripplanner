module.exports = function(grunt){
  require('load-grunt-tasks')(grunt);

  grunt.initConfig({
    

    pkg: grunt.file.readJSON('package.json'),

    shell:{
      handlebars: {
        command: 'handlebars views/*.handlebars -f public/javascripts/templates.js'
      }
    },

    concurrent: {
      dev: {
        tasks: ['nodemon', 'watch'],
        options: {
          logConcurrentOutput: true
        }
      }
    },

    nodemon: {
      dev: {
        script: 'bin/www',
        options: {
          cwd: __dirname,
          ext: 'js, scss',
          // omit this property if you aren't serving HTML files and 
          // don't want to open a browser tab on start
          callback: function (nodemon) {
            nodemon.on('log', function (event) {
              console.log(event.colour);
            });

            // opens browser on initial server start
            nodemon.on('config:update', function () {
              // Delay before server listens on port
              setTimeout(function() {
                require('open')('http://localhost:3000');
              }, 1000);
            });

            // refreshes browser when server reboots
            nodemon.on('restart', function () {
              console.log('nodemon restarting!')
              // Delay before server listens on port
              setTimeout(function() {
                require('fs').writeFileSync('.rebooted', 'rebooted');
              }, 1000);
            });
          }
        }
      }
    },
    watch: {
      server: {
        files: ['.rebooted'],
        options: {
          livereload: true
        }
      },
      files: ['views/*.handlebars'],
      tasks: ['shell:handlebars'],
      options: {
        livereload: true
      } 
    }
  });

  grunt.loadNpmTasks('grunt-nodemon');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.registerTask('default', ['shell:handlebars', 'concurrent:dev']);
}