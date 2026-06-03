# テーブル定義書

**システム名**: 美容室在庫管理システム（art-the-line-app）  
**データベース名**: `art_the_line`  
**作成日**: 2026-05-25  
**対象読者**: 開発者・DB管理者

---

## 1. テーブル命名規則

| プレフィックス | 意味 | 対象テーブル |
|--------------|------|------------|
| `AL_M_` | Art The Line Master（マスタテーブル） | AL_M_USER, AL_M_ITEM, AL_M_CATEGORY, AL_M_COMP |
| `AL_T_` | Art The Line Transaction（トランザクションテーブル） | AL_T_STOCK, AL_T_ORDER |

---

## 2. テーブル一覧

| No | テーブル名 | テーブル概要 | 種別 | 主キー |
|----|-----------|------------|------|-------|
| 1 | AL_M_USER | ユーザーマスタ | マスタ | user_id |
| 2 | AL_M_ITEM | 商品マスタ | マスタ | item_no |
| 3 | AL_M_CATEGORY | カテゴリマスタ | マスタ | category_no |
| 4 | AL_M_COMP | 会社（仕入先）マスタ | マスタ | comp_no |
| 5 | AL_T_STOCK | 在庫トランザクション | トランザクション | item_no |
| 6 | AL_T_ORDER | 発注トランザクション | トランザクション | order_id |

---

## 3. 各テーブル詳細定義

### 3.1 AL_M_USER（ユーザーマスタ）

ログインユーザーを管理するマスタテーブル。

| No | カラム名 | データ型（推定） | NULL | デフォルト | PK | FK | 説明 | 備考 |
|----|---------|----------------|------|-----------|----|----|------|------|
| 1 | user_id | INT | NOT NULL | AUTO_INCREMENT | ○ | - | ユーザーID | |
| 2 | login_id | VARCHAR(100) | NOT NULL | - | - | - | ログインID | ユニーク想定 |
| 3 | password | VARCHAR(255) | NOT NULL | - | - | - | パスワード | **現状は平文保存。bcrypt ハッシュ化が必要** |
| 4 | user_name | VARCHAR(100) | NOT NULL | - | - | - | 表示名 | セッションに保存 |
| 5 | role | VARCHAR(50) | NULL | - | - | - | ロール | 現在の実装では参照されていない |
| 6 | delete_flag | CHAR(1) | NOT NULL | '0' | - | - | 論理削除フラグ | '0'=有効, '1'=削除 |

**インデックス**: login_id にユニークインデックスを推奨  
**備考**: セッション情報として userId, loginId, userName, role, loginTime, isAuthenticated が保存される

---

### 3.2 AL_M_ITEM（商品マスタ）

美容室で取り扱う商品情報を管理するマスタテーブル。

| No | カラム名 | データ型（推定） | NULL | デフォルト | PK | FK | 説明 | 備考 |
|----|---------|----------------|------|-----------|----|----|------|------|
| 1 | item_no | INT | NOT NULL | AUTO_INCREMENT | ○ | - | 商品No | |
| 2 | item_name | VARCHAR(255) | NOT NULL | - | - | - | 商品名 | |
| 3 | img | VARCHAR(500) | NULL | NULL | - | - | 画像ファイル名 | **フルURLではなくファイル名のみを保存**。フロントで S3_BASE_URL + S3_IMG + filename に組み立て |
| 4 | amount | INT | NULL | 0 | - | - | 金額（税別） | |
| 5 | keyword | VARCHAR(500) | NULL | NULL | - | - | 検索キーワード | |
| 6 | note | TEXT | NULL | NULL | - | - | 備考 | |
| 7 | comp_no | INT | NOT NULL | - | - | AL_M_COMP.comp_no | 仕入先会社No | |
| 8 | category_no | INT | NOT NULL | - | - | AL_M_CATEGORY.category_no | カテゴリNo | |
| 9 | delete_flag | CHAR(1) | NOT NULL | '0' | - | - | 論理削除フラグ | '0'=有効, '1'=削除 |
| 10 | record_user_cd | VARCHAR(50) | NULL | NULL | - | - | 更新者コード | 現在は 'system' 固定 |
| 11 | record_date | DATETIME | NULL | NULL | - | - | 更新日時 | |

**インデックス**: delete_flag, category_no, comp_no にインデックス推奨  
**備考**: 画像アップロードは POST /api/items 時に DataURL → S3（またはローカル）に保存し、ファイル名のみを本テーブルに保存する

---

### 3.3 AL_M_CATEGORY（カテゴリマスタ）

商品カテゴリを管理するマスタテーブル。

| No | カラム名 | データ型（推定） | NULL | デフォルト | PK | FK | 説明 | 備考 |
|----|---------|----------------|------|-----------|----|----|------|------|
| 1 | category_no | INT | NOT NULL | AUTO_INCREMENT | ○ | - | カテゴリNo | |
| 2 | item_name | VARCHAR(255) | NOT NULL | - | - | - | カテゴリ名 | **注意: カラム名が `item_name` となっているが意味的には `category_name`** |
| 3 | sort_no | INT | NULL | NULL | - | - | 表示順 | 昇順でソート |
| 4 | note | VARCHAR(500) | NULL | NULL | - | - | 備考 | |
| 5 | delete_flag | CHAR(1) | NOT NULL | '0' | - | - | 論理削除フラグ | '0'=有効, '1'=削除 |
| 6 | create_user_cd | VARCHAR(50) | NULL | NULL | - | - | 作成者コード | |
| 7 | create_date | DATETIME | NULL | NULL | - | - | 作成日時 | |
| 8 | record_user_cd | VARCHAR(50) | NULL | NULL | - | - | 更新者コード | |
| 9 | record_date | DATETIME | NULL | NULL | - | - | 更新日時 | |

**設計上の注意点**: カラム `item_name` はカテゴリ名を表すが、AL_M_ITEM の `item_name`（商品名）と同一のカラム名を使用しており命名が不適切。API レスポンスでは `category_name` として返される。

---

### 3.4 AL_M_COMP（会社マスタ）

仕入先会社を管理するマスタテーブル。AL_M_CATEGORY と同一の物理構造を持つ。

| No | カラム名 | データ型（推定） | NULL | デフォルト | PK | FK | 説明 | 備考 |
|----|---------|----------------|------|-----------|----|----|------|------|
| 1 | comp_no | INT | NOT NULL | AUTO_INCREMENT | ○ | - | 会社No | |
| 2 | item_name | VARCHAR(255) | NOT NULL | - | - | - | 会社名 | **注意: カラム名が `item_name` となっているが意味的には `comp_name`** |
| 3 | sort_no | INT | NULL | NULL | - | - | 表示順 | 昇順でソート |
| 4 | note | VARCHAR(500) | NULL | NULL | - | - | 備考 | |
| 5 | delete_flag | CHAR(1) | NOT NULL | '0' | - | - | 論理削除フラグ | '0'=有効, '1'=削除 |
| 6 | create_user_cd | VARCHAR(50) | NULL | NULL | - | - | 作成者コード | |
| 7 | create_date | DATETIME | NULL | NULL | - | - | 作成日時 | |
| 8 | record_user_cd | VARCHAR(50) | NULL | NULL | - | - | 更新者コード | |
| 9 | record_date | DATETIME | NULL | NULL | - | - | 更新日時 | |

**設計上の注意点**: AL_M_CATEGORY と全く同一の構造だが、別テーブルとして定義されている。`item_name` カラムの命名規則の問題も AL_M_CATEGORY と同様。

---

### 3.5 AL_T_STOCK（在庫トランザクション）

商品ごとの現在在庫数を管理するテーブル。**1商品につき1レコード**の構造（item_no が主キー）。

| No | カラム名 | データ型（推定） | NULL | デフォルト | PK | FK | 説明 | 備考 |
|----|---------|----------------|------|-----------|----|----|------|------|
| 1 | item_no | INT | NOT NULL | - | ○ | AL_M_ITEM.item_no | 商品No | ON DUPLICATE KEY UPDATE で UPSERT 運用 |
| 2 | pieces | INT | NOT NULL | 0 | - | - | 在庫数 | 発注時は `pieces = pieces + ?` で加算 |
| 3 | delete_flag | INT / TINYINT | NULL | NULL | - | - | 論理削除フラグ | 0=有効, NULL も有効扱い（`COALESCE(delete_flag, 0) = 0`） |
| 4 | record_user_cd | VARCHAR(50) | NULL | NULL | - | - | 更新者コード | |
| 5 | record_date | DATETIME | NULL | NULL | - | - | 更新日時 | |

**重要設計事項**:
- 在庫の増減履歴テーブルは存在しない。`pieces` は現在残数のみを保持する
- 発注操作（`/api/orders`）で `pieces = pieces + ?` により在庫が加算される
- 商品登録・編集操作（`/api/items POST/PUT`）でも `upsertStock()` 関数により在庫が設定される
- 過去の在庫変動は追跡不可（AL_T_ORDER の発注履歴で間接的に確認のみ可能）

---

### 3.6 AL_T_ORDER（発注トランザクション）

発注操作の履歴を記録するトランザクションテーブル。**1回の発注操作で商品数分のレコードが挿入**される。発注をグルーピングするヘッダーテーブルは存在せず、`order_date` で GROUP BY して1回分の発注を識別する。

| No | カラム名 | データ型（推定） | NULL | デフォルト | PK | FK | 説明 | 備考 |
|----|---------|----------------|------|-----------|----|----|------|------|
| 1 | order_id | INT | NOT NULL | AUTO_INCREMENT | ○ | - | 発注ID | |
| 2 | order_date | DATETIME | NOT NULL | - | - | - | 発注日時 | **UTC で保存**。表示時は `+ INTERVAL 9 HOUR` で JST 変換 |
| 3 | item_no | INT | NOT NULL | - | - | AL_M_ITEM.item_no | 商品No | |
| 4 | pieces | INT | NOT NULL | - | - | - | 発注数 | |
| 5 | delete_flag | INT / TINYINT | NOT NULL | 0 | - | - | 論理削除フラグ | 0=有効 |
| 6 | create_user_cd | VARCHAR(50) | NULL | 'SYSTEM' | - | - | 作成者コード | 現在は 'SYSTEM' 固定 |
| 7 | create_date | DATETIME | NULL | NOW() | - | - | 作成日時 | |
| 8 | record_user_cd | VARCHAR(50) | NULL | 'SYSTEM' | - | - | 更新者コード | |
| 9 | record_date | DATETIME | NULL | NOW() | - | - | 更新日時 | |

**重要設計事項**:
- `order_date` は `STR_TO_DATE(?, '%Y%m%d%H%i%s') - INTERVAL 9 HOUR` で UTC に変換して保存
- 発注履歴の取得時は `GROUP BY order_date` で同時刻のレコードをまとめて1回の発注として扱う
- 発注ヘッダーテーブルがないため、同じ秒に複数の発注操作が行われた場合に混在する可能性がある
- PDF ファイル名は `order_date_jst`（JST 表示値）から動的に生成: `ArtTheLine_在庫発注_YYYYMMDDHHmmss.pdf`

---

## 4. ER 図（テーブル間のリレーション）

```mermaid
erDiagram
    AL_M_USER {
        int user_id PK
        varchar login_id
        varchar password
        varchar user_name
        varchar role
        char delete_flag
    }

    AL_M_CATEGORY {
        int category_no PK
        varchar item_name "カテゴリ名"
        int sort_no
        varchar note
        char delete_flag
        varchar create_user_cd
        datetime create_date
        varchar record_user_cd
        datetime record_date
    }

    AL_M_COMP {
        int comp_no PK
        varchar item_name "会社名"
        int sort_no
        varchar note
        char delete_flag
        varchar create_user_cd
        datetime create_date
        varchar record_user_cd
        datetime record_date
    }

    AL_M_ITEM {
        int item_no PK
        varchar item_name
        varchar img
        int amount
        varchar keyword
        text note
        int comp_no FK
        int category_no FK
        char delete_flag
        varchar record_user_cd
        datetime record_date
    }

    AL_T_STOCK {
        int item_no PK_FK
        int pieces
        int delete_flag
        varchar record_user_cd
        datetime record_date
    }

    AL_T_ORDER {
        int order_id PK
        datetime order_date
        int item_no FK
        int pieces
        int delete_flag
        varchar create_user_cd
        datetime create_date
        varchar record_user_cd
        datetime record_date
    }

    AL_M_ITEM }o--|| AL_M_CATEGORY : "category_no"
    AL_M_ITEM }o--|| AL_M_COMP : "comp_no"
    AL_T_STOCK ||--|| AL_M_ITEM : "item_no (1:1)"
    AL_T_ORDER }o--|| AL_M_ITEM : "item_no"
```

---

## 5. テーブル間のリレーション説明

| 親テーブル | 子テーブル | 結合キー | 種別 | 説明 |
|-----------|-----------|---------|------|------|
| AL_M_CATEGORY | AL_M_ITEM | category_no | 1:N | 1カテゴリに複数商品が属する |
| AL_M_COMP | AL_M_ITEM | comp_no | 1:N | 1会社から複数商品を仕入れる |
| AL_M_ITEM | AL_T_STOCK | item_no | 1:1 | 1商品につき1在庫レコード |
| AL_M_ITEM | AL_T_ORDER | item_no | 1:N | 1商品が複数回発注される |

---

## 6. 主要な SQL パターン

### 6.1 発注一覧取得（JOIN）

```sql
SELECT
    ami.item_no,
    ami.item_name,
    ami.img,
    ami.amount,
    ami.comp_no,
    amco.item_name AS comp_name,
    ami.category_no,
    amca.item_name AS category_name,
    ats.pieces
FROM art_the_line.AL_M_ITEM ami
INNER JOIN art_the_line.AL_M_CATEGORY amca ON ami.category_no = amca.category_no
INNER JOIN art_the_line.AL_M_COMP amco ON ami.comp_no = amco.comp_no
INNER JOIN art_the_line.AL_T_STOCK ats ON ami.item_no = ats.item_no
WHERE ami.delete_flag = '0'
ORDER BY ami.item_no;
```

### 6.2 在庫 UPSERT

```sql
INSERT INTO art_the_line.AL_T_STOCK (item_no, pieces, record_user_cd, record_date)
VALUES (?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
    pieces = VALUES(pieces),
    record_user_cd = VALUES(record_user_cd),
    record_date = VALUES(record_date);
```

### 6.3 発注登録と在庫加算（トランザクション内）

```sql
-- 発注登録
INSERT INTO art_the_line.AL_T_ORDER
  (order_date, item_no, pieces, delete_flag, create_user_cd, create_date, record_user_cd, record_date)
VALUES
  (STR_TO_DATE(?, '%Y%m%d%H%i%s') - INTERVAL 9 HOUR, ?, ?, 0, 'SYSTEM', NOW(), 'SYSTEM', NOW());

-- 在庫加算
UPDATE art_the_line.AL_T_STOCK
SET pieces = pieces + ?, record_user_cd = 'SYSTEM', record_date = NOW()
WHERE item_no = ?;
```

### 6.4 発注履歴取得（GROUP BY）

```sql
SELECT
    DATE_FORMAT(order_date + INTERVAL 9 HOUR, '%Y/%m/%d %H:%i:%s') AS order_date_jst,
    SUM(pieces) AS total_pieces,
    MIN(create_user_cd) AS create_user_cd,
    MIN(create_date) AS create_date
FROM art_the_line.AL_T_ORDER
WHERE COALESCE(delete_flag, 0) = 0
GROUP BY order_date
ORDER BY order_date DESC
LIMIT 100;
```
