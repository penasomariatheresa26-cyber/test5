const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Standard Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dynamic Path Resolution: Automatically checks if files are in root or the /server folder
const isServerFolder = fs.existsSync(path.join(__dirname, 'server'));

const menuRoute = isServerFolder ? './server/routes/menu.cjs' : './routes/menu.cjs';
const ordersRoute = isServerFolder ? './server/routes/orders.cjs' : './routes/orders.cjs';
const usersRoute = isServerFolder ? './server/routes/users.cjs' : './routes/users.cjs';
const dbFile = isServerFolder ? './server/db.cjs' : './db.cjs';
const initDbFile = isServerFolder ? './server/init-db.cjs' : './init-db.cjs';

// API Routes
app.use('/api/menu', require(menuRoute));
app.use('/api/orders', require(ordersRoute));
app.use('/api/users', require(usersRoute));

// Live Database Health Check
app.get('/api/health', async (req, res) => {
  try {
    const db = require(dbFile);
    const [rows] = await db.query('SELECT NOW() as time');
    res.json({ 
      status: 'ok', 
      database: 'connected', 
      serverTime: rows[0].time 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected', 
      error: error.message 
    });
  }
});

// Initialize database tables safely
try {
  const initDb = require(initDbFile);
  initDb();
} catch (err) {
  console.error('❌ Failed to initialize database template:', err.message);
}

// Production Configuration: Serve Frontend Build Files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  /**
   * 💡 FIX: Pure RegExp literal structure (/.*/)
   * This completely bypasses 'path-to-regexp' string parsing.
   * It is 100% immune to Express 5 wildcard compilation crashes.
   */
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  });
}

// Start Server Runtime
app.listen(PORT, () => {
  console.log(`🚀 Server running cleanly on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});
