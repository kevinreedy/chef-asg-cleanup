"use strict";

var ChefApi = require("chef-api");

// ChefApi connection, EC2 Instance ID, Callback
// Returns a ChefApi node object
function getNodeByEc2Id(chef, id, cb) {
  chef.search("node", { q:"ec2_instance_id:" + id }, function(err, res) {
    if(err) {
      cb(err);
    }

    if (res.total == 0) {
      cb(new Error("AWS Instance '" + id + "' not found on Chef server"), null);
    }

    if (res.total > 1) {
      cb(new Error("More than one instance found with name '" + id + "' found on Chef server"), null);
    }

    cb(null, res.rows[0]);
  });
}

exports.handler = function(event, context) {
  // TODO: do we need to iterate over records?
  var snsEvent = JSON.parse(event.Records[0].Sns.Message);

  // Verify this event is valid
  if (snsEvent.Event != "autoscaling:EC2_INSTANCE_TERMINATE") {
    context.fail(new Error("Lambda event payload is not an autoscaling terminate event"));
  }

  if (!snsEvent.EC2InstanceId.match(/^i-/)) {
    context.fail(new Error("Couldn't find instance id in Lambda event payload"));
  }

  // Set up connection to Chef server
  var chef = new ChefApi();
  var config = require("./config")
  chef.config(config);

  // Find Chef node by EC2 Instance ID
  getNodeByEc2Id(chef, snsEvent.EC2InstanceId, function(err, node) {
    if (err) {
      console.log(snsEvent);
      context.fail(err);
    }

    console.log("Deleting node and client '" + node.name + "'");

    // Delete Chef Node
    chef.deleteNode(node.name, function(err, res) {
      if (err) {
        context.fail(err);
      }

      // Delete Chef Client
      chef.deleteClient(node.name, function(err, res) {
        if (err) {
          context.fail(err);
        }

        // Success!
        context.succeed("Successfully deleted node and client '" + node.name + "'")
      });
    });
  });
}
