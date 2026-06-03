-- ============================================================
-- 移行スクリプト: art_the_line → Zips
-- Docker 起動後に手動で実行する
-- 実行方法:
--   docker exec -i zips-mysql mysql -u root -prootpass < mysql-init/migrate-art-to-zips.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS Zips
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- ユーザーマスタ
-- ============================================================
CREATE TABLE IF NOT EXISTS Zips.AL_M_USER LIKE art_the_line.AL_M_USER;
INSERT IGNORE INTO Zips.AL_M_USER SELECT * FROM art_the_line.AL_M_USER;

-- ============================================================
-- カテゴリマスタ
-- ============================================================
CREATE TABLE IF NOT EXISTS Zips.AL_M_CATEGORY LIKE art_the_line.AL_M_CATEGORY;
INSERT IGNORE INTO Zips.AL_M_CATEGORY SELECT * FROM art_the_line.AL_M_CATEGORY;

-- ============================================================
-- 会社マスタ
-- ============================================================
CREATE TABLE IF NOT EXISTS Zips.AL_M_COMP LIKE art_the_line.AL_M_COMP;
INSERT IGNORE INTO Zips.AL_M_COMP SELECT * FROM art_the_line.AL_M_COMP;

-- ============================================================
-- 商品マスタ
-- ============================================================
CREATE TABLE IF NOT EXISTS Zips.AL_M_ITEM LIKE art_the_line.AL_M_ITEM;
INSERT IGNORE INTO Zips.AL_M_ITEM SELECT * FROM art_the_line.AL_M_ITEM;

-- ============================================================
-- 在庫トランザクション
-- ============================================================
CREATE TABLE IF NOT EXISTS Zips.AL_T_STOCK LIKE art_the_line.AL_T_STOCK;
INSERT IGNORE INTO Zips.AL_T_STOCK SELECT * FROM art_the_line.AL_T_STOCK;

-- ============================================================
-- 発注トランザクション
-- ============================================================
CREATE TABLE IF NOT EXISTS Zips.AL_T_ORDER LIKE art_the_line.AL_T_ORDER;
INSERT IGNORE INTO Zips.AL_T_ORDER SELECT * FROM art_the_line.AL_T_ORDER;

SELECT 'Migration completed: art_the_line → Zips' AS result;
