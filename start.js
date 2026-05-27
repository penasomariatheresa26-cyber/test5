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

// API Routes linked to dynamic MySQL tables
app.use('/api/menu', require('./routes/menu.cjs'));
app.use('/api/orders', require('./routes/orders.cjs'));
app.use('/api/users', require('./routes/users.cjs'));

// Dynamic Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const db = require('./db.cjs');
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
const initDb = require('./init-db.cjs');
initDb();

// Production Configuration: Serve React Build Files
if (process.env.NODE_ENV === 'production') {
  // Serve static assets from your build directory
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // FIXED: Changed string '*' to regex literal /.*/ to prevent Express 5 / path-to-regexp crash
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Start Server Runtime
app.listen(PORT, () => {
  console.log(`🚀 Server running dynamically on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: MySQL ${process.env.DATABASE_URL ? '(Aiven/Cloud)' : process.env.DB_HOST ? '(Custom)' : 'NOT CONFIGURED'}`);
});
