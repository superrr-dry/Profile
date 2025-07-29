# DevOps/SRE Portfolio Site

DevOps/SRE/インフラエンジニア向けのポートフォリオサイト。TypeScript統一構成で、完全無料のAWSクラウドインフラを実現。

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Static Hosting │    │   Monitoring    │
│   React + TS    │───▶│   S3 + CloudFront│───▶│   CloudWatch    │
│   (Static Build)│    │   (無料枠)        │    │   (無料枠)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CI/CD         │    │   Infrastructure │    │   Security      │
│   GitHub Actions│    │   Pulumi (TS)    │    │   Trivy Scan    │
│   (2000分無料)   │    │   AWS無料枠      │    │   CodeQL        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 💰 コスト試算 (月額)
- **S3**: $0 (5GB無料枠)
- **CloudFront**: $0 (1TB転送無料枠)
- **CloudWatch**: $0 (基本メトリクス無料)
- **GitHub Actions**: $0 (2000分無料枠)
- **合計: $0/月** 🎉

## 🛠️ 技術スタック

### フロントエンド
- **React 19** + **TypeScript 5.5** + **Vite**
- **Tailwind CSS 4** (最新版)
- **pnpm** (高速パッケージマネージャー)

### インフラ (AWS無料枠)
- **S3** (静的サイトホスティング)
- **CloudFront** (CDN)
- **CloudWatch** (監視・ログ)
- **Pulumi** (TypeScript) (Infrastructure as Code)

### CI/CD
- **GitHub Actions** (自動デプロイ)
- **Trivy** (セキュリティスキャン)
- **ESLint** + **Prettier** (コード品質)

## 🚀 デプロイ手順

### 1. 環境セットアップ
```bash
# 依存関係インストール
pnpm install

# インフラ依存関係インストール
cd infrastructure && pnpm install
```

### 2. AWS認証情報設定
```bash
# AWS CLI設定
aws configure

# Pulumi設定
pulumi login
```

### 3. インフラデプロイ
```bash
cd infrastructure
pulumi up --stack dev
```

### 4. フロントエンドビルド & デプロイ
```bash
# ビルド
pnpm build

# S3にアップロード
aws s3 sync dist/ s3://your-bucket-name --delete

# CloudFront無効化
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## 📁 プロジェクト構造
```
profile-site-devops/
├── src/                     # React アプリケーション
│   ├── components/          # React コンポーネント
│   ├── page/               # ページコンポーネント
│   └── types/              # TypeScript型定義
├── infrastructure/          # Pulumi Infrastructure as Code
│   ├── index.ts            # AWS リソース定義
│   └── package.json        # Pulumi依存関係
├── .github/workflows/       # CI/CDパイプライン
├── dist/                   # ビルド成果物
└── docs/                   # ドキュメント
```

## 🎯 特徴

### DevOps実践
- **Infrastructure as Code**: Pulumi + TypeScript
- **CI/CD自動化**: GitHub Actions
- **セキュリティ重視**: Trivy脆弱性スキャン
- **監視**: CloudWatch Dashboard

### 完全無料構成
- AWS無料枠を最大活用
- GitHub Actionsの無料枠内
- Pulumi Cloudの個人無料プラン

### TypeScript統一
- フロントエンド: React + TypeScript
- インフラ: Pulumi + TypeScript
- 型安全性の確保

## 🔧 開発コマンド
```bash
# 開発サーバー起動
pnpm dev

# ビルド
pnpm build

# リント
pnpm lint

# 型チェック
pnpm type-check

# インフラプレビュー
cd infrastructure && pulumi preview
```
