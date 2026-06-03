// 商品メンテ：一覧/検索/登録/編集/削除（インライン編集対応）
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof loadHeader === "function") loadHeader("商品メンテナンス画面");

    const $kw = $("#kw");
    const $btnFilter = $("#btnFilter");
    const $tbody = $("#gridBody");

    // ===== API =====
    async function apiList(keyword = "") {
      const q = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
      const res = await fetch(`/api/items/maintenance${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json(); 
    }

    // ===== 表示 =====
    function trHtml(row) {
      const id = row.item_no;
      const name = row.name;
      const image = row.image_url;
      const company = row.company_name;
      const category = row.category_name;
      const price = row.amount;
      const stock = row.stock;
      return `
        <tr data-id="${id}">
      <td class="col-image">
        ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" class="thumb" />` : ""}
      </td>
      <td class="col-product">${escapeHtml(name)}</td>
      <td class="col-company">${escapeHtml(company)}</td>
      <td class="col-category">${escapeHtml(category)}</td>
      <td class="col-price">${escapeHtml(price)}</td>
      <td class="col-stock">${escapeHtml(stock)}</td>
      <td class="col-edit">
            <button class="action js-edit" title="編集">
              <i class="bi bi-pencil"></i>
            </button>
          </td>
        </tr>
      `;
    }
    function render(list) {
      $tbody.empty();
      if (!list || list.length === 0) {
        $tbody.append(`<tr><td colspan="7" style="padding:22px;text-align:center;color:var(--muted);">データがありません</td></tr>`);
        return;
      }
      list.forEach(r => $tbody.append(trHtml(r)));
    }

    // ===== イベント =====
    $btnFilter.on("click", async () => {
      try {
        const list = await apiList($kw.val().trim());
        render(list);
      } catch (e) {
        console.error(e);
        alert("一覧の取得に失敗しました。");
      }
    });

    // 初期表示
    (async () => {
      try {
        const list = await apiList("");
        render(list);
      } catch (e) {
        console.error(e);
        render([]);
      }
    })();

  // 新規登録ボタン
  const btnCreate = document.getElementById("btnCreate");
  if (btnCreate) {
    btnCreate.addEventListener("click", () => {
      // 新規登録画面に遷移
      location.href = "item-form.html?mode=create";
    });
  }

document.addEventListener("click", (e) => {
  if (e.target.closest(".js-edit")) {
    const tr = e.target.closest("tr");
    const id = tr.getAttribute("data-id"); // 行のidを取得

    if (id) {
      // 編集モードでformへ遷移
      location.href = `item-form.html?mode=edit&id=${id}`;
    }
  }
});

// ページに戻ってきた時にリロード（キャッシュ対策）
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});


    // Utils
    function escapeHtml(s) {
      return String(s)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }
  });
})();
