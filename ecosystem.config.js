module.exports = {
  apps: [
    {
      name: 'zips',
      script: 'app.js',
      // 本番起動コマンド: pm2 start ecosystem.config.js --env production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
        // DB接続情報は ~/zips/.env から dotenv 経由で読み込む
        // ecosystem.config.js には機密情報を書かない
      },
      // ログ設定
      error_file: '~/.pm2/logs/zips-error.log',
      out_file: '~/.pm2/logs/zips-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // クラッシュ時の自動再起動
      restart_delay: 1000,
      max_restarts: 10
    }
  ]
};
