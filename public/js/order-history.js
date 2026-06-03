$(async function () {
  const $root = $("#items-order-history");

  // 共通ヘッダー（タイトル差し替え）
  if (typeof loadHeader === "function") {
    loadHeader("発注履歴一覧画面");
  }

  // 空表示
  function renderEmpty() {
    $root.html(`
      <div class="history__row history__row--empty">
        <span class="history__col history__col--full">発注履歴がありません</span>
      </div>
    `);
  }

  // エラー表示
  function renderError(msg) {
    $root.html(`
      <div class="history__row history__row--error">
        <span class="history__col history__col--full">エラー：${escapeHtml(msg || "取得に失敗しました")}</span>
      </div>
    `);
  }

  // HTMLエスケープ
  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // 日時整形（ISO/UNIX/ms/カスタム文字列にある程度対応）
  function formatDateTime(input) {
    if (!input) return "";

    // 1) 数字14桁 "yyyyMMddHHmmss" 形式（例: 20251008222418）対策
    const m = String(input).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
    if (m) {
      const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])); // UTC想定
      // 表示はJST（+9）
      d.setHours(d.getHours() + 9);
      return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    }

    // 2) UNIX秒
    if (/^\d{10}$/.test(String(input))) {
      const d = new Date(Number(input) * 1000);
      return fmtLocal(d);
    }

    // 3) UNIXミリ秒
    if (/^\d{13}$/.test(String(input))) {
      const d = new Date(Number(input));
      return fmtLocal(d);
    }

    // 4) ISO文字列
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      return fmtLocal(d);
    }

    return String(input); // 不明ならそのまま出す
  }
  function fmtLocal(d) {
    // ローカルがJSTであればそのまま、そうでなければJST化
    // 明示的にJST表示したい場合：
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const jst = new Date(utc + 9 * 3600 * 1000);
    return `${jst.getFullYear()}/${pad2(jst.getMonth() + 1)}/${pad2(jst.getDate())} ${pad2(jst.getHours())}:${pad2(jst.getMinutes())}:${pad2(jst.getSeconds())}`;
  }
  function pad2(n) { return String(n).padStart(2, "0"); }

  // 行DOM生成
  function renderRow(item) {
    const orderDate = formatDateTime(item.order_date).slice(0, 10);
    const orderUser = escapeHtml(item.order_user_name ?? "");
    const orderPieces = Number(item.order_pieces ?? 0);

    // PDFリンク（URLがない場合はテキスト表示）
    let pdfCell = "";
    if (item.pdf_name) {
      const pdfName = escapeHtml(item.pdf_name || "発注書PDF");
      const pdfLink = item.pdf_link || "";
      pdfCell = `<a class="history__pdfLink" href="${escapeHtml(pdfLink)}"  target="_blank" rel="noopener noreferrer">${pdfName}</a>`;
    } else {
      pdfCell = `<span class="history__pdfName--none">—</span>`;
    }

    return `
      <div class="history__row">
        <span class="history__col history__col--orderDate">${orderDate}</span>
        <span class="history__col history__col--pdfName">${pdfCell}</span>
        <span class="history__col history__col--orderUser">${orderUser}</span>
        <span class="history__col history__col--orderPieces">${orderPieces}</span>
      </div>
    `;
  }

  // データ取得〜描画
  try {
    const res = await fetch("/api/orders/history");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const list = Array.isArray(data?.items) ? data.items : [];
    if (list.length === 0) {
      renderEmpty();
      return;
    }

    const html = list.map(renderRow).join("");
    $root.html(html);
  } catch (e) {
    console.error(e);
    renderError(e.message);
  }
});
