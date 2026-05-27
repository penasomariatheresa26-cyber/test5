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

// Handle folder structure variations
const useServerSubfolder = fs.existsSync(path.join(__dirname, 'server'));
const backendPath = useServerSubfolder ? './server' : '.';

// ========================================================
// FIXED API ROUTES WITH ALIASES FOR FRONTEND COMPATIBILITY
// ========================================================

// Both /api/menu and /api/products will now point to your menu router
const menuRouter = require(`${backendPath}/routes/menu.cjs`);
app.use('/api/menu', menuRouter);
app.use('/api/products', menuRouter); 

// Both /api/users and /api/auth will now point to your users router
const userRouter = require(`${backendPath}/routes/users.cjs`);
app.use('/api/users', userRouter);
app.use('/api/auth', userRouter); 

// Orders Route
app.use('/api/orders', require(`${backendPath}/routes/orders.cjs`));

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const db = require(`${backendPath}/db.cjs`);
    const [rows] = await db.query('SELECT NOW() as time');
    res.json({ status: 'ok', database: 'connected', time: rows[0].time });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Database Initialization (Wrapped safely)
try {
  const initDb = require(`${backendPath}/init-db.cjs`);
  initDb();
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
