const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Uses the pure JS library we installed
const db = require('../db.cjs');

// ============================================
// 1. USER REGISTRATION ROUTE (Adaptive Schema)
// ============================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Hash password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 1. DYNAMICALLY DETECT COLUMNS TO PREVENT ANY SQL CRASHES
    const [columns] = await db.query('SHOW COLUMNS FROM users');
    const columnNames = columns.map(c => c.Field.toLowerCase());

    let queryFields = ['name', 'email', 'password'];
    let queryPlaceholders = ['?', '?', '?'];
    let queryParams = [name, email, hashedPassword];

    // Check if table uses 'is_admin' or 'role'
    if (columnNames.includes('is_admin')) {
      queryFields.push('is_admin');
      queryPlaceholders.push('0'); // Default to regular user
    } else if (columnNames.includes('role')) {
      queryFields.push('role');
      queryPlaceholders.push("'customer'");
    }

    // Check if table has a wallet balance column
    if (columnNames.includes('wallet_balance')) {
      queryFields.push('wallet_balance');
      queryPlaceholders.push('0.00'); // Default balance
    }

    // Build and execute the custom query based on your actual database state
    const finalQuery = `INSERT INTO users (${queryFields.join(', ')}) VALUES (${queryPlaceholders.join(', ')})`;
    await db.query(finalQuery, queryParams);

    return res.status(201).json({ message: 'Registration successful!' });
  } catch (error) {
    console.error('Registration Error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    return res.status(500).json({ error: 'Registration failed due to a server error' });
  }
});

// ============================================
// 2. USER LOGIN ROUTE (Flexible Mapping)
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'User does not exist' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    // Safely checks both column possibilities for admin status
    const isAdmin = user.is_admin === 1 || user.is_admin === true || user.is_admin === 'true' || user.role === 'admin' || user.role === 'ADMIN';

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: isAdmin
      },
      token: 'session-token-fulfilled'
    });
  } catch (error) {
    console.error('Login Server Error:', error);
    return res.status(500).json({ error: 'Login failed due to a server error' });
  }
});

// ============================================
// 3. GET ALL USERS ROUTE
// ============================================
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM users');
    
    const formattedRows = rows.map(user => {
      const isAdmin = user.is_admin === 1 || user.is_admin === true || user.role === 'admin';
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        is_admin: isAdmin,
        created_at: user.created_at || new Date().toISOString()
      };
    });

    return res.json(formattedRows);
  } catch (error) {
    console.error('Fetch Users Error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
