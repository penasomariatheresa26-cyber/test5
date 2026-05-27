const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db.cjs');

// ============================================
// REGISTRATION ROUTE
// ============================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [columns] = await db.query('SHOW COLUMNS FROM users');
    const columnNames = columns.map(c => c.Field.toLowerCase());

    let queryFields = ['name', 'email', 'password'];
    let queryPlaceholders = ['?', '?', '?'];
    let queryParams = [name, email, hashedPassword];

    if (columnNames.includes('is_admin')) {
      queryFields.push('is_admin');
      queryPlaceholders.push('0'); 
    } else if (columnNames.includes('role')) {
      queryFields.push('role');
      queryPlaceholders.push("'customer'");
    }

    if (columnNames.includes('wallet_balance')) {
      queryFields.push('wallet_balance');
      queryPlaceholders.push('0.00');
    }

    const finalQuery = `INSERT INTO users (${queryFields.join(', ')}) VALUES (${queryPlaceholders.join(', ')})`;
    await db.query(finalQuery, queryParams);

    return res.status(201).json({ message: 'Registration successful!' });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

// ============================================
// LOGIN ROUTE (Strict Frontend Alignment)
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid Email or Password' });
    }

    const user = rows[0];

    // Safely compare raw string password with database hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid Email or Password' });
    }

    // Determine admin status across both structural variants
    const isAdminUser = user.is_admin === 1 || user.is_admin === true || String(user.is_admin) === 'true' || String(user.role).toLowerCase() === 'admin';

    // Returns both variations (isAdmin and is_admin) to prevent state mapping crashes on the UI
    return res.json({
      token: 'session-token-fulfilled',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_admin: isAdminUser,
        isAdmin: isAdminUser, 
        role: isAdminUser ? 'admin' : 'customer'
      }
    });
  } catch (error) {
    console.error('Login Server Error:', error);
    return res.status(500).json({ error: 'Server error during login' });
  }
});
