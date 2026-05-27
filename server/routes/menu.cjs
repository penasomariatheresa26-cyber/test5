const express = require('express');
const router = express.Router();
const db = require('../db.cjs');
const { v4: uuidv4 } = require('uuid');

// 1. FETCH & SHOW ALL MENU ITEMS (Database Only)
router.get('/', async (req, res) => {
  try {
    // Ensure the table exists before querying to avoid database crashes
    await db.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image VARCHAR(255),
        category VARCHAR(100),
        available TINYINT(1) DEFAULT 1,
        featured TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Fetch live records from database
    const [rows] = await db.query('SELECT * FROM menu_items ORDER BY created_at DESC');
    
    // Normalize properties for the frontend map functions
    const formattedRows = rows.map(item => ({
      ...item,
      id: String(item.id),
      price: parseFloat(item.price) || 0.00,
      image: item.image || '',
      image_url: item.image || '' // Maps both field types just in case
    }));

    res.json(formattedRows);
  } catch (err) {
    console.error('[GET /api/menu] Live Database Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch menu items from database' });
  }
});

// 2. FETCH A SINGLE MENU ITEM BY ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    
    const item = rows[0];
    res.json({
      ...item,
      id: String(item.id),
      price: parseFloat(item.price) || 0.00,
      image_url: item.image || ''
    });
  } catch (err) {
    console.error('[GET /api/menu/:id]', err.message);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// 3. ADD NEW MENU ITEM
router.post('/', async (req, res) => {
  try {
    const { name, description, price, image, category, available, featured } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4(); 
    const isAvailable = available !== undefined ? (available ? 1 : 0) : 1;
    const isFeatured = featured !== undefined ? (featured ? 1 : 0) : 0;

    await db.query(
      `INSERT INTO menu_items (id, name, description, price, image, category, available, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, description, parseFloat(price), image || '', category, isAvailable, isFeatured]
    );

    const [rows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);
    res.status(201).json({ success: true, item: rows[0] });
  } catch (err) {
    console.error('[POST /api/menu]', err.message);
    res.status(500).json({ error: 'Failed to save menu item to database' });
  }
});

// 4. UPDATE MENU ITEM DYNAMICALLY
router.put('/:id', async (req, res) => {
  try {
    const { name, description, price, image, category, available, featured } = req.body;
    const itemId = req.params.id;

    const [check] = await db.query('SELECT id FROM menu_items WHERE id = ?', [itemId]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const isAvailable = available !== undefined ? (available ? 1 : 0) : 1;
    const isFeatured = featured !== undefined ? (featured ? 1 : 0) : 0;

    await db.query(
      `UPDATE menu_items 
       SET name = ?, description = ?, price = ?, image = ?, category = ?, available = ?, featured = ?
       WHERE id = ?`,
      [name, description, parseFloat(price), image || '', category, isAvailable, isFeatured, itemId]
    );

    const [updatedRows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [itemId]);
    res.json({ success: true, item: updatedRows[0] });
  } catch (err) {
    console.error('[PUT /api/menu/:id]', err.message);
    res.status(500).json({ error: 'Failed to update database record' });
  }
});

// 5. DELETE MENU ITEM
router.delete('/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    
    const [check] = await db.query('SELECT id FROM menu_items WHERE id = ?', [itemId]);
    if (check.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await db.query('DELETE FROM menu_items WHERE id = ?', [itemId]);
    res.json({ success: true, message: 'Menu item record permanently deleted from database' });
  } catch (err) {
    console.error('[DELETE /api/menu/:id]', err.message);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

module.exports = router;
