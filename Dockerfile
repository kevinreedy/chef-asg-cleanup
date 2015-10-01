FROM node:0.10.36-onbuild
RUN npm install -g grunt-cli
CMD ["/usr/local/bin/grunt", "lambda_invoke"]
