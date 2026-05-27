const express = require('express');
const router = express.Router();
const db = require('../db.cjs');
const { v4: uuidv4 } = require('uuid');

// 1. FETCH & SHOW ALL MENU ITEMS
// This pulls live records to display directly on your menu/shop pages
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM menu_items ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/menu]', err.message);
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
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /api/menu/:id]', err.message);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// 3. ADD NEW MENU ITEM
// Dynamically saves new features/items directly to your database records
router.post('/', async (req, res) => {
  try {
    const { name, description, price, image, category, available, featured } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4(); // Generate unique ID for the new record

    // Convert booleans safely for MySQL TINYINT columns (1 = true, 0 = false)
    const isAvailable = available !== undefined ? (available ? 1 : 0) : 1;
    const isFeatured = featured !== undefined ? (featured ? 1 : 0) : 0;

    await db.query(
      `INSERT INTO menu_items 
       (id, name, description, price, image, category, available, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name,
        description,
        parseFloat(price), // Ensure price is handled as a decimal/float
        image || '',       
        category,
        isAvailable,
        isFeatured
      ]
    );

    // Confirm the record was created successfully
    const [rows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [id]);

    res.status(201).json({ success: true, item: rows[0] });
  } catch (err) {
    console.error('[POST /api/menu]', err.message);
    res.status(500).json({ error: 'Failed to save menu item to database' });
  }
});

// 4. UPDATE MENU ITEM DYNAMICALLY
// Modifies database records so changes display instantly on the exact pages
router.put('/:id', async (req, res) => {
  try {
    const { name, description, price, image, category, available, featured } = req.body;
    const itemId = req.params.id;

    // Check if the item exists first
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

    // Fetch updated record to return to front-end
    const [updatedRows] = await db.query('SELECT * FROM menu_items WHERE id = ?', [itemId]);
    res.json({ success: true, item: updatedRows[0] });
  } catch (err) {
    console.error('[PUT /api/menu/:id]', err.message);
    res.status(500).json({ error: 'Failed to update database record' });
  }
});

// 5. DELETE MENU ITEM
// Completely removes item data from the database
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
