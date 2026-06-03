// routes/stock.js
const express = require("express");
const router = express.Router();
const pool = require("../db/mysql");

// 在庫一覧取得API
router.get("/", async (_req, res) => {
  try {
    const sql = `
      SELECT item_no, pieces
      FROM Zips.AL_T_STOCK
      WHERE (delete_flag = 0 OR delete_flag IS NULL)
      ORDER BY item_no
    `;
    const [rows] = await pool.query(sql);

    // 必要な情報だけ返す
    res.json(rows.map(r => ({
      item_no: r.item_no,
      pieces: r.pieces
    })));
  } catch (err) {
    console.error("GET /api/stocks error:", err);
    res.status(500).json({ error: "Failed to fetch stocks" });
  }
});

// 在庫加算API
// POST /api/stock/add
router.post("/add", async (req, res) => {
  const { items } = req.body || {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ ok: false, error: "items array is required" });
  }

  const sql = `
    UPDATE Zips.AL_T_STOCK
    SET pieces = pieces + ?, record_user_cd = 'SYSTEM', record_date = NOW()
    WHERE item_no = ?
  `;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const updated = [];
    for (const item of items) {
      const { item_no, pieces } = item;
      if (!item_no || !pieces || pieces <= 0) continue;

      const [result] = await conn.execute(sql, [pieces, item_no]);
      updated.push({ item_no, pieces, affectedRows: result.affectedRows });
    }

    await conn.commit();
    return res.json({ ok: true, count: updated.length, updated });
  } catch (e) {
    await conn.rollback();
    console.error("UPDATE AL_T_STOCK failed:", e);
    return res.status(500).json({ ok: false, error: "在庫更新に失敗しました" });
  } finally {
    conn.release();
  }
});
 
 
module.exports = router;
