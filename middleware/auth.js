// middleware/auth.js
/**
 * 認証ミドルウェア
 * ログインしていない場合はログイン画面にリダイレクト
 */
const requireAuth = (req, res, next) => {
  console.log('requireAuth check:', req.session && req.session.user ? req.session.user.isAuthenticated : 'no session');
  if (req.session && req.session.user && req.session.user.isAuthenticated) {
    next();
  } else {
    console.log('Redirecting to login');
    res.redirect('/login.html');
  }
};

/**
 * API認証チェックミドルウェア
 * ログインしていない場合は401エラーを返す
 */
const requireApiAuth = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.isAuthenticated) {
    next();
  } else {
    res.status(401).json({
      success: false,
      message: '認証が必要です。ログインしてください'
    });
  }
};

module.exports = {
  requireAuth,
  requireApiAuth
};
