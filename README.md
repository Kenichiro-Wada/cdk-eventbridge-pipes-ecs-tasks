# Sample of launching an ECS Task from SQS using Amazon Eventbridge Pipes with AWS CDK v2

The following configuration will be created

![architecture](https://docs.google.com/drawings/d/e/2PACX-1vRiUTF8v1zQd3lpAjamQPQCRm1RHoDQuMCJsQ3BuATWLwyKbLBcZUHZtzM1X_XR0cXDDYty-rddGtMz/pub?w=1229&h=530)

Pipes is not set up for filters, enhancements, etc., but has added a logging feature that was announced in November 2023.
[Amazon EventBridge Pipes adds new logging functionality for improved observability](https://aws.amazon.com/about-aws/whats-new/2023/11/amazon-eventbridge-logging-improved-observability/)

The VPC that ECS Task is launched from is not a newly created one, but an existing one.
In this case, there is no access to RDS, so it is started on a Public Subnet.

# Requirements
AWS CDK v2(erably the latest version)

# Verified Environment
AWS Cloud9

# Setup

```
git clone https://github.com/Kenichiro-Wada/cdk-eventbridge-pipes-ecs-tasks.git
cd cdk-eventbridge-pipes-ecs-tasks/
npm install
```

## Update file
Modify the following in `lib/cdk-eventbridge-pipes-ecs-tasks-stack.ts`.
- Resource Name
`"<set Your Resource Name>"`

- ID of the VPC where ECS Task will be launched *Specify the ID of the VPC that exists in the region where you are trying to Deploy.
`"<Set Existing VPCs>"`

# Deploy
※If you are running AWS CDK for the first time, do `cdk bootstrap` first.

```
cdk deploy
```

# Cleanup

```
cdk destroy
```

# How does it work?

When the following command is executed, sending a message to SQS will trigger Evenbridge Pipes to run on receipt and launch the ECS Task.
The ECS Task will output the contents of test/message.json and the S3 bucket list.

```
aws sqs send-message --queue-url "[Set CdkEventbridgePipesEcsTasksStack.TriggerSQSQueueUrl]" --message-body "file://test/message.json"
```

※Rewrite [Set CdkEventbridgePipesEcsTasksStack.TriggerSQSQueueUrl] with the value of "CdkEventbridgePipesEcsTasksStack.TriggerSQSQSQueueUrl" output at deploy time. TriggerSQSQSueueUrl" output during deployment.

The execution logs of Eventbridge Pipes and ECS Task are
respectively,
`/aws/ecs/<specified resourceName>` and
`/aws/pipes/<specified resourceName>`
respectively.

# Special thanks!!!
- AWS CDK stack for building Amazon EventBridge Pipes (SQS to CloudWatch Logs)
https://dev.to/aws-heroes/aws-cdkv2-stack-for-building-amazon-eventbridge-pipes-sqs-to-cloudwatch-logs-52n9
- ECSとECRのコンテナ構成をCDKで実装してみた(Japanese)
https://dev.classmethod.jp/articles/cdk-ecs-ecr/

...AND DeepL(https://www.deepl.com/ja/translator)

# Anchor
Kenichiro Wada(X: Keni_W)

