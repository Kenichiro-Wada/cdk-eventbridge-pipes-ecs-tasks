# AWS CDK v2を使って、SQSからAmazon Eventbridge Pipesを使ってECS Taskを起動するサンプル

作成されるのは、以下のような構成です。

![architecture](https://docs.google.com/drawings/d/e/2PACX-1vRiUTF8v1zQd3lpAjamQPQCRm1RHoDQuMCJsQ3BuATWLwyKbLBcZUHZtzM1X_XR0cXDDYty-rddGtMz/pub?w=1229&h=530)

Pipesはフィルター、強化等は設定していませんが、2023年11月に発表されたログ記録機能を追加しています。

[Amazon EventBridge Pipes、新しいログ記録機能を追加してオブザーバビリティを向上](https://aws.amazon.com/jp/about-aws/whats-new/2023/11/amazon-eventbridge-logging-improved-observability/)

ECS Taskが起動するVPCは新規作成ではなく、既存のVPCを利用するようにしています。
RDSへのアクセスはないので、PublicなSubnetで起動しています。

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
`lib/cdk-eventbridge-pipes-ecs-tasks-stack.ts` の以下を修正する。
- リソース名

`"<set Your Resource Name>"`

- ECS Taskが起動するVPCのID ※Deployしようとしているリージョンに存在しているVPCのIDを指定すること。

`"<Set Existing VPCs>"`

# Deploy
※初めて AWS CDKを実行する場合は、先に`cdk bootstrap` を行うこと

```
cdk deploy
```

# Cleanup

```
cdk destroy
```

# どう動く？

以下のコマンドを実行すると、SQSにメッセージを送信すると、受信をトリガーにEvenbridge Pipesが実行されて、ECS Taskが起動します。
ECS Taskでは、test/message.jsonの中身の出力と、S3バケット一覧が出力されます。

```
aws sqs send-message --queue-url <Set CdkEventbridgePipesEcsTasksStack.TriggerSQSQueueUrl> --message-body "file://test/message.json"
```

※ `<Set CdkEventbridgePipesEcsTasksStack.TriggerSQSQueueUrl>` の部分をデプロイ時に出力される 「CdkEventbridgePipesEcsTasksStack.TriggerSQSQueueUrl」の値で書き換えること。


Eventbridge Pipesの実行ログとECS Taskの実行ログは以下に出力されます。

- EventBridge Pipesのログ
  - `/aws/pipes/<指定したresourceName>`

- ECS Taskのログ
  - `/aws/ecs/<指定したresourceName>`


# Special thanks!!!
- SQSからCloudWatch Logsに記録するAmazon EventBridge Pipesを構築するAWS CDK スタック 

https://zenn.dev/ma2shita/articles/8a138d53e4ef9a

- ECSとECRのコンテナ構成をCDKで実装してみた

https://dev.classmethod.jp/articles/cdk-ecs-ecr/

# Anchor
Kenichiro Wada(X: Keni_W)

