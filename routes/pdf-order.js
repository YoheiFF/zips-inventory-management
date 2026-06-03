// routes/pdf-order.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const PDFDocument = require("pdfkit");

const router = express.Router();

router.post("/order", async (req, res) => {
  try {
    const { filename, ordered_at, rows } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "rows が空です" });
    }

    // ファイル名（未指定なら order.pdf）
    const safeName = (filename && String(filename).trim()) || "order.pdf";

    // ローカル保存先
    const saveDir = path.join(__dirname, "..", "public", "uploads", "pdfs");
    const savePath = path.join(saveDir, safeName);
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });

    // PDF生成
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // 日本語フォント設定
    const fontsDir = path.join(__dirname, "..", "fonts");
    const jpVar = path.join(fontsDir, "NotoSansJP-VariableFont_wght.ttf");
    const jpReg = path.join(fontsDir, "NotoSansJP-Regular.ttf");
    const fontPath = fs.existsSync(jpVar) ? jpVar : jpReg;
    if (!fontPath) {
      return res.status(500).json({ error: "日本語フォントが見つかりません" });
    }
    doc.registerFont("JP", fontPath).font("JP");

    // 出力先（保存＆ダウンロード）
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="order.pdf"; filename*=UTF-8''${encodeURIComponent(safeName)}`
    );

    // ローカルファイルへの書き込みストリーム
    const fileStream = fs.createWriteStream(savePath);

    // PDFをレスポンスとローカルファイルの両方にパイプ
    doc.pipe(fileStream);
    doc.pipe(res);

    // ===== ここから下はレイアウト =====

    const pageW = doc.page.width;
    const { left, right, top, bottom } = doc.page.margins;
    const contentW = pageW - left - right;

    const colW = {
      name: Math.floor(contentW * 0.45),
      qty:  Math.floor(contentW * 0.10),
      comp: Math.floor(contentW * 0.40),
    };
    const rowPadX = 6;
    const rowPadY = 6;

    const borderColor = "#e3d6c2";
    const headBg     = "#f2e9d8";
    const textColor  = "#3f3a37";

    doc.fillColor(textColor).fontSize(14).text("在庫発注書", left, top);
    doc.moveDown(0.4);
    doc.fontSize(10).text(`発注日: ${ordered_at || ""}`);
    doc.moveDown(0.6);

    let y = doc.y + 4;

    function drawHeader() {
      const h = 22;
      doc.save()
        .rect(left, y, contentW, h)
        .fill(headBg)
        .restore();

      doc.strokeColor(borderColor).lineWidth(0.5)
        .rect(left, y, contentW, h)
        .stroke();

      doc.strokeColor(borderColor).lineWidth(0.5)
        .moveTo(left + colW.name, y)
        .lineTo(left + colW.name, y + h)
        .moveTo(left + colW.name + colW.qty, y)
        .lineTo(left + colW.name + colW.qty, y + h)
        .stroke();

      let x = left;
      doc.fillColor(textColor).fontSize(11);
      doc.text("商品名", x + rowPadX, y + (h - 11) / 2, { width: colW.name - rowPadX * 2 });
      x += colW.name;

      doc.text("個数", x + rowPadX, y + (h - 11) / 2, { width: colW.qty - rowPadX * 2});
      x += colW.qty;

      doc.text("発注先", x + rowPadX, y + (h - 11) / 2, { width: colW.comp - rowPadX * 2 });

      y += h;
    }

    function drawRow(item) {
      const name = String(item.name ?? "");
      const qty  = String(item.qty ?? item.pieces ?? "");
      const comp = String(item.comp_name ?? item.company_name ?? item.comp ?? "");

      doc.fontSize(10);
      const hName = doc.heightOfString(name, { width: colW.name - rowPadX * 2 });
      const hQty  = doc.heightOfString(qty,  { width: colW.qty  - rowPadX * 2 });
      const hComp = doc.heightOfString(comp, { width: colW.comp - rowPadX * 2 });

      const cellH = Math.max(hName, hQty, hComp) + rowPadY * 2;

      if (y + cellH > doc.page.height - bottom) {
        doc.addPage();
        y = top;
        drawHeader();
      }

      doc.strokeColor(borderColor).lineWidth(0.5)
        .rect(left, y, contentW, cellH)
        .stroke();

      doc.strokeColor(borderColor).lineWidth(0.5)
        .moveTo(left + colW.name, y)
        .lineTo(left + colW.name, y + cellH)
        .moveTo(left + colW.name + colW.qty, y)
        .lineTo(left + colW.name + colW.qty, y + cellH)
        .stroke();

      let x = left;
      doc.fillColor(textColor);

      doc.text(name, x + rowPadX, y + rowPadY, {
        width: colW.name - rowPadX * 2
      });
      x += colW.name;

      const qtyY = y + Math.max(0, Math.floor((cellH - hQty) / 2));
      doc.text(qty, x + rowPadX, qtyY, {
        width: colW.qty - rowPadX * 2,
        align: "center"
      });
      x += colW.qty;

      doc.text(comp, x + rowPadX, y + rowPadY, {
        width: colW.comp - rowPadX * 2
      });

      y += cellH;
    }

    drawHeader();
    rows.forEach(drawRow);

    y += 10;
    doc.moveTo(left, y).lineTo(left + contentW, y).strokeColor(borderColor).stroke();

    // PDF書き込み終了
    doc.end();

    // ローカル保存完了ログ（S3アップロードなし）
    fileStream.on("finish", () => {
      console.log("PDF saved locally:", savePath);
    });

    fileStream.on("error", (e) => {
      console.error("PDF local save error:", e);
    });
  } catch (err) {
    console.error("POST /api/pdf/order error:", err);
    res.status(500).json({ error: "PDF生成に失敗しました" });
  }
});

module.exports = router;
