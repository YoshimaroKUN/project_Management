# TrueNASサーバーへのデプロイ手順

## 前提条件

- TrueNASにDockerがインストールされている（TrueNAS SCALE推奨）
- ngrokアカウント（無料プランでOK）

## 1. プロジェクトをサーバーに転送

### 方法A: GitHubを使う場合
```bash
# TrueNASのシェルで
cd /mnt/your-pool/apps
git clone https://github.com/your-repo/campus-portal.git
cd campus-portal
```

### 方法B: 直接コピーする場合
```bash
# Windows側でzipファイルを作成
# ProjectAフォルダを圧縮

# TrueNASにSCPでコピー
scp campus-portal.zip root@truenas-ip:/mnt/your-pool/apps/

# TrueNASで解凍
cd /mnt/your-pool/apps
unzip campus-portal.zip
cd campus-portal
```

## 2. 環境変数の設定

```bash
# .envファイルを作成
cp .env.production.example .env

# エディタで編集
nano .env
```

### 必須の設定項目:

```env
# NextAuth シークレット（必ず変更！）
# 生成: openssl rand -base64 32
NEXTAUTH_SECRET="ランダムな文字列をここに"

# Dify APIキー
DIFY_API_KEY="app-vk7di78TOH82rRmLVfxkIfzO"

# ngrok設定
NGROK_AUTHTOKEN="あなたのngrok認証トークン"
NGROK_DOMAIN="あなたのドメイン.ngrok-free.app"

# NEXTAUTH_URLをngrokドメインに設定
NEXTAUTH_URL="https://あなたのドメイン.ngrok-free.app"
```

## 3. ngrokの設定

### 3.1 ngrokアカウント作成
1. https://ngrok.com にアクセス
2. 無料アカウントを作成
3. ダッシュボードから以下を取得:
   - **Auth Token**: https://dashboard.ngrok.com/get-started/your-authtoken
   - **固定ドメイン**: https://dashboard.ngrok.com/cloud-edge/domains
     - 「Create Domain」で無料の固定ドメインを1つ作成

### 3.2 .envに設定
```env
NGROK_AUTHTOKEN="2abc123def456..."
NGROK_DOMAIN="my-campus-portal.ngrok-free.app"
NEXTAUTH_URL="https://my-campus-portal.ngrok-free.app"
```

## 4. Dockerでビルド・起動

```bash
# アプリのみ起動（ローカルアクセスのみ）
docker compose up -d

# ngrokも一緒に起動（インターネット公開）
docker compose --profile ngrok up -d

# ログ確認
docker compose logs -f

# 停止
docker compose down
```

## 5. 初期データの投入

```bash
# コンテナに入る
docker exec -it campus-portal sh

# シードデータを投入
npx prisma db seed

# 終了
exit
```

## 6. アクセス確認

- **ローカル**: http://truenas-ip:3000
- **インターネット**: https://あなたのドメイン.ngrok-free.app

### テストアカウント
- 管理者: `admin@example.com` / `Admin123!`
- ユーザー: `user@example.com` / `User123!`

## トラブルシューティング

### ポート3000が使用中
```bash
# 別のポートを使用
docker compose down
# docker-compose.ymlのportsを "3001:3000" に変更
docker compose up -d
```

### データベースエラー
```bash
# データベースをリセット
docker exec -it campus-portal sh
npx prisma db push --force-reset
npx prisma db seed
exit
```

### ngrokが接続できない
1. NGROK_AUTHTOKENが正しいか確認
2. NGROK_DOMAINが正しいか確認
3. ログを確認: `docker compose logs ngrok`

## セキュリティ注意事項

1. **NEXTAUTH_SECRET は必ず変更**してください
2. 本番環境では強力なパスワードに変更してください
3. ngrokの無料プランではURLにアクセス時に確認画面が表示されます
4. 機密データは暗号化して保存することを推奨

## バックアップ

```bash
# データベースとアップロードファイルのバックアップ
cp -r ./data ./data-backup-$(date +%Y%m%d)
cp -r ./uploads ./uploads-backup-$(date +%Y%m%d)
```
