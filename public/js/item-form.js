(function () {
  document.addEventListener("DOMContentLoaded", () => {
    // ====== ユーティリティ ======
    const qs = new URLSearchParams(location.search);
    const mode = (qs.get("mode") || "create").toLowerCase(); // 'create' or 'edit'
    const id = qs.get("id"); // edit時のみ

    // 画像バリデーション／リサイズ設定
    const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
    const MAX_FILE_SIZE = 5 * 1024 * 1024;  // 5MB（リサイズ前でもOK）
    const RESIZE_MAX_W = 1200;
    const RESIZE_MAX_H = 1200;

    const $btnSubmit = $("#btnSubmit");
    const $btnDelete = $("#btnDelete");
    const $btnBack = $("#btnBack");

    const $name = $("#itemName");
    const $company = $("#companySelect");
    const $category = $("#categorySelect");
    const $price = $("#price");
    const $stock = $("#stock");

    const $imageInput = $("#imageInput");
    const $imagePreview = $("#imagePreview");

    // 画像選択の状態
    let selectedImageFile = null;     // 元ファイル
    let selectedImageDataUrl = null;  // サーバ送信用DataURL


    // ====== APIダミー（実プロジェクトに合わせてURLを調整） ======
    async function apiGetCompanies() {
      const res = await fetch("/api/companies");
      if (!res.ok) throw new Error("companies load failed");
      return await res.json();
    }
    async function apiGetCategories() {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("categories load failed");
      return await res.json();
    }
    async function apiGetProduct(itemId) {
      const res = await fetch(`/api/items/${encodeURIComponent(itemId)}`);
      if (!res.ok) throw new Error("product load failed");
      return await res.json(); // { id, name, company_no, category_id, price, stock, imageUrl? }
    }
    async function apiCreateProduct(payload) {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("create failed");
      return await res.json();
    }
    async function apiUpdateProduct(itemId, payload) {
      const res = await fetch(`/api/items/${encodeURIComponent(itemId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("update failed");
      return await res.json();
    }
    async function apiDeleteProduct(itemId) {
      const res = await fetch(`/api/items/${encodeURIComponent(itemId)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("delete failed");
      return await res.json();
    }

    // ====== 初期UI：モードによる切替 ======
    function setupMode() {
      if (mode === "edit") {
        loadHeader("商品詳細画面");
        $btnSubmit.text("更新");
        $btnDelete.show();
      } else {
        loadHeader("商品新規登録画面");
        $btnSubmit.text("登録");
        $btnDelete.hide();
      }
    }

    // ====== マスタ読込（会社/カテゴリ） ======
    async function loadMasters() {
      const [companies, categories] = await Promise.all([
        apiGetCompanies(),
        apiGetCategories()
      ]);
      // 会社
      $company.empty().append(`<option value="">会社を選択</option>`);
      companies.forEach(c => {
        $company.append(`<option value="${c.comp_no}">${escapeHtml(c.comp_name)}</option>`);
      });
      // カテゴリ
      $category.empty().append(`<option value="">カテゴリを選択</option>`);
      categories.forEach(cat => {
        $category.append(`<option value="${cat.category_no}">${escapeHtml(cat.category_name)}</option>`);
      });
    }

    // ====== 既存データを反映（編集時） ======
    async function loadProductIfEdit() {
      if (mode !== "edit" || !id) return;
      const data = await apiGetProduct(id);
      $name.val(data.name ?? "");
      $company.val(data.comp_no ?? "");
      $category.val(data.category_no ?? "");
      $price.val(data.amount ?? "");
      $stock.val(data.pieces ?? "");

      if (data.image_url) {
        $imagePreview.css({
          backgroundImage: `url('${data.image_url}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "transparent"
        }).text(" ");
      }
    }

    // プレビューエリアクリックでファイル選択ダイアログを開く
    $imagePreview.on("click", () => {
      $imageInput.trigger("click");
    });

    async function fileToDataUrlResized(file, maxW, maxH) {
      const blobUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = blobUrl;
      await img.decode();

      let { width, height } = img;
      const scale = Math.min(1, maxW / width, maxH / height); // 縮小のみ
      if (scale < 1) {
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      const outType = ALLOWED_TYPES.has(file.type) ? file.type : "image/jpeg";
      const dataUrl = canvas.toDataURL(outType, 0.92); // 画質92%
      URL.revokeObjectURL(blobUrl);
      return dataUrl;
    }

    $imageInput.on("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!ALLOWED_TYPES.has(file.type)) {
        alert("画像形式は JPEG/PNG/GIF/WEBP のみ対応です。");
        $imageInput.val("");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        console.warn("selected image is large:", file.size, "bytes");
      }

      try {
        selectedImageFile = file;
        selectedImageDataUrl = await fileToDataUrlResized(file, RESIZE_MAX_W, RESIZE_MAX_H);

        $imagePreview.css({
          backgroundImage: `url('${selectedImageDataUrl}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          color: "transparent"
        }).text(" ");
      } catch (err) {
        console.error("image load/resize failed:", err);
        alert("画像の読み込みに失敗しました。別のファイルをお試しください。");
        selectedImageFile = null;
        selectedImageDataUrl = null;
        $imageInput.val("");
      }
    });

    // ====== 登録/更新ボタン ======
    $btnSubmit.on("click", async () => {
      // 文字/数値系
      const payload = {
        name: ($name.val() ?? "").toString().trim(),
        company_no: $company.val(),
        category_id: $category.val(),
        price: Number($price.val() || 0),
        stock: Number($stock.val() || 0),
      };

      // 入力チェック
      if (!payload.name) { alert("商品名は必須です"); return; }
      if (!payload.company_no) { alert("会社を選択してください"); return; }
      if (!payload.category_id) { alert("カテゴリを選択してください"); return; }

      // 画像を payload に“詰める”だけ（アップロードはまだしない）
      // 1) ファイルメタ情報
      if (selectedImageFile) {
        payload.image = {
          name: selectedImageFile.name,
          type: selectedImageFile.type,
          size: selectedImageFile.size,
        };
      }

      // 画像（選択時のみ送信）→ サーバ側でS3に保存
      if (selectedImageDataUrl) {
        payload.imageDataUrl = selectedImageDataUrl;
      }
      // 編集時：未選択なら既存画像を維持
      if ((mode === "edit")) {
        payload.image_action = selectedImageDataUrl ? "replace" : "keep";
      }


      try {
        if (mode === "edit" && id) {
          await apiUpdateProduct(id, payload);
          alert("更新しました");
          location.replace("item-maintenance.html"); // 一覧のパスに合わせて
        } else {
          const res = await apiCreateProduct(payload);
          alert("登録しました");
          location.replace("item-maintenance.html"); // 一覧のパスに合わせて
        }
      } catch (e) {
        console.error(e);
        alert("保存に失敗しました");
      }
    });


    // ====== 削除ボタン（編集時のみ） ======
    $btnDelete.on("click", async () => {
      if (!(mode === "edit" && id)) return;
      if (!confirm("削除します。よろしいですか？")) return;
      try {
        await apiDeleteProduct(id);
        alert("削除しました");
        location.replace("item-maintenance.html"); // 一覧のパスに合わせて

        //history.back();
      } catch (e) {
        console.error(e);
        alert("削除に失敗しました");
      }
    });

    // ====== 戻る ======
    $btnBack.on("click", () => history.back());

    // ====== 起動シーケンス ======
    (async () => {
      setupMode();
      await loadMasters();
      await loadProductIfEdit();
    })();

    // ====== 共通 ======
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
