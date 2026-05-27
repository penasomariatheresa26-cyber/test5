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

// Determine exactly where the routes are located
const isServerFolderPresent = fs.existsSync(path.join(__dirname, 'server'));
const baseFolder = isServerFolderPresent ? path.join(__dirname, 'server') : __dirname;

console.log(`[Server Setup] Loading routes from base directory: ${baseFolder}`);

// Safe require helper to ensure we never feed 'undefined' to app.use
function loadRouter(routerPath) {
  const absolutePath = path.resolve(baseFolder, 'routes', routerPath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`[CRITICAL ERROR] Route file missing at: ${absolutePath}`);
    // Fallback emergency router so the whole app doesn't crash on startup
    const fallback = express.Router();
    fallback.all('*', (req, res) => res.status(500).json({ error: "Route module unavailable" }));
    return fallback;
  }
  return require(absolutePath);
}

// ========================================================
// RE-ALIGNED API ROUTES USING EXPLICIT RESOLUTIONS
// ========================================================

// Load modules safely
const menuRouter = loadRouter('menu.cjs');
const userRouter = loadRouter('users.cjs');
const ordersRouter = loadRouter('orders.cjs');

// Assign aliases for frontend consistency
app.use('/api/menu', menuRouter);
app.use('/api/products', menuRouter); 

app.use('/api/users', userRouter);
app.use('/api/auth', userRouter); 

app.use('/api/orders', ordersRouter);

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const db = require(path.resolve(baseFolder, 'db.cjs'));
    const [rows] = await db.query('SELECT NOW() as time');
    res.json({ status: 'ok', database: 'connected', time: rows[0].time });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Database Initialization (Wrapped safely)
try {
  const initDbPath = path.resolve(baseFolder, 'init-db.cjs');
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
