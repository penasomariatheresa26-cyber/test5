const express = require('express');
const router = express.Router();
const db = require('../db.cjs');
const { v4: uuidv4 } = require('uuid');

// GET all menu items
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM menu_items ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('[GET /menu]', err.message);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// ADD new menu item
router.post('/', async (req, res) => {
  try {
    const { name, description, price, image, category, available, featured } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4(); // generate unique ID for menu item

    await db.query(
      `INSERT INTO menu_items 
       (id, name, description, price, image, category, available, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        description,
        price,
        image || '',       // default empty string if no image
        category,
        available !== undefined ? available : true,
        featured !== undefined ? featured : false
      ]
    );

    // fetch the inserted item to confirm
    const [rows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);

    res.status(201).json({ success: true, item: rows[0] });
  } catch (err) {
    console.error('[POST /menu]', err.message);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

module.exports = router;
