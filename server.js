const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const path       = require('path');

const { initDB }               = require('./database');
const studentRoutes            = require('./routes/students');
const { router: authRoutes, requireAuth } = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API routes ──────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);                          // public
app.use('/api/students', requireAuth, studentRoutes);      // protected ✅
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Serve login page ───────────────────────────────────────────────────────
app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ── Start ───────────────────────────────────────────────────────────────────
(async () => {
  await initDB();
  app.listen(PORT, () => {
    console.log(`\n  Student Management System → http://localhost:${PORT}`);
    console.log('  Press CTRL+C to stop\n');
  });
})();

module.exports = app;
