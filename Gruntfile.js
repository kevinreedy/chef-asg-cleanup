module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-aws-lambda');

  grunt.registerTask('deploy', ['lambda_package', 'lambda_deploy']);

  grunt.initConfig({
    lambda_invoke: {
      default: {
        options: {
          // Task-specific options go here.
        }
      }
    },
    lambda_package: {
      default: {
        options: {
          // Task-specific options go here.
        }
      }
    },
    lambda_deploy: {
      default: {
        options: {
          // Task-specific options go here.
        },
        arn: 'arn:aws:lambda:us-east-1:862552916454:function:kreedy-lambda-test'
      }
    },
  });
};
