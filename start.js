const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes linked to MySQL tables (adjust paths if routes are inside a /server folder)
app.use('/api/menu', require('./server/routes/menu.cjs'));
app.use('/api/orders', require('./server/routes/orders.cjs'));
app.use('/api/users', require('./server/routes/users.cjs'));

// Dynamic Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const db = require('./server/db.cjs');
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

// Initialize database tables and seed data automatically on startup
const initDb = require('./server/init-db.cjs');
initDb();

// Production Configuration: Serve React Build Files
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Clean catch-all syntax for modern path-to-regexp compilation
  app.get('(.*)', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  });
}

// Start Server Runtime
app.listen(PORT, () => {
  console.log(`🚀 Server running dynamically on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
});
