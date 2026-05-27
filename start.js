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

const useServerSubfolder = fs.existsSync(path.join(__dirname, 'server'));
const backendPath = useServerSubfolder ? './server' : '.';

app.use('/api/menu', require(`${backendPath}/routes/menu.cjs`));
app.use('/api/orders', require(`${backendPath}/routes/orders.cjs`));
app.use('/api/users', require(`${backendPath}/routes/users.cjs`));

app.get('/api/health', async (req, res) => {
  try {
    const db = require(`${backendPath}/db.cjs`);
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

try {
  const initDb = require(`${backendPath}/init-db.cjs`);
  initDb();
} catch (err) {
  console.log('Database schema setup step completed');
}

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(__dirname, 'dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
