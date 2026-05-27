const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db.cjs'); // Adjust this path if your db configuration file is elsewhere

// ============================================
// 1. USER REGISTRATION ROUTE
// ============================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Hash the password securely using bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert statement with default values to prevent database crashes
    const query = "INSERT INTO users (name, email, password, role, wallet_balance) VALUES (?, ?, ?, 'customer', 0.00)";
    await db.query(query, [name, email, hashedPassword]);

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
// 2. USER LOGIN ROUTE
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Look up user by email
    const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'User does not exist' });
    }

    const user = rows[0];

    // Safely compare bcrypt strings to check password match
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password' });
    }

    // Matches your frontend interface format: AuthResponse { user, token }
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: user.role === 'admin' || user.role === 'ADMIN'
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
    const [rows] = await db.query('SELECT id, email, name, role, created_at FROM users');
    return res.json(rows);
  } catch (error) {
    console.error('Fetch Users Error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
