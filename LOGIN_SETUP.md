# ログイン機能の実装ガイド

## 概要
Art The Line 在庫管理システムに認証機能を追加しました。ログイン画面を経由して認証を行い、セッション管理でユーザー状態を保持します。

## ファイル構成

### 新規作成ファイル
- **public/login.html** - ログイン画面
- **routes/auth.js** - 認証ルート（ログイン、ログアウト、認証確認）
- **middleware/auth.js** - 認証ミドルウェア
- **public/js/auth-check.js** - クライアント側の認証チェック

### 更新ファイル
- **app.js** - セッション設定、認証ミドルウェアの統合、保護されたルートの設定
- **public/header.html** - ログアウトボタンの追加
- **.env** - セッション設定とログイン認証情報の追加

## セットアップ方法

### 1. 依存パッケージのインストール
```bash
npm install express-session
```

### 2. 環境変数の設定
`.env` ファイルに以下を追加してください：

```env
# セッション設定
SESSION_SECRET=your-secret-key-change-in-production

# ログイン認証情報
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
```

**注意**: 本番環境では、`SESSION_SECRET` を安全なランダム文字列に変更し、`ADMIN_USERNAME` と `ADMIN_PASSWORD` も変更してください。

### 3. デフォルト認証情報
- **ユーザー名**: `admin`
- **パスワード**: `password`

## 使用方法

### ユーザーのログイン
1. ブラウザで `http://localhost:3000/login.html` にアクセス
2. ユーザー名とパスワードを入力
3. 「ログイン」ボタンをクリック
4. 認証成功後、トップ画面にリダイレクト

### ユーザーのログアウト
1. ヘッダーの右上のログアウトボタン（→矢印アイコン）をクリック
2. 確認ダイアログで「OK」をクリック
3. ログイン画面にリダイレクト

### 認証の仕組み

#### サーバーサイド
- **セッション管理**: express-session を使用してセッション情報を管理
- **保護されたルート**: 認証ミドルウェアで保護
  - すべての API エンドポイント (`/api/*`) は認証が必須
  - HTML ファイル（top.html, item-maintenance.html など）は認証が必須
  - login.html と静的アセット（CSS, JS, 画像）は認証不要

#### クライアントサイド
- **認証チェック**: ページ読み込み時に `/api/auth/check` で認証状態を確認
- **ログアウト**: ヘッダーのボタンから `/api/auth/logout` を実行

## API エンドポイント

### 認証関連

#### POST /api/auth/login
ユーザーをログインさせる
```json
{
  "username": "admin",
  "password": "password"
}
```

#### POST /api/auth/logout
ユーザーをログアウトさせる

#### GET /api/auth/check
認証状態を確認する
```json
{
  "authenticated": true,
  "user": {
    "username": "admin",
    "loginTime": "2024-01-14T...",
    "isAuthenticated": true
  }
}
```

## セッション設定

セッションは以下の設定で動作します：
- **有効期限**: 24時間
- **HttpOnly**: true（XSS 対策）
- **Secure**: false（ローカル開発用）
  - 本番環境では HTTPS 対応時に true に変更

## 保護されたルート一覧

### HTML ページ（認証必須）
- `/` (/)
- `/top.html`
- `/item-maintenance.html`
- `/category-maintenance.html`
- `/company-maintenance.html`
- `/salon-order.html`
- `/cart.html`
- `/order-complete.html`
- `/order-history.html`
- `/item-form.html`

### API エンドポイント（認証必須）
- `/api/items`
- `/api/categories`
- `/api/stocks`
- `/api/companies`
- `/api/orders`
- `/api/pdf`

### 認証不要
- `/login.html`
- `/api/auth/*`
- 静的アセット（CSS, JS, 画像、フォント）

## セキュリティに関する注意事項

1. **本番環境での対策**:
   - SESSION_SECRET を強固な文字列に変更
   - ADMIN_USERNAME と ADMIN_PASSWORD を変更
   - HTTPS を有効化（secure: true）
   - データベースにユーザー情報を保存し、パスワードはハッシュ化
   - 複数ユーザーの管理機能を実装

2. **推奨される将来の改善**:
   - AL_M_ADMIN テーブル（またはユーザーテーブル）を作成
   - bcrypt などのライブラリでパスワードをハッシュ化
   - JWT トークンベースの認証への移行
   - より詳細なロールベースアクセス制御（RBAC）

## トラブルシューティング

### ログイン画面が表示されない
- サーバーが起動しているか確認
- `http://localhost:3000/login.html` にアクセスしているか確認

### ログイン後、すぐにログイン画面に戻る
- セッションが正しく設定されているか確認
- ブラウザの Cookie が有効か確認
- サーバーログのエラーを確認

### API が 401 エラーを返す
- ログインしているか確認
- セッションの有効期限が切れていないか確認
- `/api/auth/check` で認証状態を確認

## 環境変数リファレンス

```env
# 既存の設定（変更なし）
DB_HOST=127.0.0.1
DB_USER=appuser
DB_PASS=apppass
DB_NAME=art_the_line
DB_PORT=3306

# セッション設定（新規追加）
SESSION_SECRET=your-secret-key-change-in-production

# ログイン認証情報（新規追加）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
```
