const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();

// ★ MySQLプールを使うなら有効化（/db/ping で使用）
// const pool = require('./db/mysql');

app.set('trust proxy', 1); // nginxリバースプロキシを信頼
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || 'art_the_line_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // 本番HTTPS環境ではtrue
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24時間
  }
}));

// ミドルウェアのインポート
const { requireAuth, requireApiAuth } = require('./middleware/auth');

// --- API ルート ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/items', requireApiAuth, require('./routes/items'));
app.use('/api/categories', requireApiAuth, require('./routes/categories'));
app.use('/api/stocks', requireApiAuth, require('./routes/stock')); // stock.js
app.use('/api/companies', requireApiAuth, require('./routes/companies'));
app.use('/api/orders', requireApiAuth, require('./routes/orders'));
app.use('/api/pdf', requireApiAuth, require('./routes/pdf-order'));

// --- ログイン画面（認証不要） ---
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// --- ルート (/) で top.html を返す（認証チェック付き） ---
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'top.html'));
});

// --- 認証が必要な HTML ---
const protectedHtmlFiles = [
  'top.html',
  'item-maintenance.html',
  'category-maintenance.html',
  'company-maintenance.html',
  'salon-order.html',
  'cart.html',
  'order-complete.html',
  'order-history.html',
  'item-form.html'
];

protectedHtmlFiles.forEach((filename) => {
  app.get(`/${filename}`, requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', filename));
  });
});

app.get("/api/config", (req, res) => {
  res.json({});
});

// ★ 静的ファイル配信は最後（ここが重要）
// - これより上に置くと、未ログインでも salon-order.html が配信されてしまう可能性がある
app.use(express.static(path.join(__dirname, 'public')));

// --- サーバ起動 ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`http://localhost:${PORT} でサーバ起動中`);
});
