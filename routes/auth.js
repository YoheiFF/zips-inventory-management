// routes/auth.js
const express = require('express');
const router = express.Router();
const pool = require('../db/mysql');

// ログイン処理
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // 入力値の検証
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'ユーザー名とパスワードを入力してください'
    });
  }

  try {
    // DBからユーザー情報を取得
    const [rows] = await pool.query(
      'SELECT user_id, login_id, password, user_name, role FROM AL_M_USER WHERE login_id = ? AND delete_flag = ?',
      [username, '0']
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'ユーザー名またはパスワードが不正です'
      });
    }

    const user = rows[0];

    // パスワード検証
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'ユーザー名またはパスワードが不正です'
      });
    }

    // セッション作成
    req.session.user = {
      userId: user.user_id,
      loginId: user.login_id,
      userName: user.user_name,
      role: user.role,
      loginTime: new Date(),
      isAuthenticated: true
    };

    return res.json({
      success: true,
      message: 'ログインしました'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'ログイン処理中にエラーが発生しました'
    });
  }
});

// ログアウト処理
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'ログアウト処理中にエラーが発生しました'
      });
    }
    // セッションクッキーをクリア
    res.clearCookie('connect.sid');
    res.json({
      success: true,
      message: 'ログアウトしました'
    });
  });
});

// 認証状態確認
router.get('/check', (req, res) => {
  if (req.session && req.session.user && req.session.user.isAuthenticated) {
    res.json({
      authenticated: true,
      user: req.session.user
    });
  } else {
    res.json({
      authenticated: false
    });
  }
});

module.exports = router;
