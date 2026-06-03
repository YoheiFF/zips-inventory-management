-- ============================================================
-- 初期化スクリプト: Zips データベース
-- Docker 初回起動時に自動実行される
-- ============================================================

CREATE DATABASE IF NOT EXISTS Zips
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE Zips;

-- ============================================================
-- ユーザーマスタ
-- ============================================================
CREATE TABLE IF NOT EXISTS AL_M_USER (
  user_id       INT          NOT NULL AUTO_INCREMENT,
  login_id      VARCHAR(50)  NOT NULL,
  password      VARCHAR(255) NOT NULL,
  user_name     VARCHAR(100) DEFAULT NULL,
  role          VARCHAR(50)  DEFAULT NULL,
  delete_flag   CHAR(1)      NOT NULL DEFAULT '0',
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_login_id (login_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- デフォルトユーザー (admin / password)
INSERT IGNORE INTO AL_M_USER (login_id, password, user_name, role, delete_flag)
VALUES ('admin', 'password', '管理者', 'admin', '0');

-- ============================================================
-- カテゴリマスタ
-- ============================================================
CREATE TABLE IF NOT EXISTS AL_M_CATEGORY (
  category_no     INT          NOT NULL AUTO_INCREMENT,
  item_name       VARCHAR(100) NOT NULL,
  sort_no         INT          NOT NULL DEFAULT 0,
  note            TEXT         DEFAULT NULL,
  delete_flag     CHAR(1)      NOT NULL DEFAULT '0',
  create_user_cd  VARCHAR(50)  DEFAULT NULL,
  create_date     DATETIME     DEFAULT NULL,
  record_user_cd  VARCHAR(50)  DEFAULT NULL,
  record_date     DATETIME     DEFAULT NULL,
  PRIMARY KEY (category_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 会社マスタ
-- ============================================================
CREATE TABLE IF NOT EXISTS AL_M_COMP (
  comp_no         INT          NOT NULL AUTO_INCREMENT,
  item_name       VARCHAR(100) NOT NULL,
  sort_no         INT          NOT NULL DEFAULT 0,
  note            TEXT         DEFAULT NULL,
  delete_flag     CHAR(1)      NOT NULL DEFAULT '0',
  create_user_cd  VARCHAR(50)  DEFAULT NULL,
  create_date     DATETIME     DEFAULT NULL,
  record_user_cd  VARCHAR(50)  DEFAULT NULL,
  record_date     DATETIME     DEFAULT NULL,
  PRIMARY KEY (comp_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 商品マスタ
-- ============================================================
CREATE TABLE IF NOT EXISTS AL_M_ITEM (
  item_no         INT            NOT NULL AUTO_INCREMENT,
  item_name       VARCHAR(200)   NOT NULL,
  img             VARCHAR(500)   DEFAULT NULL,
  amount          DECIMAL(10,2)  NOT NULL DEFAULT 0,
  keyword         VARCHAR(500)   DEFAULT NULL,
  note            TEXT           DEFAULT NULL,
  comp_no         INT            DEFAULT NULL,
  category_no     INT            DEFAULT NULL,
  delete_flag     CHAR(1)        NOT NULL DEFAULT '0',
  record_user_cd  VARCHAR(50)    DEFAULT NULL,
  record_date     DATETIME       DEFAULT NULL,
  PRIMARY KEY (item_no),
  KEY idx_category (category_no),
  KEY idx_comp (comp_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 在庫トランザクション
-- ============================================================
CREATE TABLE IF NOT EXISTS AL_T_STOCK (
  item_no         INT         NOT NULL,
  pieces          INT         NOT NULL DEFAULT 0,
  delete_flag     TINYINT     NOT NULL DEFAULT 0,
  record_user_cd  VARCHAR(50) DEFAULT NULL,
  record_date     DATETIME    DEFAULT NULL,
  PRIMARY KEY (item_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 発注トランザクション
-- ============================================================
CREATE TABLE IF NOT EXISTS AL_T_ORDER (
  order_no        INT         NOT NULL AUTO_INCREMENT,
  order_date      DATETIME    DEFAULT NULL,
  item_no         INT         DEFAULT NULL,
  pieces          INT         NOT NULL DEFAULT 0,
  delete_flag     TINYINT     NOT NULL DEFAULT 0,
  create_user_cd  VARCHAR(50) DEFAULT NULL,
  create_date     DATETIME    DEFAULT NULL,
  record_user_cd  VARCHAR(50) DEFAULT NULL,
  record_date     DATETIME    DEFAULT NULL,
  PRIMARY KEY (order_no),
  KEY idx_order_date (order_date),
  KEY idx_item_no (item_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
