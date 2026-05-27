const express = require('express');
const router = express.Router();
const db = require('../db.cjs');

// 1. GET ALL ORDERS (Fetches records with items dynamically for the exact pages)
router.get('/', async (req, res) => {
  try {
    const { user_id, is_admin } = req.query;

    let orderSql = 'SELECT * FROM orders';
    const orderParams = [];
    if (is_admin !== 'true' && user_id) {
      orderSql += ' WHERE user_id = ?';
      orderParams.push(user_id);
    }
    orderSql += ' ORDER BY created_at DESC';

    // Use MySQL array destructuring [ordersRows] instead of .rows
    const [ordersRows] = await db.query(orderSql, orderParams);

    const orders = [];
    for (const row of ordersRows) {
      const [itemsRows] = await db.query(
        `SELECT oi.id, oi.quantity, oi.price,
                m.id as m_id, m.name as m_name, m.description as m_description,
                m.price as m_price, m.image as m_image, m.category as m_category,
                m.available as m_available, m.featured as m_featured
         FROM order_items oi
         LEFT JOIN menu_items m ON oi.menu_item_id = m.id
         WHERE oi.order_id = ?`,
        [row.id]
      );

      const items = itemsRows.map(i => ({
        menuItem: {
          id: i.m_id,
          name: i.m_name,
          description: i.m_description,
          price: parseFloat(i.m_price),
          image: i.m_image,
          category: i.m_category,
          available: !!i.m_available,
          featured: !!i.m_featured,
        },
        quantity: i.quantity,
        price: parseFloat(i.price),
      }));

      orders.push({
        id: row.id,
        customerName: row.customer_name,
        address: row.address,
        phone: row.phone,
        paymentMethod: row.payment_method,
        status: row.status,
        total: parseFloat(row.total),
        createdAt: row.created_at,
        items,
      });
    }

    res.json(orders);
  } catch (error) {
    console.error('[GET /api/orders]', error.message);
    res.status(500).json({ error: 'Failed to fetch orders from database' });
  }
});

// 2. POST ORDER (Saves orders and items cleanly into database records via transaction)
router.post('/', async (req, res) => {
  // Correct method to obtain a separate connection from the mysql2 pool
  const conn = await db.getConnection();
  try {
    // Start MySQL Transaction cleanly
    await conn.beginTransaction();

    const { id, user_id, customer_name, address, phone, payment_method, total, items } = req.body;
    const orderId = id || 'ORD-' + Date.now();

    // Insert into orders table
    await conn.query(
      'INSERT INTO orders (id, user_id, customer_name, address, phone, payment_method, status, total, created_at) VALUES (?,?,?,?,?,?,?,?,NOW())',
      [
        orderId,
        user_id,
        customer_name,
        address,
        phone,
        payment_method || 'cash-on-delivery',
        'pending',
        parseFloat(total),
      ]
    );

    // Loop through items and record dynamically
    for (const item of items) {
      const itemId = 'OI-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
      await conn.query(
        'INSERT INTO order_items (id, order_id, menu_item_id, quantity, price) VALUES (?,?,?,?,?)',
        [itemId, orderId, item.menuItem.id, item.quantity, parseFloat(item.menuItem.price)]
      );
    }

    // Commit changes to the database permanently
    await conn.commit();
    console.log(`[NEW ORDER LOGGED] ${orderId} → ₱${total} → MySQL`);

    // Return full order object so front-end dashboards refresh instantly
    res.status(201).json({
      id: orderId,
      user_id,
      customerName: customer_name,
      address,
      phone,
      paymentMethod: payment_method || 'cash-on-delivery',
      status: 'pending',
      total: parseFloat(total),
      createdAt: new Date().toISOString(),
      items: items.map(i => ({
        menuItem: i.menuItem,
        quantity: i.quantity,
        price: parseFloat(i.menuItem.price),
      })),
    });
  } catch (error) {
    // Rollback changes immediately if any query fails
    await conn.rollback();
    console.error('[POST /api/orders Transaction Failed]', error.message);
    res.status(500).json({ error: 'Failed to create database order record' });
  } finally {
    // Always release connection back to the pool
    conn.release();
  }
});

// 3. PUT ORDER STATUS (Updates status so exact status renders dynamically on user/admin pages)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    
    // Check if item exists using MySQL array destructuring
    const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    
    console.log(`[ORDER STATUS UPDATED] ${req.params.id} → ${status} → Live`);
    res.json(rows[0]);
  } catch (error) {
    console.error('[PUT /api/orders/:id/status]', error.message);
    res.status(500).json({ error: 'Failed to update order status record' });
  }
});

module.exports = router;
