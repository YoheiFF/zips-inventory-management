// ===== Loading Overlay Control =====
let __loadingCounter = 0;

function showLoading() {
  const el = document.getElementById("loadingOverlay");
  if (!el) return;
  __loadingCounter++;
  el.classList.add("is-active");
  el.setAttribute("aria-hidden", "false");
}

function hideLoading(force = false) {
  const el = document.getElementById("loadingOverlay");
  if (!el) return;

  if (force) __loadingCounter = 0;
  else __loadingCounter = Math.max(0, __loadingCounter - 1);

  if (__loadingCounter === 0) {
    el.classList.remove("is-active");
    el.setAttribute("aria-hidden", "true");
  }
}

// ===== リンククリックで表示（ページ遷移） =====
document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a) return;

  // 新規タブ系は除外
  if (a.target === "_blank") return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

  const href = a.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

  showLoading();
});

// ===== フォーム送信で表示 =====
document.addEventListener("submit", () => {
  showLoading();
});

// ===== fetch をフック：通信中だけ表示 =====
const __origFetch = window.fetch;
window.fetch = async function (...args) {
  showLoading();
  try {
    return await __origFetch.apply(this, args);
  } finally {
    hideLoading();
  }
};

// ===== jQuery Ajax を使ってる場合（あなたのプロジェクトは使ってるのでON推奨） =====
if (window.jQuery) {
  $(document).ajaxStart(() => showLoading());
  $(document).ajaxStop(() => hideLoading(true));
  $(document).ajaxError(() => hideLoading(true));
}

// ===== 戻るボタン等で残るのを防止 =====
window.addEventListener("pageshow", () => {
  hideLoading(true);
});

// ===== Header Loader（あなたの既存処理 + ローディング連動） =====
async function loadHeader(titleText) {
  try {
    showLoading(); // ★追加（header読み込み中に表示）
    const res = await fetch("header.html");
    const html = await res.text();
    document.getElementById("header-container").innerHTML = html;

    // タイトルをページごとに差し替え
    document.getElementById("page-title").textContent = titleText;

    // ユーザー名を表示
    await displayUserName();
  } catch (e) {
    console.error("ヘッダー読込エラー:", e);
  } finally {
    hideLoading(); // ★追加
  }
}

/**
 * ユーザー名を表示
 */
async function displayUserName() {
  try {
    const response = await fetch('/api/auth/check', {
      credentials: 'same-origin'
    });
    const data = await response.json();
    if (data.authenticated && data.user) {
      const userNameElement = document.getElementById('user-name');
      if (userNameElement) {
        userNameElement.textContent = "ログイン：" + data.user.userName + " 様";
      }
    }
  } catch (error) {
    console.error('Failed to fetch user name:', error);
  }
}

/**
 * ログアウト処理
 */
window.handleLogout = async function() {
  if (confirm('ログアウトしてよろしいですか？')) {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });

      if (response.ok) {
        // ログイン画面にリダイレクト
        window.location.href = '/login.html';
      } else {
        alert('ログアウト処理に失敗しました');
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('ログアウト処理中にエラーが発生しました');
    }
  }
};