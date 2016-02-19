module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-aws-lambda');

  grunt.registerTask('deploy', ['lambda_package', 'lambda_deploy']);

  grunt.initConfig({
    lambda_package: {
      default: {
        options: {
          // Task-specific options go here.
          include_files: [
            'node_modules/chef-api/node_modules/ursa/build/*',
            'node_modules/chef-api/node_modules/ursa/build/Release/*',
            'node_modules/chef-api/node_modules/ursa/build/Release/.deps/*',
            'node_modules/chef-api/node_modules/ursa/build/Release/.deps/Release/*',
            'node_modules/chef-api/node_modules/ursa/build/Release/.deps/Release/obj.target/*',
            'node_modules/chef-api/node_modules/ursa/build/Release/.deps/Release/obj.target/ursaNative/*',
            'node_modules/chef-api/node_modules/ursa/build/Release/.deps/Release/obj.target/ursaNative/src/*',
            'node_modules/chef-api/node_modules/ursa/build/Release/obj.target/*',
            'node_modules/chef-api/node_modules/ursa/build/Release/obj.target/ursaNative/*',
            'node_modules/chef-api/node_modules/ursa/build/Release/obj.target/ursaNative/src/*'
          ]
        }
      }
    },
  });
};
