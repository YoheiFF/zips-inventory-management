const express = require("express");
const router = express.Router();
const pool = require("../db/mysql");

// 会社一覧（既存）
router.get("/", async (req, res) => {
  try {
    const keyword = req.query.keyword || "";
    const [rows] = await pool.query(
      `SELECT comp_no, item_name AS comp_name, sort_no, note
         FROM Zips.AL_M_COMP
        WHERE delete_flag = '0'
          AND item_name LIKE ? 
        ORDER BY comp_no`,
      [`%${keyword}%`]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/companies error:", err);
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

// 会社新規登録
router.post("/", async (req, res) => {
  const { comp_name } = req.body;
  if (!comp_name) {
    return res.status(400).json({ error: "会社名は必須です" });
  }

  try {
    const now = new Date();
    const [result] = await pool.query(
      `INSERT INTO Zips.AL_M_COMP
         (item_name, sort_no, note, delete_flag,
          create_user_cd, create_date, record_user_cd, record_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        comp_name,          // 会社名
        0,                  // 表示順（とりあえず0）
        "",                 // 備考
        "0",                // 削除フラグ
        "system",           // 作成者CD
        now,                // 作成日
        "system",           // 更新者CD
        now                 // 更新日
      ]
    );

    res.json({ message: "登録完了", comp_no: result.insertId });
  } catch (err) {
    console.error("POST /api/companies error:", err);
    res.status(500).json({ error: "Failed to create company" });
  }
});

// 会社更新
router.put("/:comp_no", async (req, res) => {
  const { comp_no } = req.params;
  const { comp_name } = req.body;

  if (!comp_no) {
    return res.status(400).json({ error: "会社Noは必須です" });
  }
  if (!comp_name) {
    return res.status(400).json({ error: "会社名は必須です" });
  }

  try {
    const now = new Date();
    const [result] = await pool.query(
      `UPDATE Zips.AL_M_COMP
         SET item_name = ?,
             record_user_cd = ?,
             record_date = ?
       WHERE comp_no = ? AND delete_flag = '0'`,
      [
        comp_name,   // 新しい会社名
        "system",    // 更新者
        now,         // 更新日時
        comp_no      // 更新対象の会社No
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "対象の会社が存在しません" });
    }

    res.json({ message: "更新完了" });
  } catch (err) {
    console.error("PUT /api/companies/:comp_no error:", err);
    res.status(500).json({ error: "Failed to update company" });
  }
});


// 会社削除（論理削除）
router.delete("/:comp_no", async (req, res) => {
      console.log("TEST1");
  const { comp_no } = req.params;
  if (!comp_no) {
    return res.status(400).json({ error: "会社Noは必須です" });
  }

  try {
    const now = new Date();
    const [result] = await pool.query(
      `UPDATE Zips.AL_M_COMP
         SET delete_flag = '1',
             record_user_cd = ?,
             record_date = ?
       WHERE comp_no = ?`,
      [
        "system",  // 更新者
        now,       // 更新日時
        comp_no    // 更新対象
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "対象の会社が見つかりません" });
    }

    res.json({ message: "削除完了", comp_no });
  } catch (err) {
    console.error("DELETE /api/companies/:comp_no error:", err);
    res.status(500).json({ error: "Failed to delete company" });
  }
});

module.exports = router;
