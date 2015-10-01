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
  // Verify this event is valid
  if (event.Event != "autoscaling:EC2_INSTANCE_TERMINATE") {
    throw new Error("Lambda event payload is not an autoscaling terminate event");
  }
  
  if (!event.EC2InstanceId.match(/^i-/)) {
    throw new Error("Couldn't find instance id in Lambda event payload");
  }

  // Set up connection to Chef server
  var chef = new ChefApi();
  var options = {
    user_name: "kreedy-chef",
    key_path: "/Users/kreedy/.chef/kreedy-chef.pem",
    organization: "kreedy-testing-at-chef"
  }
  chef.config(options);

  // Find Chef node by EC2 Instance ID
  getNodeByEc2Id(chef, event.EC2InstanceId, function(err, node) {
    if (err) {
      throw err;
    }

    console.log("Deleting node and client '" + node.name + "'");

    // Delete Chef Node
    chef.deleteNode(node.name, function(err, res) {
      if (err) {
        throw err;
      }
      console.log("Node '" + node.name + "' deleted");
    });

    // Delete Chef Client
    chef.deleteClient(node.name, function(err, res) {
      if (err) {
        throw err;
      }

      console.log("Client '" + node.name + "' deleted");
    });
  });
}
