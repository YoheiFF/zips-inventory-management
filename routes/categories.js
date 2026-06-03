// routes/categories.js
const express = require("express");
const router = express.Router();
const pool = require("../db/mysql");


// カテゴリ一覧（既存）
// /api/categories
router.get("/", async (req, res) => {
  try {
    const keyword = (req.query.keyword || "").trim();
    console.log("keyword:", keyword);

    // ベースSQL
    let sql = `
      SELECT
        category_no,
        item_name AS category_name,
        sort_no,
        note
      FROM Zips.AL_M_CATEGORY
      WHERE delete_flag = '0'
    `;
    const params = [];

    // keyword がある時だけ絞り込み
    if (keyword) {
      sql += ` AND item_name LIKE ? `;
      params.push(`%${keyword}%`);
    }

    sql += ` ORDER BY category_no `;

    const conn = await pool.getConnection();
    try {
      const [rows] = await conn.query(sql, params);
      console.log("Fetched categories:", rows);
      return res.json(Array.isArray(rows) ? rows : []);
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("GET /api/categories error:", err && (err.code || err.message), err);
    res.status(500).json({ ok: false, error: "SERVER_ERROR", code: err?.code || null });
  }
});


// カテゴリ新規登録
router.post("/", async (req, res) => {
  const { category_name } = req.body;
  if (!category_name) {
    return res.status(400).json({ error: "カテゴリ名は必須です" });
  }

  try {
    const now = new Date();
    const [result] = await pool.query(
      `INSERT INTO Zips.AL_M_CATEGORY
         (item_name, sort_no, note, delete_flag,
          create_user_cd, create_date, record_user_cd, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_name,          // カテゴリ名
        0,                  // 表示順（とりあえず0）
        "",                 // 備考
        "0",                // 削除フラグ
        "system",           // 作成者CD
        now,                // 作成日
        "system",           // 更新者CD
        now                 // 更新日
      ]
    );

    res.json({ message: "登録完了", category_no: result.insertId });
  } catch (err) {
    console.error("POST /api/categories error:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// カテゴリ更新
router.put("/:category_no", async (req, res) => {
  const { category_no } = req.params;
  const { category_name } = req.body;
  if (!category_no) {
    return res.status(400).json({ error: "カテゴリNoは必須です" });
  }
  if (!category_name) {
    return res.status(400).json({ error: "カテゴリ名は必須です" });
  }

  try {
    const now = new Date();
    const [result] = await pool.query(
      `UPDATE Zips.AL_M_CATEGORY
         SET item_name = ?,
             record_user_cd = ?,
             record_date = ?
       WHERE category_no = ? AND delete_flag = '0'`,
      [
        category_name,   // 新しいカテゴリ名
        "system",    // 更新者
        now,         // 更新日時
        category_no      // 更新対象のカテゴリNo
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "対象のカテゴリが存在しません" });
    }

    res.json({ message: "更新完了" });
  } catch (err) {
    console.error("PUT /api/categories/:category_no error:", err);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// カテゴリ削除（論理削除）
router.delete("/:category_no", async (req, res) => {
  console.log("TEST1");
  const { category_no } = req.params;
  console.log(category_no);
  if (!category_no) {
    return res.status(400).json({ error: "カテゴリNoは必須です" });
  }

  try {
    const now = new Date();
    const [result] = await pool.query(
      `UPDATE Zips.AL_M_CATEGORY
         SET delete_flag = '1',
             record_user_cd = ?,
             record_date = ?
       WHERE category_no = ?`,
      [
        "system",  // 更新者
        now,       // 更新日時
        category_no    // 更新対象
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "対象のカテゴリが見つかりません" });
    }

    res.json({ message: "削除完了", category_no });
  } catch (err) {
    console.error("DELETE /api/categories/:category_no error:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

module.exports = router;
