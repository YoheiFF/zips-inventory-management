// js/salon-order.js
$(function () {
  init();

  async function init() {
    await loadCategories();   // 先にカテゴリボタンを生成
    await loadItems();        // 次に商品一覧を描画
    loadHeader("発注画面");
    bindQuantityEvents();     // +/− のイベント
    bindCategoryFilter();     // カテゴリ切替
    loadCartFromSession();    // セッション復元
    updateCartCount();        // バッジ更新
  }

  // =========================
  // カテゴリ取得→ボタン動的生成
  // =========================
  async function loadCategories() {
    const $wrap = $("#category-tabs");
    if (!$wrap.length) return;
    $wrap.empty();

    // 先頭に「全て」
    $wrap.append(`<button class="category-button active" data-category-no="all">全て</button>`);

    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cats = await res.json();

      cats.forEach(c => {
        const no = c.category_no;
        const label = (c.category_name).trim();
        $wrap.append(
          `<button class="category-button" data-category-no="${no}">${escapeHtml(label)}</button>`
        );
      });
    } catch (e) {
      console.error("loadCategories failed:", e);
      alert("カテゴリの取得に失敗しました。");
    }
  }

  // ==== クリック（委譲） ====
  $("#category-tabs").on("click", ".category-button", function () {
    const no = String($(this).data("categoryNo") ?? $(this).attr("data-category-no"));
    console.log("Category selected:", no);
    setActiveCategory(no);
  });

  // ==== active を付け替え ====
  function setActiveCategory(no) {
    const $wrap = $("#category-tabs");
    $wrap.find(".category-button")
      .removeClass("active")
      .attr("aria-current", "false");

    const $btn = $wrap.find(`.category-button[data-category-no='${no}']`);
    if ($btn.length) {
      $btn.addClass("active").attr("aria-current", "true");
      sessionStorage.setItem("activeCategory", no);
      console.log("Active category set to:", no);
    }
  }

  // =========================
  // 商品取得→DOM描画
  // =========================
  async function loadItems() {
    try {
      const res = await fetch("/api/items");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = await res.json();

      const $container = $("#items-container"); // idで参照（HTML側でidを付与）
      $container.empty();

      items.forEach((item) => {
        // DBには画像ファイル名のみが入ってくる想定（例: "item_1.png"）
        console.log("Rendering item:", item);

        const html = `
    <div class="item" data-category-no="${item.category_no ?? ""}">
      <span class="cat-badge">${escapeHtml(item.category_name ?? "")}</span>
      <img src="${item.image_url}" alt="商品画像">
      <div class="item-name">${escapeHtml(item.name || "")}</div>
      <!-- 非表示項目：DB値（=ファイル名のみ）をそのまま保持 -->
      <input type="hidden" class="item-no" value="${escapeHtml(String(item.item_no ?? ""))}">
      <input type="hidden" class="item-name-hidden" value="${escapeHtml(item.name ?? "")}">
      <input type="hidden" class="item-img" value="${escapeHtml(item.image_url)}">
      <input type="hidden" class="item-amount" value="${escapeHtml(String(item.amount ?? ""))}">
      <input type="hidden" class="item-comp-no" value="${escapeHtml(String(item.comp_no ?? ""))}">
      <input type="hidden" class="item-comp-name" value="${escapeHtml(item.company_name ?? item.conp_name ?? "")}">
      <input type="hidden" class="item-category-no" value="${escapeHtml(String(item.category_no ?? ""))}">
      <input type="hidden" class="item-category-name" value="${escapeHtml(item.category_name ?? "")}">
      <input type="hidden" class="item-stock" value="${escapeHtml(item.stock ?? "")}">

      <div class="quantity">
        <button data-act="dec">-</button>
        <span class="quantity-value">0</span>
        <button data-act="inc">+</button>
      </div>
    </div>
  `;
        $container.append(html);
      });


      adjustPlaceholders(); // （必要なら）3列揃え用プレースホルダ
    } catch (e) {
      console.error("loadItems failed:", e);
      alert("商品一覧の取得に失敗しました。");
    }
  }

  // =========================
  // + / − ボタン
  // =========================
  function bindQuantityEvents() {
    $("#items-container").off("click", "button[data-act]").on("click", "button[data-act]", function () {
      const $val = $(this).siblings(".quantity-value");
      let n = parseInt($val.text(), 10) || 0;

      if ($(this).data("act") === "inc") n = Math.min(99, n + 1);
      if ($(this).data("act") === "dec") n = Math.max(0, n - 1);

      $val.text(n);
      updateCartCount();
    });
  }

  // =========================
  // カテゴリ切替（全て / 数値）
  // =========================
  function bindCategoryFilter() {
    $(document).off("click", ".category-button").on("click", ".category-button", function () {
      const selected = $(this).data("category-no"); // "all" または 数値
      const $items = $("#items-container .item");

      $items.hide();
      let $matched = $items;

      if (selected !== "all") {
        $matched = $items.filter((_, el) => String($(el).data("category-no")) === String(selected));
      }
      $matched.show();

      // プレースホルダ再調整
      $(".item.placeholder").remove();
      const visible = $matched.length;
      const rem = visible % 3;
      if (rem > 0) {
        for (let i = 0; i < 3 - rem; i++) {
          $("#items-container").append('<div class="item placeholder"></div>');
        }
      }
    });
  }

  // =========================
  // カート件数・セッション保存/復元

  // =========================
  function updateCartCount() {
    let total = 0;
    $("#items-container .quantity-value").each(function () {
      total += parseInt($(this).text(), 10) || 0;
    });
    $(".cart-count-badge").text(total);
  }

  function saveCartToSession() {
    const cart = {};
    $("#items-container .item").each(function () {
      var count = parseInt($(this).find(".quantity-value").text(), 10);
      if (count <= 0 || !count) return; // 0以下は無視
      const itemNo = $(this).find(".item-no").val()?.trim();
      const qty = parseInt($(this).find(".quantity-value").text(), 10) || 0;

      // sessionStorageにはitemNoとqtyのみを保持
      cart[itemNo] = { qty: qty };
    });
    sessionStorage.setItem("cart", JSON.stringify(cart));
    console.log("Cart saved to session:", JSON.stringify(cart));
  }

  async function loadCartFromSession() {
    const raw = sessionStorage.getItem("cart");
    console.log(raw);
    if (!raw) return;

    const cart = JSON.parse(raw);

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
      // エラー時は数量のみ復元
    }

    $("#items-container .item").each(function () {
      const $item = $(this);
      const itemNo = $item.find(".item-no").val()?.trim();
      const itemData = cart[itemNo];

      // セッションに該当商品があれば反映
      if (itemData !== undefined) {
        // 数量の表示
        $item.find(".quantity-value").text(itemData.qty ?? 0);

        // DBから取得したアイテム情報を反映
        const dbItem = itemsFromDB[itemNo];
        if (dbItem) {
          $item.find(".item-img").val(dbItem.image_url ?? "");
          $item.find(".item-amount").val(dbItem.amount ?? "");
          $item.find(".item-comp-no").val(dbItem.comp_no ?? "");
          $item.find(".item-comp-name").val(dbItem.company_name ?? dbItem.conp_name ?? "");
          $item.find(".item-category-no").val(dbItem.category_no ?? "");
          $item.find(".item-category-name").val(dbItem.category_name ?? "");
          $item.find(".item-stock").val(dbItem.stock ?? "");
        }
      }
    });
    updateCartCount(); // セッションからの復元後にカート数を更新
  }
  // カートボタンを監視
  $(document).on("click", ".cart-button", function (e) {
    e.preventDefault(); // すぐに遷移せず、まず保存
    saveCartToSession(); // 既存の関数（数量ごとにcartを保存）

    // 保存が終わったら画面遷移
    window.location.href = "cart.html";
  });

  // =========================
  // レイアウト調整（3列の穴埋め）
  // =========================
  function adjustPlaceholders() {
    $(".item.placeholder").remove();
    const count = $("#items-container .item").length;
    const rem = count % 3;
    if (rem > 0) {
      for (let i = 0; i < 3 - rem; i++) {
        $("#items-container").append('<div class="item placeholder"></div>');
      }
    }
  }

  // カートクリア
  function clearCart() {
    sessionStorage.removeItem("cart");
    console.log("Cart cleared from session.");
  }

  // =========================
  // ユーティリティ
  // =========================
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
});
