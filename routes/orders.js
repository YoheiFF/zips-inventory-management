// routes/orders.js
const express = require("express");
const router = express.Router();
const pool = require("../db/mysql");

/**
 * 発注登録 API
 * POST /api/orders
 */
router.post("/", async (req, res) => {
  const { items, datetime } = req.body || {};

  const orderSql = `
    INSERT INTO Zips.AL_T_ORDER
      ( order_date, item_no, pieces, delete_flag, create_user_cd, create_date, record_user_cd, record_date )
    VALUES
      ( STR_TO_DATE(?, '%Y%m%d%H%i%s') - INTERVAL 9 HOUR, ?, ?, 0, 'SYSTEM', NOW(), 'SYSTEM', NOW() )
  `;

  const stockSql = `
    UPDATE Zips.AL_T_STOCK
    SET pieces = pieces + ?, record_user_cd = 'SYSTEM', record_date = NOW()
    WHERE item_no = ?
  `;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const inserted = [];
    for (const it of items) {
      const [result] = await conn.execute(orderSql, [
        datetime,
        it.item_no,
        it.pieces,
      ]);
      inserted.push({ insertId: result.insertId, item_no: it.item_no, pieces: it.pieces });

      await conn.execute(stockSql, [it.pieces, it.item_no]);
    }

    await conn.commit();
    return res.json({ ok: true, count: inserted.length, inserted });
  } catch (e) {
    await conn.rollback();
    console.error("INSERT AL_T_ORDER failed:", e);
    return res.status(500).json({ ok: false, error: "発注登録に失敗しました" });
  } finally {
    conn.release();
  }
});

// 発注履歴取得 API
// GET /api/orders/history
router.get("/history", async (req, res) => {
  const sql = `
SELECT
  DATE_FORMAT(order_date + INTERVAL 9 HOUR, '%Y/%m/%d %H:%i:%s') AS order_date_jst,
  SUM(pieces) AS total_pieces,
  MIN(create_user_cd) AS create_user_cd,
  MIN(create_date) AS create_date
FROM Zips.AL_T_ORDER
WHERE COALESCE(delete_flag, 0) = 0
GROUP BY order_date
ORDER BY order_date DESC
LIMIT 100;

  `;

  try {
    const [rows] = await pool.query(sql);

    // フロント表示用に整形
    const items = rows.map(r => ({
      order_date: r.order_date_jst,
      pdf_name: "ArtTheLine_在庫発注_" + r.order_date_jst.replace(/[/ :]/g, "").slice(0, 15) + ".pdf",
      pdf_link: `/uploads/pdfs/ArtTheLine_在庫発注_${r.order_date_jst.replace(/[/ :]/g, "").slice(0, 15)}.pdf`,
      order_user_name: r.create_user_cd || "",
      order_pieces: r.total_pieces,
      item_no: r.item_no,
    }));

    res.json({ items });
  } catch (e) {
    console.error("SELECT AL_T_ORDER failed:", e);
    res.status(500).json({ ok: false, error: "発注履歴の取得に失敗しました" });
  }
});




module.exports = router;
