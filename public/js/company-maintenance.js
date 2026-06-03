// 会社メンテ：一覧/検索/登録/編集/削除（インライン編集対応）
(function () {
  document.addEventListener("DOMContentLoaded", () => {
    if (typeof loadHeader === "function") loadHeader("会社メンテナンス画面");

    const $kw = $("#kw");
    const $btnFilter = $("#btnFilter");
    const $newName = $("#newName");
    const $btnCreate = $("#btnCreate");
    const $tbody = $("#gridBody");

    // ===== API =====
    async function apiList(keyword = "") {
      const q = keyword ? `?keyword=${encodeURIComponent(keyword)}` : "";
      const res = await fetch(`/api/companies${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json(); // [{ comp_no, comp_name }]
    }
    async function apiCreate(name) {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comp_name: name })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    }
    async function apiUpdate(no, name) {
      const res = await fetch(`/api/companies/${encodeURIComponent(no)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comp_name: name })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    }
    async function apiDelete(no) {
      const res = await fetch(`/api/companies/${no}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    }

    // ===== 表示 =====
    function trHtml(row) {
      const id = row.comp_no ?? "";
      const name = row.comp_name ?? "";
      return `
        <tr data-id="${id}">
          <td class="col-id">${escapeHtml(id)}</td>
          <td class="col-name" data-original="${escapeHtml(name)}">${escapeHtml(name)}</td>
          <td class="col-edit">
            <button class="action js-edit" title="編集">
              <i class="bi bi-pencil"></i>
            </button>
          </td>
          <td class="col-del">
            <button class="action js-del" title="削除">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }
    function render(list) {
      $tbody.empty();
      if (!list || list.length === 0) {
        $tbody.append(`<tr><td colspan="4" style="padding:22px;text-align:center;color:var(--muted);">データがありません</td></tr>`);
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

    $btnCreate.on("click", async () => {
      const name = $newName.val().trim();
      if (!name) { alert("会社名を入力してください。"); return; }
      try {
        await apiCreate(name);
        $newName.val("");
        const list = await apiList($kw.val().trim());
        render(list);
      } catch (e) {
        console.error(e);
        alert("新規登録に失敗しました。");
      }
    });

    // === ① 編集ボタン押下 → 会社名セルをインライン編集に ===
    $(document).on("click", ".js-edit", function () {
      const $tr = $(this).closest("tr");
      const $name = $tr.find(".col-name");

      // すでに別行が編集中なら、その編集をキャンセルしてから進める
      $(".editing").each(function () {
        const $eTr = $(this);
        const $eName = $eTr.find(".col-name");
        const original = $eName.attr("data-original") || $eName.text().trim();
        $eName.text(original);
        $eTr.removeClass("editing");
        const $eBtn = $eTr.find(".js-save");
        if ($eBtn.length) {
          $btn.removeClass("js-save wide").addClass("js-edit").attr("title", "編集")
            .html('<i class="bi bi-pencil"></i>');
        }
      });

      // 既にこの行が編集中なら何もしない
      if ($tr.hasClass("editing")) return;

      const current = $name.text().trim();
      $tr.addClass("editing");
      $name.attr("data-original", current);

      // 入力に切り替え
      $name.html(`
    <input type="text" class="inline-edit" value="${escapeHtml(current)}" />
  `);
      const $input = $name.find("input.inline-edit");
      $input.trigger("focus").get(0)?.select();

      // ② アイコンではなく「保存」という文字ボタンに変更
      const $btn = $tr.find(".js-edit");
      $btn.removeClass("js-edit").addClass("js-save wide").attr("title", "保存")
        .text("保存");
    });

    // === ③ 保存ボタン押下 → PUTで更新、表示に戻す ===
    $(document).on("click", ".js-save", async function () {
      const $tr = $(this).closest("tr");
      const id = $tr.data("id");
      const $name = $tr.find(".col-name");
      const $input = $name.find("input.inline-edit");
      const newVal = ($input.val() ?? "").toString().trim();

      if (!newVal) { alert("会社名は必須です。"); $input.trigger("focus"); return; }

      try {
        await apiUpdate(id, newVal);            // ← DB（PUT）更新
        $name.text(newVal);                     // ← 表示に戻す（編集不可状態）
        $tr.removeClass("editing");
        const $btn = $tr.find(".js-save");      // ← ボタンを✏️に戻す
        $btn.removeClass("js-save wide").addClass("js-edit").attr("title", "編集")
          .html('<i class="bi bi-pencil"></i>');
      } catch (e) {
        console.error(e);
        alert("更新に失敗しました。");
      }
    });


    // Enterで保存、Escでキャンセル
    $(document).on("keydown", "input.inline-edit", function (e) {
      const $tr = $(this).closest("tr");
      const $name = $tr.find(".col-name");

      if (e.key === "Escape") {
        // キャンセル（元の値へ戻す）
        const original = $name.attr("data-original") || "";
        $name.text(original);
        $tr.removeClass("editing");
        const $btn = $tr.find(".js-save");
        $btn.removeClass("js-save wide").addClass("js-edit").attr("title", "編集")
          .html('<i class="bi bi-pencil"></i>');
      }
      if (e.key === "Enter") {
        e.preventDefault();
        $tr.find(".js-save").trigger("click"); // ← 文字ボタンでも動作OK
      }
    });


    // 削除
    $(document).on("click", ".js-del", async function () {
      const $tr = $(this).closest("tr");
      const id = $tr.data("id");
      if (!confirm(`会社ID「${id}」を削除します。よろしいですか？`)) return;
      try {
        await apiDelete(id);
        const list = await apiList($kw.val().trim());
        render(list);
      } catch (e) {
        console.error(e);
        alert("削除に失敗しました。");
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
