const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

function createPoolConfig() {
  // Automatically detects cloud database URLs (like Aiven/Render connection strings)
  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

  if (dbUrl) {
    const url = new URL(dbUrl);

    return {
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace('/', ''),
      ssl: { rejectUnauthorized: false }, // Necessary for cloud databases
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };
  }

  // Fallback to separate environment variables
  const host = process.env.DB_HOST || process.env.MYSQL_HOST;
  const port = process.env.DB_PORT || process.env.MYSQL_PORT;
  const user = process.env.DB_USER || process.env.MYSQL_USER;
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD;
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE;

  if (!host || !user || !password || !database) {
    console.error('❌ No database configuration found in environment variables.');
    return null;
  }

  return {
    host,
    port: Number(port || 3306),
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

function getPool() {
  if (!pool) {
    const config = createPoolConfig();

    if (!config) {
      throw new Error('Database configuration initialization failed.');
    }

    pool = mysql.createPool(config);
  }

  return pool;
}

/**
 * Executes a standard MySQL query.
 * Returns native array format to perfectly support: const [rows] = await db.query(...)
 */
async function query(sql, params = []) {
  const p = getPool();
  return p.query(sql, params);
}

/**
 * Optional alternative optimized for prepared statements
 */
async function execute(sql, params = []) {
  const p = getPool();
  return p.execute(sql, params);
}

/**
 * Gets a dedicated individual connection from the pool.
 * Used for secure transactions: beginTransaction(), commit(), rollback()
 */
async function getConnection() {
  const p = getPool();
  return p.getConnection();
}

// Tests the database configuration immediately on startup
async function testConnection() {
  try {
    const p = getPool();
    if (!p) return false;

    const conn = await p.getConnection();
    await conn.ping();
    conn.release(); // Return connection back to the pool

    console.log('✅ Connected to MySQL database system successfully.');
    return true;
  } catch (error) {
    console.error('❌ MySQL database connection error:', error.message);
    return false;
  }
}

// Run connection diagnostic check
testConnection();

module.exports = {
  query,
  execute,
  getConnection,
  getPool
};
