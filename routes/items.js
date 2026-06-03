// routes/items.js
const express = require("express");
const router = express.Router();
const pool = require("../db/mysql");
const fs = require("fs");
const path = require("path");

// GET /api/items : 商品一覧
router.get("/", async (_req, res) => {
  try {
    const sql = `
SELECT
    ami.item_no
    , ami.item_name
    , ami.img
    , ami.amount
    , ami.comp_no
    , amco.item_name as conp_name
    , ami.category_no
    , amca.item_name as category_name
    , ats.pieces
FROM
    Zips.AL_M_ITEM ami
    INNER JOIN Zips.AL_M_CATEGORY amca
        ON ami.category_no = amca.category_no
    INNER JOIN Zips.AL_M_COMP amco
        ON ami.comp_no = amco.comp_no
    INNER JOIN Zips.AL_T_STOCK ats
        ON ami.item_no = ats.item_no
WHERE
    ami.delete_flag = '0'
ORDER BY
    ami.item_no
    `;
    const [rows] = await pool.query(sql);

    // フロントが扱いやすい形に整形
    const items = rows.map((r) => ({
      item_no: r.item_no,
      name: r.item_name,
      image_url: r.img ? `/uploads/images/${encodeURIComponent(r.img)}` : null,
      amount: r.amount,
      comp_no: r.comp_no,
      company_name: r.conp_name,
      category_no: r.category_no,
      category_name: r.category_name,
      stock: r.pieces || 0,
    }));

    res.json(items);
  } catch (err) {
    console.error("GET /api/items error:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// GET /api/maintenance : 商品一覧
router.get("/maintenance", async (_req, res) => {
  try {
    const keyword = _req.query.keyword || "";

    let sql = `
SELECT
    ami.item_no
    , ami.item_name
    , ami.img
    , ami.amount
    , ami.keyword
    , ami.note
    , ami.comp_no
    , ami.category_no
    , amco.item_name as company_name
    , amca.item_name as category_name
    , ats.pieces
FROM
    Zips.AL_M_ITEM ami
    LEFT JOIN Zips.AL_M_COMP amco
        ON ami.comp_no = amco.comp_no
    LEFT JOIN Zips.AL_M_CATEGORY amca
        ON ami.category_no = amca.category_no
    LEFT JOIN Zips.AL_T_STOCK ats
        ON ami.item_no = ats.item_no
WHERE ami.delete_flag = '0'
`;
    const params = [];

    if (keyword) {
      sql += ` AND ami.item_name LIKE ?`;
      params.push(`%${keyword}%`);
    }

    sql += ` ORDER BY ami.item_no`;

    const [rows] = await pool.query(sql, params);

    // フロントが扱いやすい形に整形
    const items = rows.map((r) => ({
      item_no: r.item_no,
      name: r.item_name,
      image_url: r.img ? `/uploads/images/${encodeURIComponent(r.img)}` : null,
      amount: r.amount || 0,
      company_name: r.company_name || null,
      category_name: r.category_name || null,
      stock: r.pieces || 0,
    }));

    res.json(items);
  } catch (err) {
    console.error("GET /api/items error:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// GET /api/items/:item_no : 商品1件取得
router.get("/:item_no", async (req, res) => {
  const { item_no } = req.params;
  if (!item_no) {
    return res.status(400).json({ error: "item_no is required" });
  }

  try {
    const sql = `
SELECT
    ami.item_no
    , ami.item_name
    , ami.img
    , ami.amount
    , ami.keyword
    , ami.note
    , ami.comp_no
    , ami.category_no
    , ats.pieces
FROM
    Zips.AL_M_ITEM ami
LEFT JOIN Zips.AL_T_STOCK ats
ON ami.item_no = ats.item_no
      WHERE ami.delete_flag = '0'
        AND ami.item_no = ?
    `;
    const [rows] = await pool.query(sql, [item_no]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    const r = rows[0];
    const item = {
      item_no: r.item_no,
      name: r.item_name,
      image_url: r.img ? `/uploads/images/${encodeURIComponent(r.img)}` : null,
      amount: r.amount,
      keyword: r.keyword,
      note: r.note,
      comp_no: r.comp_no,
      category_no: r.category_no,
      pieces: r.pieces || 0
    };

    res.json(item);
  } catch (err) {
    console.error("GET /api/items/:item_no error:", err);
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

// 商品削除（論理削除）
router.delete("/:item_no", async (req, res) => {
  const { item_no } = req.params;
  console.log("item_no:", item_no);
  try {
    const now = new Date();
    const [result] = await pool.query(
      `UPDATE Zips.AL_M_ITEM
         SET delete_flag = '1',
             record_user_cd = ?,
             record_date = ?
       WHERE item_no = ?`,
      [
        "system",
        now,
        item_no
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "対象の商品が見つかりません" });
    }

    res.json({ message: "削除完了", item_no });
  } catch (err) {
    console.error("DELETE /api/items/:item_no error:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});


// MIME → 拡張子の簡易マップ
const MIME_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp"
};

// DataURLを受け取りローカルに保存してファイル名を返す
async function saveImageLocally(dataUrl) {
  const m = /^data:(.+);base64,(.+)$/.exec(dataUrl || "");
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  const ext = MIME_EXT[mime] || "bin";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = Buffer.from(b64, "base64");

  const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads", "images");
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const absPath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(absPath, buffer);
  return filename;
}

// ★新規登録(JSON版) : POST /api/items
router.post("/", async (req, res) => {
  try {
    const {
      name,
      company_no,
      category_id,
      price,
      stock,
      keyword,
      note,
      imageDataUrl
    } = req.body || {};

    // 必須チェック
    if (!name || !company_no || !category_id) {
      return res.status(400).json({ error: "name / company_no / category_id は必須です" });
    }

    // 画像が送られてきたらファイル化
    let imageFileName = null;
    if (imageDataUrl && imageDataUrl.startsWith("data:")) {
      try {
        imageFileName = await saveImageLocally(imageDataUrl);
        if (!imageFileName) throw new Error("image save failed");
      } catch (e) {
        console.error("image upload failed:", e);
        return res.status(400).json({ error: "画像の保存に失敗しました（形式/サイズを確認）" });
      }
    }

    const conn = await pool.getConnection();
    await conn.beginTransaction();
    try {
      // 商品マスタ登録
      const [r1] = await conn.query(
        `INSERT INTO Zips.AL_M_ITEM
           (item_name, img, amount, keyword, note, comp_no, category_no, delete_flag, record_user_cd, record_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, '0', ?, ?)`,
        [
          name,
          imageFileName,
          price != null ? Number(price) : 0,
          keyword || null,
          note || null,
          Number(company_no),
          Number(category_id),
          "system",
          new Date()
        ]
      );

      const newItemNo = r1.insertId;
      if (stock !== undefined) {
        await upsertStock(conn, newItemNo, stock);
      }
      await conn.commit();
      res.status(201).json({
        message: "登録完了",
        item_no: newItemNo,
        image_filename: imageFileName
      });
    } catch (dbErr) {
      await conn.rollback();
      console.error("POST /api/items DB error:", dbErr);
      res.status(500).json({ error: "登録に失敗しました" });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error("POST /api/items error:", err);
    res.status(500).json({ error: "サーバーエラー" });
  }
});

// ===== 更新（JSON+DataURL）: PUT /api/items/:item_no =====
router.put("/:item_no", async (req, res) => {
  const { item_no } = req.params;
  if (!item_no) return res.status(400).json({ error: "item_no は必須です" });

  const {
    name,
    company_no,
    category_id,
    price,
    stock,
    keyword,
    note,
    imageDataUrl
  } = req.body || {};

  // DataURL が来た場合だけ新しい画像を保存
  let newImageFileName = null;
  if (typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:")) {
    try {
      newImageFileName = await saveImageLocally(imageDataUrl);
      if (!newImageFileName) throw new Error("image save failed");
    } catch (e) {
      console.error("image save failed:", e);
      return res.status(400).json({ error: "画像の保存に失敗しました（形式/サイズを確認）" });
    }
  }

  const conn = await pool.getConnection();
  await conn.beginTransaction();

  try {
    // 現在の画像パスを取得（差し替え判定＆レスポンス用）
    const [curRows] = await conn.query(
      `SELECT img FROM Zips.AL_M_ITEM WHERE item_no = ? AND delete_flag = '0'`,
      [item_no]
    );
    if (curRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "対象の商品が見つかりません" });
    }
    const currentImg = curRows[0].img || null;

    // 更新（未指定フィールドは現状維持）
    const [r1] = await conn.query(
      `UPDATE Zips.AL_M_ITEM
         SET item_name    = COALESCE(?, item_name),
             img          = COALESCE(?, img),
             amount       = COALESCE(?, amount),
             keyword      = COALESCE(?, keyword),
             note         = COALESCE(?, note),
             comp_no      = COALESCE(?, comp_no),
             category_no  = COALESCE(?, category_no),
             record_user_cd = ?,
             record_date    = ?
       WHERE item_no = ? AND delete_flag = '0'`,
      [
        name ?? null,
        newImageFileName ?? null,
        price !== undefined ? Number(price) : null,
        keyword ?? null,
        note ?? null,
        company_no !== undefined ? Number(company_no) : null,
        category_id !== undefined ? Number(category_id) : null,
        "system",
        new Date(),
        item_no
      ]
    );

    if (r1.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "更新対象が見つかりません" });
    }

    if (stock !== undefined) {
      await upsertStock(conn, item_no, stock);
    }

    await conn.commit();

    return res.json({
      message: "更新完了",
      item_no,
      image_url: newImageFileName || currentImg
    });
  } catch (err) {
    await conn.rollback();
    console.error("PUT /api/items/:item_no error:", err);
    return res.status(500).json({ error: "更新に失敗しました" });
  } finally {
    conn.release();
  }
});

async function upsertStock(conn, itemNo, pieces, userCd = "system") {
  await conn.query(
    `INSERT INTO Zips.AL_T_STOCK (item_no, pieces, record_user_cd, record_date)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       pieces = VALUES(pieces),
       record_user_cd = VALUES(record_user_cd),
       record_date = VALUES(record_date)`,
    [itemNo, Number(pieces), userCd, new Date()]
  );
}

module.exports = router;
