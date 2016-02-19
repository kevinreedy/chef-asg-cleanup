chef-asg-cleanup
================

When using Chef on EC2 Instances in an AWS Autoscaling group, there are a variety of ways to register your new node as the group scales up. However, when scaling down you are typically left with a stale Chef Node and Client. This issue can be solved by [deploying a script to remove dead nodes](http://blog.mattrevell.net/2014/02/19/automatically-remove-dead-autoscale-nodes-from-chef-server/) on your Chef Server. This project takes Matt's work one step further and uses an AWS Lambda function to do the work, so that you don't need to deploy scripts to any server.

## Requirements

 - Hosted Chef or a Chef Server that is reachable from your AWS infrastructure
 - Either Docker or a Linux machine with Node.js v0.10.36 for setup
 - Sufficient AWS permissions to create Lambda Functions, create SNS topics, create IAM Roles, and create or update Autoscaling Groups
 - The [AWS Command Line Interface](https://aws.amazon.com/cli/) installed on your workstation (it is possible to use the AWS Management Console instead, but all examples below use the CLI)

## Set up

### Create SNS Topic

Using the AWS CLI, create an SNS topic, and take note of its ARN.

```
$ aws sns create-topic --name asg-cleanup-topic

{
    "TopicArn": "arn:aws:sns:us-east-1:123456789012:asg-cleanup-topic"
}
```

### Create an Autoscaling Group

If you do not yet have an Autoscaling Group, create one. Note that on boot, new nodes will have to register themselves with your Chef Server. There are a couple of ways to accomplish this. You can [create an AMI with Chef Client and your Chef credentials baked-in](https://blog.froese.org/2015/04/12/packer-aws-autoscale-chef/). If you are comfortable with putting your Chef  validator key in [EC2 User Data](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-metadata.html#instancedata-add-user-data), you can also [use cloud-config to install Chef and register with your Chef Server](https://github.com/kevinreedy/chef-asg-cleanup/blob/master/cloud-config.yml.example). Also, be sure to [use the EC2 ohai plugin](http://geekblood.com/2015/03/13/enabling-ec2-metadata-in-ohai/) on your nodes.

To create an Autoscaling Group, you will first need to create a Launch Configuration. Most of [your instance options](http://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-launch-configuration.html) will need to be specified while creating your Launch Configuration. At the very least, you'll need to select an instance type and security groups. If you created a custom AMI or are using EC2 User Data, you'll need to pass it into this command.

```
$ aws autoscaling create-launch-configuration \
  --launch-configuration-name app-server-lc-v1 \
  --image-id ami-66b1870c \
  --security-groups sg-abcdef01 \
  --instance-type t2.micro
```

Once you have a Launch Configuration created, you can create your Autoscaling Group. You'll need to specify your newly created Launch Configuration, how many machines you'd like the Autoscaling Group to contain (along with a minimum and maximum if you later define Autoscaling Policies), and which subnets your Autoscaling Group should launch instances in.

```
$ aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name app-server-asg \ --launch-configuration-name app-server-lc-v1 \
  --min-size 1 \
  --desired-capacity 1 \
  --max-size 1 \
  --vpc-zone-identifier subnet-cdef0123
```

### Subscribe to Notifications

Once you have your Autoscaling Group, you'll want to trigger a notification to your new SNS topic whenever an instance terminates.

```
$ aws autoscaling put-notification-configuration \
  --auto-scaling-group-name app-server-asg \
  --notification-types autoscaling:EC2_INSTANCE_TERMINATE \
  --topic-arn arn:aws:sns:us-east-1:123456789012:asg-cleanup-topic
```

### Configure Lambda Function

**TODO**

### Compile Lambda Function Code

Because this Lambda Function uses native extensions, you must compile it before uploading to AWS. This can either be done on a machine with Docker and Docker Compose or a 64-bit Linux workstation with Node.js v0.10.36 installed.

#### On a machine with Docker

```
$ cd path/to/this/project
$ docker-compose up
```

#### On a Linux machine

```
$ cd path/to/this/project
$ npm install -g grunt-cli
$ npm install
$ grunt lambda_package
```

Either command's output should contain something similar to `Created package at ./dist/chef-asg-cleanup_0-1-0_2016-1-19-21-44-41.zip`. Take note of the path to that zip file.

### Create Lambda Function

Before creating our function, we must define its permissions by creating an IAM role.

```
$ aws iam create-role \
  --role-name asg-cleanup-role2 \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "",
        "Effect": "Allow",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' \
  --output text \
  --query 'Role.Arn'

arn:aws:iam::123456789012:role/asg-cleanup-role
```

Take note of the ARN returned. Now attach a policy to the role.

```
$ aws iam put-role-policy \
  --role-name asg-cleanup-role \
  --policy-name asg-cleanup-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": "arn:aws:logs:*:*:*"
      },
      {
        "Effect": "Allow",
        "Action": [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DetachNetworkInterface",
          "ec2:DeleteNetworkInterface"
        ],
        "Resource": "*"
      }
    ]
  }'
```

We can now upload our function that was built in the previous step. Be sure to replace the `zip-file` and `role` ARN with values from previous steps.

```
$ aws lambda create-function \
  --function-name asg-cleanup-function \
  --zip-file fileb://dist/chef-asg-cleanup_0-1-0_2016-1-19-21-44-41.zip \
  --role arn:aws:iam::123456789012:role/asg-cleanup-role \
  --handler index.handler \
  --timeout 30 \
  --runtime nodejs
```

**TODO: VPC Info**

Last but not least, hook up your Lambda Function to your SNS Topic.
```
$ aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:123456789012:asg-cleanup-topic \
  --protocol lambda \
  --notification-endpoint arn:aws:lambda:us-east-1:123456789012:function:asg-cleanup-function
```

## Testing it works

**TODO**
