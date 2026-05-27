const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Determine folder structure cleanly
const isServerFolder = fs.existsSync(path.join(__dirname, 'server'));
const baseFolder = isServerFolder ? path.join(__dirname, 'server') : __dirname;

console.log(`[System Info] Base folder resolved to: ${baseFolder}`);

// Create empty fallback routers so app.use NEVER receives 'undefined' and crashes
let menuRouter = express.Router();
let userRouter = express.Router();
let ordersRouter = express.Router();

// ========================================================
// SAFE ROUTE LOADING (CRASH-PROOF)
// ========================================================

// 1. Load Menu Router
try {
  const targetPath = path.join(baseFolder, 'routes', 'menu.cjs');
  console.log(`[Loading Route] Attempting to require: ${targetPath}`);
  menuRouter = require(targetPath);
} catch (err) {
  console.error('[CRITICAL] Failed to load menu.cjs:', err.message);
}

// 2. Load Users Router
try {
  const targetPath = path.join(baseFolder, 'routes', 'users.cjs');
  console.log(`[Loading Route] Attempting to require: ${targetPath}`);
  userRouter = require(targetPath);
} catch (err) {
  console.error('[CRITICAL] Failed to load users.cjs:', err.message);
}

// 3. Load Orders Router
try {
  const targetPath = path.join(baseFolder, 'routes', 'orders.cjs');
  console.log(`[Loading Route] Attempting to require: ${targetPath}`);
  ordersRouter = require(targetPath);
} catch (err) {
  console.error('[CRITICAL] Failed to load orders.cjs:', err.message);
}

// ========================================================
// REGISTER API ENDPOINTS (ALIASES INCLUDED)
// ========================================================

app.use('/api/menu', menuRouter);
app.use('/api/products', menuRouter); 

app.use('/api/users', userRouter);
app.use('/api/auth', userRouter); 

app.use('/api/orders', ordersRouter);

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const dbPath = path.join(baseFolder, 'db.cjs');
    const db = require(dbPath);
    const [rows] = await db.query('SELECT NOW() as time');
    res.json({ status: 'ok', database: 'connected', time: rows[0].time });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Database Initialization (Wrapped safely)
try {
  const initDbPath = path.join(baseFolder, 'init-db.cjs');
  if (fs.existsSync(initDbPath)) {
    const initDb = require(initDbPath);
    initDb();
  }
} catch (err) {
  console.log('Database init skipped or unavailable.');
}

// Production UI Routing
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  });
}

// CRITICAL FOR RENDER: Bind explicitly to '0.0.0.0'
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server executing successfully on port ${PORT}`);
});
