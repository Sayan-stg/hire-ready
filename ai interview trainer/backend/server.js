require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // allow inline scripts for frontend
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts, please try again later.' },
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'API rate limit exceeded.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/interview/', apiLimiter);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    const allowed = [
      'https://hire-ready-d5hg.onrender.com',
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5500',
      'http://localhost:5500',
      // Allow local file/test tooling
      undefined
    ].filter(Boolean);
    if (!origin || allowed.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    callback(new Error('CORS blocked: origin not allowed by policy.'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ─── Serve Frontend ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/interview',  require('./routes/interview'));
app.use('/api/evaluation', require('./routes/evaluation'));
app.use('/api/leaderboard',require('./routes/leaderboard'));
app.use('/api/resources',  require('./routes/resources'));
app.use('/api/admin',      require('./routes/admin'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Serve Frontend SPA ───────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Database & Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hireready';

mongoose.set('bufferCommands', false);

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 HireReady server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Starting without database (demo mode)');
    app.listen(PORT, () => console.log(`🚀 HireReady server running on http://localhost:${PORT} (no DB)`));
  });

module.exports = app;
