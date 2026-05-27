const db = require('./db.cjs');
const bcrypt = require('bcryptjs'); // Needed to properly encrypt seed passwords

async function initDb() {
  try {
    console.log('Initializing MySQL database tables...');

    // 1. CREATE USERS TABLE 
    // Updated id to VARCHAR(50) to perfectly support uuidv4 tokens from your auth routes
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        wallet_balance DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. CREATE CATEGORIES TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. CREATE MENU ITEMS TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        image VARCHAR(500) NOT NULL,
        category VARCHAR(50) NOT NULL,
        available BOOLEAN DEFAULT TRUE,
        featured BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 4. CREATE ORDERS TABLE
    // Aligned user_id to VARCHAR(50) to cleanly match your users primary key data type
    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NULL,
        customer_name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        phone VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'cash-on-delivery',
        status VARCHAR(50) DEFAULT 'pending',
        total DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. CREATE ORDER ITEMS TABLE
    await db.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(50) PRIMARY KEY,
        order_id VARCHAR(50),
        menu_item_id VARCHAR(50),
        quantity INT NOT NULL DEFAULT 1,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Use native array destructuring [adminRows] instead of .rows
    const [adminRows] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      ['admin@restaurant.com']
    );

    // Seed default admin account if no record exists
    if (adminRows.length === 0) {
      // Securely hash the password string so your dynamic authentication handles it seamlessly
      const hashedAdminPassword = await bcrypt.hash('admin123', 10);

      await db.query(
        `
        INSERT INTO users 
        (id, name, email, password, role, wallet_balance) 
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        ['ADMIN-MAIN-SEED', 'Admin User', 'admin@restaurant.com', hashedAdminPassword, 'admin', 0.00]
      );
      console.log('👤 Default administrator account seeded safely into database.');
    }

    console.log('✅ MySQL database schema verified and fully ready');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
}

module.exports = initDb;
