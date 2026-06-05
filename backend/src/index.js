require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (medical records)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/doctors',      require('./routes/doctors'));
app.use('/api/schedules',    require('./routes/schedules'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/patients',     require('./routes/patients'));
app.use('/api/reviews',      require('./routes/reviews'));
app.use('/api/ai',           require('./routes/ai'));

// ── Health check ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── 404 catch-all ─────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── DB connection triggers on first import ────────────────────────────────
require('./config/db');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 MediConnect backend running on http://localhost:${PORT}`);
});
