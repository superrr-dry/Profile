// infrastructure/index.ts
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// 環境設定
const environment = pulumi.getStack(); // dev or prod

// US East 1 プロバイダー（CloudFrontの証明書用）
const usEast1Provider = new aws.Provider("us-east-1", {
    region: "us-east-1",
});

// ドメイン設定
const domainName = "smartsolution.jp";
const subdomains = ["www.smartsolution.jp"];

// 環境別設定
const environmentConfig = {
    dev: {
        logRetention: 7,
        cachingEnabled: true,
        priceClass: "PriceClass_100", // 最も安いCloudFront価格クラス
    }
};

const currentConfig = environmentConfig[environment as keyof typeof environmentConfig];

// Route 53 Hosted Zone（既存のドメインを使用）
const hostedZone = aws.route53.getZone({
    name: domainName,
});

// SSL証明書（CloudFront用、us-east-1必須）
const certificate = new aws.acm.Certificate("profile-cert", {
    domainName: domainName,
    subjectAlternativeNames: subdomains,
    validationMethod: "DNS",
    tags: {
        Name: `profile-cert-${environment}`,
        Environment: environment,
    }
}, { provider: usEast1Provider });

// SSL証明書のDNS検証レコード
const certificateValidationRecords = certificate.domainValidationOptions.apply(options => {
    return options.map((option, index) => {
        return new aws.route53.Record(`profile-cert-validation-${index}`, {
            name: option.resourceRecordName,
            type: option.resourceRecordType,
            records: [option.resourceRecordValue],
            zoneId: hostedZone.then(zone => zone.zoneId),
            ttl: 60,
        });
    });
});

// 証明書の検証完了を待つ
const certificateValidation = new aws.acm.CertificateValidation("profile-cert-validation", {
    certificateArn: certificate.arn,
    validationRecordFqdns: certificateValidationRecords.apply(records => 
        records.map(record => record.fqdn)
    ),
}, { provider: usEast1Provider });

// S3 Bucket for static website hosting
const websiteBucket = new aws.s3.Bucket("profile-website-bucket", {
    bucket: `profile-site-${environment}-${pulumi.getStack()}`,
    tags: {
        Name: `profile-website-${environment}`,
        Environment: environment,
        CostCenter: "free-tier"
    }
});

// S3 Bucket Public Access Block (セキュリティのため)
const publicAccessBlock = new aws.s3.BucketPublicAccessBlock("profile-bucket-pab", {
    bucket: websiteBucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
});

// S3 Bucket Website Configuration
const websiteConfiguration = new aws.s3.BucketWebsiteConfigurationV2("profile-website-config", {
    bucket: websiteBucket.id,
    indexDocument: {
        suffix: "index.html",
    },
    errorDocument: {
        key: "index.html", // SPAのため、全てindex.htmlにリダイレクト
    },
});

// S3 Bucket Policy (CloudFrontからのアクセス許可)
const originAccessControl = new aws.cloudfront.OriginAccessControl("profile-oac", {
    name: `profile-oac-${environment}`,
    description: "Origin Access Control for Profile Site",
    originAccessControlOriginType: "s3",
    signingBehavior: "always",
    signingProtocol: "sigv4",
});

// CloudFront Distribution
const distribution = new aws.cloudfront.Distribution("profile-distribution", {
    origins: [{
        domainName: websiteBucket.bucketDomainName,
        originId: "S3-profile-site",
        originAccessControlId: originAccessControl.id,
    }],
    enabled: true,
    isIpv6Enabled: true,
    defaultRootObject: "index.html",
    defaultCacheBehavior: {
        allowedMethods: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
        cachedMethods: ["GET", "HEAD"],
        targetOriginId: "S3-profile-site",
        compress: true,
        viewerProtocolPolicy: "redirect-to-https",
        minTtl: 0,
        defaultTtl: 3600,
        maxTtl: 86400,
        forwardedValues: {
            queryString: false,
            cookies: {
                forward: "none",
            },
        },
    },
    customErrorResponses: [{
        errorCode: 404,
        responseCode: 200,
        responsePagePath: "/index.html", // SPAのルーティング対応
    }, {
        errorCode: 403,
        responseCode: 200,
        responsePagePath: "/index.html",
    }],
    priceClass: currentConfig.priceClass,
    restrictions: {
        geoRestriction: {
            restrictionType: "none",
        },
    },
    viewerCertificate: {
        acmCertificateArn: certificateValidation.certificateArn,
        sslSupportMethod: "sni-only",
        minimumProtocolVersion: "TLSv1.2_2021",
    },
    aliases: [domainName, ...subdomains],
    tags: {
        Name: `profile-distribution-${environment}`,
        Environment: environment,
        CostCenter: "free-tier"
    },
});

// S3 Bucket Policy for CloudFront access
const bucketPolicy = new aws.s3.BucketPolicy("profile-bucket-policy", {
    bucket: websiteBucket.id,
    policy: pulumi.all([websiteBucket.arn, distribution.arn]).apply(([bucketArn, distributionArn]) =>
        JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Sid: "AllowCloudFrontServicePrincipal",
                Effect: "Allow",
                Principal: {
                    Service: "cloudfront.amazonaws.com"
                },
                Action: "s3:GetObject",
                Resource: `${bucketArn}/*`,
                Condition: {
                    StringEquals: {
                        "AWS:SourceArn": distributionArn
                    }
                }
            }]
        })
    ),
}, { dependsOn: [publicAccessBlock] });

// Route 53 DNS Records
const mainDomainRecord = new aws.route53.Record("profile-main-domain", {
    name: domainName,
    type: "A",
    zoneId: hostedZone.then(zone => zone.zoneId),
    aliases: [{
        name: distribution.domainName,
        zoneId: distribution.hostedZoneId,
        evaluateTargetHealth: false,
    }],
});

const wwwDomainRecord = new aws.route53.Record("profile-www-domain", {
    name: `www.${domainName}`,
    type: "A",
    zoneId: hostedZone.then(zone => zone.zoneId),
    aliases: [{
        name: distribution.domainName,
        zoneId: distribution.hostedZoneId,
        evaluateTargetHealth: false,
    }],
});

// CloudWatch Log Group（アクセスログ用）
const accessLogGroup = new aws.cloudwatch.LogGroup("profile-access-logs", {
    name: `/aws/cloudfront/profile-site-${environment}`,
    retentionInDays: currentConfig.logRetention,
    tags: {
        Name: `profile-access-logs-${environment}`,
        Environment: environment
    }
});

// CloudWatch Dashboard（監視用）
const dashboard = new aws.cloudwatch.Dashboard("profile-dashboard", {
    dashboardName: `profile-site-${environment}`,
    dashboardBody: JSON.stringify({
        widgets: [
            {
                type: "metric",
                x: 0,
                y: 0,
                width: 12,
                height: 6,
                properties: {
                    metrics: [
                        ["AWS/CloudFront", "Requests", "DistributionId", distribution.id],
                        [".", "BytesDownloaded", ".", "."],
                    ],
                    period: 300,
                    stat: "Sum",
                    region: "us-east-1", // CloudFrontメトリクスはus-east-1
                    title: "CloudFront Traffic"
                }
            }
        ]
    }),
});

// Outputs
export const bucketName = websiteBucket.id;
export const bucketWebsiteUrl = websiteConfiguration.websiteEndpoint;
export const cloudFrontUrl = distribution.domainName;
export const cloudFrontDistributionId = distribution.id;
export const logGroupName = accessLogGroup.name;
export const dashboardName = dashboard.dashboardName;
export const bucketPolicyId = bucketPolicy.id;
export const domainUrl = `https://${domainName}`;
export const wwwDomainUrl = `https://www.${domainName}`;
export const certificateArn = certificate.arn;
export const hostedZoneId = hostedZone.then(zone => zone.zoneId);
export const mainDomainRecordName = mainDomainRecord.name;
export const wwwDomainRecordName = wwwDomainRecord.name;