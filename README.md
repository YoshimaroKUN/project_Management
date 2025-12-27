# AI Campus Portal

モダンでスタイリッシュなDify APIを使用したAIキャンパスポータルシステムです。

![AI Campus Portal](https://via.placeholder.com/1200x600/1a1a2e/ffffff?text=AI+Campus+Portal)

## 機能

### 一般ユーザー機能
- 🤖 **AIチャット** - Dify APIを使用したAIアシスタント
- 📅 **カレンダー** - 予定の登録・管理
- ✅ **課題一覧** - タスク管理システム
- 📊 **ダッシュボード** - 各種情報の一覧表示

### 管理者専用機能
- 📢 **お知らせ管理** - 全ユーザーへの通知作成
- 🗺️ **マップ管理** - 施設・ポイントの地図登録

## 技術スタック

- **フロントエンド**: Next.js 14, React 18, TypeScript
- **スタイリング**: Tailwind CSS (ダークモード対応)
- **認証**: NextAuth.js
- **データベース**: Prisma + SQLite (本番環境ではPostgreSQL推奨)
- **地図**: Leaflet + React Leaflet
- **AI**: Dify API

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`を作成し、必要な値を設定してください。

```bash
cp .env.example .env
```

```env
# データベース設定
DATABASE_URL="file:./dev.db"

# NextAuth設定
NEXTAUTH_SECRET="your-super-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Dify API設定
DIFY_API_URL="https://api.dify.ai/v1"
DIFY_API_KEY="your-dify-api-key"
```

### 3. データベースの初期化

```bash
# Prismaクライアントの生成
npm run db:generate

# データベースのマイグレーション
npm run db:push

# サンプルデータの投入（オプション）
npm run db:seed
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスできます。

## デフォルトアカウント

シードデータを投入した場合、以下のアカウントでログインできます：

### 管理者アカウント
- **メール**: admin@example.com
- **パスワード**: Admin123!

### 一般ユーザーアカウント
- **メール**: user@example.com
- **パスワード**: User123!

## ディレクトリ構造

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # APIルート
│   │   ├── auth/         # 認証API
│   │   ├── chat/         # チャットAPI
│   │   ├── events/       # カレンダーイベントAPI
│   │   ├── tasks/        # 課題API
│   │   ├── notifications/# 通知API
│   │   └── markers/      # マップマーカーAPI
│   ├── dashboard/         # ダッシュボードページ
│   │   ├── chat/         # AIチャット
│   │   ├── calendar/     # カレンダー
│   │   ├── tasks/        # 課題一覧
│   │   ├── notifications/# お知らせ管理（管理者専用）
│   │   ├── map/          # マップ管理（管理者専用）
│   │   └── settings/     # 設定
│   ├── login/             # ログインページ
│   └── register/          # 新規登録ページ
├── components/            # Reactコンポーネント
│   ├── layout/           # レイアウトコンポーネント
│   ├── map/              # マップコンポーネント
│   └── providers/        # プロバイダー
├── lib/                   # ユーティリティ
│   ├── auth.ts           # NextAuth設定
│   └── prisma.ts         # Prismaクライアント
└── middleware.ts          # 認証ミドルウェア
```

## ロゴのカスタマイズ

学校のロゴを追加するには、以下のファイルを編集してください：

1. `src/app/login/page.tsx` - ログインページのロゴ
2. `src/app/register/page.tsx` - 登録ページのロゴ
3. `src/components/layout/Sidebar.tsx` - サイドバーのロゴ

各ファイルで `<Sparkles>` アイコンをお好みの画像コンポーネントに置き換えてください：

```tsx
// 例: 画像ロゴに変更
<Image
  src="/logo.png"
  alt="School Logo"
  width={48}
  height={48}
/>
```

## Dify API設定

1. [Dify](https://dify.ai)でアカウントを作成
2. アプリケーションを作成してAPIキーを取得
3. `.env`ファイルに`DIFY_API_KEY`を設定

## 本番環境へのデプロイ

### Vercelへのデプロイ

1. GitHubにリポジトリをプッシュ
2. Vercelでプロジェクトをインポート
3. 環境変数を設定
4. デプロイ

### データベースの本番設定

本番環境では、SQLiteの代わりにPostgreSQLなどのデータベースを使用することを推奨します。

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

## ライセンス

MIT License

## 開発者

AI Campus Portal Team
# project_Management
