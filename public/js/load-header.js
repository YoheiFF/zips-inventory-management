// ===== Header Loader =====
async function loadHeader(titleText) {
  try {
    const res = await fetch("header.html");
    const html = await res.text();
    document.getElementById("header-container").innerHTML = html;

    document.getElementById("page-title").textContent = titleText;

    await displayUserName();
  } catch (e) {
    console.error("ヘッダー読込エラー:", e);
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