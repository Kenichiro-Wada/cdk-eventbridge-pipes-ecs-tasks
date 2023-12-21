import { RemovalPolicy, ScopedAws, Stack, StackProps, Duration, CfnOutput} from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import { DockerImageAsset, Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as ecrdeploy from "cdk-ecr-deployment";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { CfnPipe } from 'aws-cdk-lib/aws-pipes';
import * as path from "path";

export class CdkEventbridgePipesEcsTasksStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Get Account ID and Region
    const { accountId, region } = new ScopedAws(this);
    
    // Set Resource Name
    const resourceName = "<set Your Resource Name>"; // set Your Resource Name
    
    // Create CloudWatch Log Group For ECS
    const ecsTaskLogGroup = new logs.LogGroup(this, "EcsTaskLogGroup", {
      logGroupName: `/aws/ecs/${resourceName}`,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    // Create Cloudwatch Log Group for EventBridge pipes
    const eventBridgeLogGroup = new logs.LogGroup(this, "EventBridgePipesLogGroup", {
      logGroupName: `/aws/pipes/${resourceName}`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // VPC From Existing Resources
    const vpc = ec2.Vpc.fromLookup(this, "vpc", {
      vpcId: "<Set Existing VPCs>" // Set Existing VPCs 
    });
    // Subnets(Public) 
    const subnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC
    });
    
    // Create ECR Repository
    const ecrRepository = new ecr.Repository(this, "EcrRepository", {
      repositoryName: `${resourceName}-ecr-repository`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteImages: true,
    });

    // Create Docker Image Asset
    const dockerImageAsset = new DockerImageAsset(this, "DockerImageAsset", {
      directory: path.join(__dirname, "..", "app"),
      platform: Platform.LINUX_AMD64,
    });
    
    // Deploy Docker Image Push ECR Repository
    new ecrdeploy.ECRDeployment(this, "DeployDockerImage", {
      src: new ecrdeploy.DockerImageName(dockerImageAsset.imageUri),
      dest: new ecrdeploy.DockerImageName(
        `${accountId}.dkr.ecr.${region}.amazonaws.com/${ecrRepository.repositoryName}:latest`
      ),
    });
    
    // ECS Task Role grants Policy
    // Grant s3
    const ecsTaskPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "s3:*"
      ],
      resources: ["*"],
    });
    
    const ecsTaskRole = new iam.Role(this, "EcsTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    })
    ecsTaskRole.addToPolicy(ecsTaskPolicy);
    
    // ECS Task Execution Role grants Policy
    const ecsExecutionTaskPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "ecr:BatchCheckLayerAvailability",
            "ecr:BatchGetImage",
            "ecr:GetDownloadUrlForLayer"
          ],
          resources: [ecrRepository.repositoryArn]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "logs:CreateLogStream",
            "logs:PutLogEvents"
          ],
          resources: [ecsTaskLogGroup.logGroupArn]
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "ecr:GetAuthorizationToken"
          ],
          resources: ["*"]
        }),
      ]
    });
    const ecsExecutionTaskRole = new iam.Role(this, "EcsExecutionTaskRole", {
      inlinePolicies: {ecsExecutionTaskPolicy},
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    })
    // ECS Task Execution Role
    // Create ECS Cluster
    const ecsCluster = new ecs.Cluster(this, "EcsCluster", {
      clusterName: `${resourceName}-ecs-cluster`,
      vpc: vpc,
    });

    // Create ECS Task Definition
    const ecsTaskDefinition = new ecs.FargateTaskDefinition(
      this,
      "FargateTaskDef",
      {
        memoryLimitMiB: 512,
        cpu: 256,
        family: `${resourceName}-ecs-task-definition`,
        taskRole: ecsTaskRole,
        ephemeralStorageGiB: 100,
        
        runtimePlatform: {
          operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
          cpuArchitecture: ecs.CpuArchitecture.X86_64,
        },
        executionRole: ecsExecutionTaskRole
      }
    );
    // ECS Task Definition Container
    ecsTaskDefinition.addContainer(
      `${resourceName}-container`,
      {
        image: ecs.ContainerImage.fromEcrRepository(ecrRepository, "latest"),
        logging: ecs.LogDrivers.awsLogs({
          streamPrefix: `${resourceName}-logs`,
          logGroup: ecsTaskLogGroup,
        })
      }
    );
    // Create SQS Queue
    const queue = new sqs.Queue(this, "SourceQueue", {
      queueName: `${resourceName}-queue`,
      visibilityTimeout: Duration.seconds(60),
      retentionPeriod: Duration.seconds(60),
      removalPolicy: RemovalPolicy.DESTROY,
    })
    
    // Event Bridge Pipes Execution Role grants Policy
    const sourceQueuePolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'],
          resources: [queue.queueArn]
        })
      ]
    });
    const targetEcsTaskPolicy = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "ecs:RunTask"
          ],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "iam:PassRole"
          ],
          resources: ["*"],
        }),
      ]
    });
    // Event Bridge Pipes Execution Role
    const eventBridgePipeRole = new iam.Role(this, 'Role', {
      inlinePolicies: { sourceQueuePolicy, targetEcsTaskPolicy},
      assumedBy: new iam.ServicePrincipal('pipes.amazonaws.com')
    });
    
    // create eventbridge pipe source sqs queue target ecs task
    new CfnPipe(this, 'Pipe', {
      name: `${resourceName}-pipe`,
      roleArn: eventBridgePipeRole.roleArn,
      source: queue.queueArn,
      target: ecsCluster.clusterArn,
      logConfiguration:{
        cloudwatchLogsLogDestination: {
          logGroupArn: eventBridgeLogGroup.logGroupArn,
        },
        // This is an optional item, but if it is not set, an error will occur when deploy is executed, so it should be set.
        level: "TRACE"
      },
      sourceParameters: {
        sqsQueueParameters: {
          batchSize: 1
        }
      },
      targetParameters: {
        ecsTaskParameters: {
          taskDefinitionArn: ecsTaskDefinition.taskDefinitionArn,
          taskCount: 1,
          launchType: 'FARGATE',
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: subnets.subnetIds,
              assignPublicIp: 'ENABLED'
            }
          },
          overrides: {
            containerOverrides: [
              {
                name: `${resourceName}-container`,
                environment: [
                  {
                    name: "MESSAGE",
                    value: "$.body.message"
                  },
                ],
                command: [
                  "python",
                  "app.py"
                ],
              }
            ]
          }
        }
      }
    });
    
    // Output QUEUE URL
    new CfnOutput(this, "TriggerSQSQueueUrl", {
      value: queue.queueUrl
    });
  }
}
