// infrastructure/index.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// 環境設定
const environment = pulumi.getStack(); // dev or prod

// 環境別設定
const environmentConfig = {
    dev: {
        desiredSize: 1,
        minSize: 1,
        maxSize: 2,
        instanceTypes: ["t3.small"], // 無料枠対象
        diskSize: 20,
        logRetention: 7
    }
};

const currentConfig = environmentConfig[environment as keyof typeof environmentConfig];

// VPC作成（サブネットは自動作成）
const vpc = new awsx.ec2.Vpc("profile-vpc", {
    cidrBlock: "10.0.0.0/16",
    numberOfAvailabilityZones: 2,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: {
        Name: `profile-vpc-${environment}`,
        Environment: environment
    }
});

// IAM Role - EKS Cluster用
const clusterRole = new aws.iam.Role("profile-cluster-role", {
    name: `profile-cluster-role-${environment}`,
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "eks.amazonaws.com"
            }
        }]
    }),
    managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
    ],
    tags: {
        Name: `profile-cluster-role-${environment}`,
        Environment: environment
    }
});

// IAM Role - Node Group用
const nodeRole = new aws.iam.Role("profile-node-role", {
    name: `profile-node-role-${environment}`,
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "ec2.amazonaws.com"
            }
        }]
    }),
    managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
        "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
        "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
    ],
    tags: {
        Name: `profile-node-role-${environment}`,
        Environment: environment
    }
});

// セキュリティグループ
const clusterSecurityGroup = new aws.ec2.SecurityGroup("profile-cluster-sg", {
    name: `profile-cluster-sg-${environment}`,
    vpcId: vpc.vpcId,
    description: "EKS cluster security group",
    ingress: [
        {
            fromPort: 443,
            toPort: 443,
            protocol: "tcp",
            cidrBlocks: ["0.0.0.0/0"],
            description: "HTTPS"
        }
    ],
    egress: [
        {
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
            cidrBlocks: ["0.0.0.0/0"],
            description: "All outbound traffic"
        }
    ],
    tags: {
        Name: `profile-cluster-sg-${environment}`,
        Environment: environment
    }
});

// CloudWatch Log Group（EKSクラスターのログ用）
const clusterLogGroup = new aws.cloudwatch.LogGroup("profile-cluster-logs", {
    name: `/aws/eks/profile-cluster-${environment}/cluster`,
    retentionInDays: currentConfig.logRetention,
    tags: {
        Name: `profile-cluster-logs-${environment}`,
        Environment: environment
    }
});

// EKSクラスター
const cluster = new aws.eks.Cluster("profile-cluster", {
    name: `profile-cluster-${environment}`,
    roleArn: clusterRole.arn,
    vpcConfig: {
        subnetIds: vpc.privateSubnetIds, // 自動作成されるプライベートサブネット使用
        securityGroupIds: [clusterSecurityGroup.id],
        endpointPrivateAccess: true,
        endpointPublicAccess: true,
        publicAccessCidrs: ["0.0.0.0/0"]
    },
    version: "1.27",
    enabledClusterLogTypes: ["api", "audit", "authenticator", "controllerManager", "scheduler"],
    // ログはclusterLogGroupへ送られる
    tags: {
        Name: `profile-cluster-${environment}`,
        Environment: environment
    }
}, {
    dependsOn: [clusterLogGroup] // ロググループが先に作成されるように
});

// Node Group
const nodeGroup = new aws.eks.NodeGroup("profile-nodes", {
    clusterName: cluster.name,
    nodeGroupName: `profile-nodes-${environment}`,
    nodeRoleArn: nodeRole.arn,
    subnetIds: vpc.privateSubnetIds,
    instanceTypes: currentConfig.instanceTypes,
    scalingConfig: {
        desiredSize: currentConfig.desiredSize,
        maxSize: currentConfig.maxSize,
        minSize: currentConfig.minSize
    },
    diskSize: currentConfig.diskSize,
    amiType: "AL2_x86_64",
    capacityType: "ON_DEMAND",
    updateConfig: {
        maxUnavailablePercentage: 25
    },
    tags: {
        Name: `profile-nodes-${environment}`,
        Environment: environment,
        CostCenter: "free-tier"
    }
});

// ECR Repository (コンテナイメージ用)
const ecrRepo = new aws.ecr.Repository("profile-ecr", {
    name: `profile-frontend-${environment}`,
    imageTagMutability: "MUTABLE",
    imageScanningConfiguration: {
        scanOnPush: true
    },
    tags: {
        Name: `profile-ecr-${environment}`,
        Environment: environment
    }
});

// Outputs
export const vpcId = vpc.vpcId;
export const clusterName = cluster.name;
export const clusterEndpoint = cluster.endpoint;
export const clusterArn = cluster.arn;
export const nodeGroupArn = nodeGroup.arn;
export const ecrRepositoryUrl = ecrRepo.repositoryUrl;
export const logGroupName = clusterLogGroup.name;

// kubeconfig生成
export const kubeconfig = pulumi.all([
    cluster.name,
    cluster.endpoint,
    cluster.certificateAuthority
]).apply(([name, endpoint, ca]) => {
    return JSON.stringify({
        apiVersion: "v1",
        clusters: [{
            cluster: {
                server: endpoint,
                "certificate-authority-data": ca.data
            },
            name: "kubernetes"
        }],
        contexts: [{
            context: {
                cluster: "kubernetes",
                user: "aws"
            },
            name: "aws"
        }],
        "current-context": "aws",
        kind: "Config",
        users: [{
            name: "aws",
            user: {
                exec: {
                    apiVersion: "client.authentication.k8s.io/v1beta1",
                    command: "aws",
                    args: ["eks", "get-token", "--cluster-name", name]
                }
            }
        }]
    }, null, 2);
});