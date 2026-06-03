const pool = require("./db/mysql");

(async () => {
  try {
    const [rows] = await pool.query("SELECT NOW() AS now");
    console.log("✅ DB接続成功:", rows[0].now);
  } catch (err) {
    console.error("❌ DB接続失敗:", err.message);
  } finally {
    pool.end();
  }
})();
