const bcrypt = require('bcrypt'); // Make sure this is at the top of your file
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db.cjs');
const { v4: uuidv4 } = require('uuid');

// Then pass `hashedPassword` into your database query instead of the plain `password`

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

// 1. FETCH & SHOW ALL USERS
router.get('/', async (req, res) => {
  try {
    // Destructuring [rows] directly ensures compatibility with mysql2
    const [rows] = await db.query(`
      SELECT 
        id,
        name,
        email,
        role,
        wallet_balance,
        created_at,
        CASE WHEN role = 'admin' THEN true ELSE false END AS is_admin
      FROM users
      ORDER BY created_at DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('[get /api/users]', error.message);
    res.status(500).json({ error: 'failed to fetch users from database' });
  }
});

// 2. REGISTER USER (Records dynamically to database)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'all fields are required' });
    }

    // Verify existing user records
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'email already exists' });
    }

    // Generate dynamic values (UUID and secure Hash)
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    // Save record to database
    await db.query(
     const query = "INSERT INTO users (name, email, password, role, wallet_balance) VALUES (?, ?, ?, 'customer', 0.00)";
      [userId, name, email.toLowerCase(), passwordHash]
    );

    // Fetch the newly created record
    const [created] = await db.query(
      `SELECT 
         id, name, email, role, wallet_balance, created_at,
         CASE WHEN role = 'admin' THEN true ELSE false END AS is_admin
       FROM users
       WHERE id = ?`,
      [userId]
    );

    const user = created[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: !!user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, isAdmin: !!user.is_admin },
      token,
    });
  } catch (error) {
    console.error('[post /api/users/register]', error.message);
    res.status(500).json({ error: 'registration failed' });
  }
});

// 3. LOGIN USER (Runs live validation against database records)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const [rows] = await db.query(
      `SELECT 
         id, name, email, password, role, wallet_balance, created_at,
         CASE WHEN role = 'admin' THEN true ELSE false END AS is_admin
       FROM users
       WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'no account found with this email' });
    }

    const user = rows[0];

    // Strictly verify encrypted database strings (no hardcoded plaintext bypasses)
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'incorrect password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: !!user.is_admin },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, email: user.email, name: user.name, isAdmin: !!user.is_admin },
      token,
    });
  } catch (error) {
    console.error('[post /api/users/login]', error.message);
    res.status(500).json({ error: 'login failed' });
  }
});

// 4. UPDATE USER ROLE DYNAMICALLY
router.put('/:id/admin', async (req, res) => {
  try {
    const role = req.body.is_admin ? 'admin' : 'user';
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

    const [rows] = await db.query(
      `SELECT id, name, email, role, wallet_balance, created_at,
       CASE WHEN role = 'admin' THEN true ELSE false END AS is_admin
       FROM users WHERE id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'user not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('[put /api/users/:id/admin]', error.message);
    res.status(500).json({ error: 'failed to update user' });
  }
});

// 5. DELETE USER RECORD
router.delete('/:id', async (req, res) => {
  try {
    const [check] = await db.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (check.length === 0) return res.status(404).json({ error: 'user not found' });

    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'user record successfully deleted from database' });
  } catch (error) {
    console.error('[delete /api/users/:id]', error.message);
    res.status(500).json({ error: 'failed to delete user' });
  }
});

module.exports = router;
