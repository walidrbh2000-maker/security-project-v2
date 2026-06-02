const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'mysql',
  port: parseInt(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

const connectWithRetry = async (retries = 15, delay = 4000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await pool.getConnection();
      console.log('✅ MySQL connected successfully');
      conn.release();
      return;
    } catch (err) {
      console.log(`⏳ MySQL attempt ${i + 1}/${retries} failed (${err.message}). Retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('❌ Cannot connect to MySQL after all retries');
};

module.exports = { pool, connectWithRetry };
