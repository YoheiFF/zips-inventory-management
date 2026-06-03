// public/js/auth-check.js
/**
 * クライアント側の認証チェック
 * ページ読み込み時に認証状態を確認し、
 * ログインしていない場合はログイン画面にリダイレクト
 */

(async function checkAuthentication() {
  try {
    const response = await fetch('/api/auth/check', {
      credentials: 'same-origin'
    });
    const data = await response.json();

    if (!data.authenticated) {
      // ログインしていない場合、ログイン画面にリダイレクト
      window.location.href = '/login.html';
    }
  } catch (error) {
    console.error('Authentication check failed:', error);
    // エラーの場合もログイン画面にリダイレクト
    window.location.href = '/login.html';
  }
})();
