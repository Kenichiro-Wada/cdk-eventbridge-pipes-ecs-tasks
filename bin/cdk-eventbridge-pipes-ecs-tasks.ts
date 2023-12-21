#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkEventbridgePipesEcsTasksStack } from '../lib/cdk-eventbridge-pipes-ecs-tasks-stack';

const app = new cdk.App();
new CdkEventbridgePipesEcsTasksStack(app, 'CdkEventbridgePipesEcsTasksStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});