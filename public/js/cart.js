// public/js/cart.js
(function () {
  // DOM 準備後に実行
  window.addEventListener("DOMContentLoaded", () => {
    // 共通ヘッダー（タイトル差し替え）
    if (typeof loadHeader === "function") {
      loadHeader("カート一覧");
    }

    const mount = document.getElementById("cart-items-mount");
    const btnCancel = document.getElementById("btnCancel");
    const btnOrder = document.getElementById("btnOrder");

    // --- カートの読み書き（sessionStorage） ---
    function readCart() {
      try {
        const raw = sessionStorage.getItem("cart");
        if (!raw) return {};

        const parsed = JSON.parse(raw);

        return parsed;
      } catch (e) {
        console.error("Failed to read cart:", e);
        return {};
      }
    }

    // --- /api/orders へ発注履歴を登録 ---
    async function registerOrders(cartObj, datetime) {
      try {
        //const itemsMap = await fetchItemsMap();
        const orderItems = [];

        for (const [item_no, item] of Object.entries(cartObj)) {
          const pieces = Number(item.qty) || 0;
          if (pieces <= 0) continue; // 数量0はスキップ

          orderItems.push({ item_no, pieces });
        }

        if (orderItems.length === 0) {
          console.warn("registerOrders: 送信対象の明細がありません");
          return { ok: true, count: 0 };
        }

        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: orderItems,
            datetime: datetime
          })
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${t}`);
        }
        return await res.json();
      } catch (e) {
        console.error("/api/orders 登録失敗:", e);
        throw e;
      }
    }

    // --- 明細1行のHTML ---
    function rowHtml(item_no, item) {
      console.log("Generating row for item:", item_no, item);
      //const imgSrc = (itemInfo && itemInfo.image_url) ? itemInfo.image_url : "img/noImage.png";
      return `
        <article class="cart-item" item-no="${escapeHtml(item_no)}">
          <div class="cart-item__thumb">
            <img src="${item.img}" alt="${escapeHtml(item.name)}" />
          </div>
          <div class="cart-item__name">${escapeHtml(item.name)}</div>

          <div class="cart-item__qty">
            <button class="qty-btn" data-action="dec" aria-label="減らす">−</button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-action="inc" aria-label="増やす">＋</button>
          </div>

          <div class="cart-item__stock">${item.stock}</div>
          
          <button class="cart-item__delete" data-action="delete" aria-label="削除">
            <i class="bi bi-trash"></i>
          </button>
        </article>
      `;
    }

    // --- XSS対策 簡易エスケープ ---
    function escapeHtml(s) {
      return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    // --- 描画 ---
    async function render() {
      const cart = readCart();
      mount.innerHTML = "";

      if (Object.keys(cart).length === 0) {
        mount.innerHTML = `<p style="padding: 16px;">カートは空です。</p>`;
        return;
      }

      // DBからアイテム情報を全件取得
      let itemsFromDB = {};
      try {
        const res = await fetch("/api/items");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const items = await res.json();
        items.forEach(item => {
          itemsFromDB[item.item_no] = item;
        });
      } catch (e) {
        console.error("Failed to fetch items from DB:", e);
      }

      Object.entries(cart).forEach(([item_no, itemData]) => {
        const dbItem = itemsFromDB[item_no];
        // DBから取得したデータとセッションのqtyを結合
        const mergedData = {
          name: dbItem?.name ?? "",
          img: dbItem?.image_url ?? "img/noImage.png",
          qty: itemData.qty ?? 0,
          stock: dbItem?.stock ?? "",
          comp_name: dbItem?.company_name ?? dbItem?.conp_name ?? "",
        };
        mount.insertAdjacentHTML("beforeend", rowHtml(item_no, mergedData));
      });

      // すべての行の-ボタン状態を更新
      mount.querySelectorAll(".cart-item").forEach(row => {
        updateQtyButtonState(row);
      });
    }

    // --- 数量ボタンの表示状態を更新（-ボタンの有効/無効） ---
    function updateQtyButtonState(row) {
      const valueEl = row.querySelector(".qty-value");
      const qty = parseInt(valueEl.textContent || "0", 10);
      const decBtn = row.querySelector('button[data-action="dec"]');
      
      if (decBtn) {
        if (qty <= 1) {
          decBtn.disabled = true;
        } else {
          decBtn.disabled = false;
        }
      }
    }

    // --- 数量ボタン（イベント委譲） ---
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".qty-btn");
      if (!btn) return;

      const row = e.target.closest(".cart-item");
      const key = row.getAttribute("item-no");
      const valueEl = row.querySelector(".qty-value");
      let v = parseInt(valueEl.textContent || "0", 10);

      if (btn.dataset.action === "inc") v++;
      if (btn.dataset.action === "dec") v = Math.max(1, v - 1);

      valueEl.textContent = String(v);

      const cart = readCart();
      if (v === 0) {
        delete cart[key];
        row.remove();
      } else {
        let target = cart[String(key)];
        target.qty = v;

        // 更新後を再保存
        cart[String(key)] = target;
        sessionStorage.setItem("cart", JSON.stringify(cart));
      }

      // -ボタンの状態を更新
      updateQtyButtonState(row);

      if (mount.querySelectorAll(".cart-item").length === 0) {
        mount.innerHTML = `<p style="padding: 16px;">カートは空です。</p>`;
      }
    });

    // --- 削除ボタン（イベント委譲） ---
    document.addEventListener("click", (e) => {
      const deleteBtn = e.target.closest(".cart-item__delete");
      if (!deleteBtn) return;

      const row = e.target.closest(".cart-item");
      const key = row.getAttribute("item-no");

      const cart = readCart();
      delete cart[key];
      sessionStorage.setItem("cart", JSON.stringify(cart));

      row.remove();

      if (mount.querySelectorAll(".cart-item").length === 0) {
        mount.innerHTML = `<p style="padding: 16px;">カートは空です。</p>`;
      }
    });

    // テーブルPDFをサーバで作らせ、保存&ダウンロード
async function makeOrderTablePdf(rows, filename, orderedAt) {
  const res = await fetch("/api/pdf/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, ordered_at: orderedAt, rows })
  });
  console.log("makeOrderTablePdf response:", res);
  if (!res.ok) throw new Error("PDF生成に失敗");
  return true
}

    // --- キャンセル（前の画面へ戻る） ---
    btnCancel?.addEventListener("click", () => {
      window.location.href = "salon-order.html";
    });

    // --- 発注 ---
    btnOrder?.addEventListener("click", async () => {
      const cart = readCart();
      var now = new Date();
      var datetime =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");
      var filename = `ArtTheLine_在庫発注_${datetime}.pdf`;
      
      // DBからアイテム情報を取得
      let itemsFromDB = {};
      try {
        const res = await fetch("/api/items");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const items = await res.json();
        items.forEach(item => {
          itemsFromDB[item.item_no] = item;
        });
      } catch (e) {
        console.error("Failed to fetch items from DB:", e);
        alert("商品情報の取得に失敗しました");
        return;
      }

      const rows = [];
      Object.entries(cart).forEach(([item_no, itemData]) => {
        const dbItem = itemsFromDB[item_no];
        if (!dbItem) return;
        
        rows.push({
          name: dbItem.name || "",
          qty: itemData.qty || 0,
          comp_name: dbItem.company_name || dbItem.conp_name || ""
        });
      });

    // ★テーブルPDFを生成
    const orderedAt = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}`;
    await makeOrderTablePdf(rows, filename, orderedAt);


      //発注内容をDBへ登録
      var dbDate = new Date(now.getTime() - 9 * 60 * 60 * 1000);
      await registerOrders(cart, datetime)

      // 保存完了後にカートを空にして画面遷移
      sessionStorage.removeItem("cart");
      window.location.href = "order-complete.html?filename=" + encodeURIComponent(filename);
    });

    // 初回描画
    render();
  });
})();
