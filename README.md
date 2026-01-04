# AI Campus Portal

モダンでスタイリッシュなDify APIを使用したAIキャンパスポータルシステムです。

## 機能

### 一般ユーザー機能
- 🤖 **AIチャット** - Dify APIを使用したAIアシスタント（予定・課題・お知らせの確認、場所案内、予定・課題の追加も可能）
- 📅 **カレンダー** - 予定の登録・管理
- ✅ **課題一覧** - タスク管理システム（優先度・期限・ステータス管理）
- 📢 **お知らせ** - 全体通知の閲覧（添付ファイル・リンク対応、既読管理）
- 🗺️ **学内マップ** - キャンパス内の施設検索（カテゴリフィルター付き）
- ⚙️ **設定** - プロフィール編集、パスワード変更、外観設定、アカウント削除

### 管理者専用機能
- 📊 **管理ダッシュボード** - システム全体の統計情報
- 👥 **ユーザー管理** - ユーザーの制限・削除
- 📢 **お知らせ管理** - 全ユーザーへの通知作成（PDF添付・Difyナレッジベース連携）
- 🗺️ **マップ管理** - 施設・ポイントの地図登録（道順・階数・目印情報）
- ⚠️ **危険ゾーン** - データベース操作（全削除・リセット）

### AI機能
- 📚 **ナレッジベース連携** - お知らせの添付ファイルをDifyにアップロードしてAIが参照
- 🗓️ **自然言語での期間指定** - 「来週」「来月」「3ヶ月後」「来年」などの質問に対応
- ➕ **AI経由での追加** - 「明日の予定を追加して」「来週までの課題を登録」などで直接追加
- 📍 **場所案内** - 施設の場所を聞くとマップ付きで道順を案内

## 技術スタック

- **フロントエンド**: Next.js 14, React 18, TypeScript
- **スタイリング**: Tailwind CSS (ダークモード対応、レスポンシブ)
- **認証**: NextAuth.js
- **データベース**: Prisma + SQLite
- **地図**: Leaflet + React Leaflet
- **AI**: Dify API（チャット + ナレッジベース）
- **PDF解析**: pdf-parse
- **コンテナ**: Docker + docker-compose
- **外部公開**: ngrok

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

# Dify ナレッジベース設定（任意）
DIFY_DATASET_API_KEY="your-dify-dataset-api-key"
DIFY_DATASET_ID="your-dify-dataset-id"
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

## Docker でのデプロイ

```bash
# ビルドと起動
docker compose build
docker compose up -d

# ngrok付きで起動（外部公開）
docker compose --profile ngrok up -d
```

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
│   │   ├── chat/         # チャットAPI（期間解析・追加機能付き）
│   │   ├── events/       # カレンダーイベントAPI
│   │   ├── tasks/        # 課題API
│   │   ├── notifications/# 通知API（添付ファイル・リンク対応）
│   │   ├── markers/      # マップマーカーAPI
│   │   ├── admin/        # 管理者API（ユーザー管理・DB操作・Dify同期）
│   │   └── user/         # ユーザーAPI（プロフィール・削除）
│   ├── dashboard/         # ダッシュボードページ
│   │   ├── chat/         # AIチャット
│   │   ├── calendar/     # カレンダー
│   │   ├── tasks/        # 課題一覧
│   │   ├── news/         # お知らせ（ユーザー向け）
│   │   ├── campus-map/   # 学内マップ（ユーザー向け）
│   │   ├── notifications/# お知らせ管理（管理者専用）
│   │   ├── map/          # マップ管理（管理者専用）
│   │   ├── admin/        # 管理ダッシュボード・ユーザー管理
│   │   └── settings/     # 設定（アカウント削除含む）
│   ├── login/             # ログインページ
│   └── register/          # 新規登録ページ
├── components/            # Reactコンポーネント
│   ├── layout/           # レイアウト（サイドバー・制限バナー）
│   ├── map/              # マップコンポーネント
│   └── providers/        # プロバイダー
├── lib/                   # ユーティリティ
│   ├── auth.ts           # NextAuth設定
│   ├── prisma.ts         # Prismaクライアント
│   ├── dify.ts           # Difyヘルパー関数
│   └── restriction.ts    # ユーザー制限チェック
└── middleware.ts          # 認証・権限ミドルウェア
```

## ユーザー制限機能

管理者はユーザーに対して以下の機能を個別に制限できます：

- AIチャット
- カレンダー
- 課題
- お知らせ
- マップ

制限されたユーザーにはバナーが表示され、制限された機能はAPIレベルでもブロックされます。

## Dify API設定

1. [Dify](https://dify.ai)でアカウントを作成
2. チャットボットアプリケーションを作成してAPIキーを取得
3. ナレッジベース（Dataset）を作成してDataset APIキーとIDを取得
4. `.env`ファイルに設定
5. Difyアプリの「Context」にナレッジベースを追加

## ライセンス

MIT License

## 開発者

AI Campus Portal Team
