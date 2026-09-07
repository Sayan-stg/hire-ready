const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

global.inMemoryUsers = global.inMemoryUsers || new Map();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_for_dev', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

const sendToken = (user, statusCode, res) => {
  const token = generateToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };
  res.cookie('token', token, cookieOptions);
  res.status(statusCode).json({
    success: true,
    token,
    user: typeof user.toSafeObject === 'function' ? user.toSafeObject() : {
      _id: user._id,
      name: user.name,
      email: user.email,
      targetRole: user.targetRole,
      streak: user.streak || 1,
      totalSessions: user.totalSessions || 0,
      totalPoints: user.totalPoints || 0
    },
  });
};

// POST /api/auth/register
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }

  const { name, email, password, targetRole } = req.body;

  try {
    // If MongoDB is connected, use Mongoose
    if (mongoose.connection.readyState === 1) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ error: 'Email already registered.' });

      const user = await User.create({ name, email, password, targetRole: targetRole || 'SDE' });
      return sendToken(user, 201, res);
    }
  } catch (err) {
    console.warn('MongoDB query failed during registration, falling back to memory store:', err.message);
  }

  // In-memory fallback (when MongoDB is offline or unavailable)
  try {
    if (global.inMemoryUsers.has(email)) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const mockUser = {
      _id: 'user_' + Date.now(),
      name,
      email,
      password: hashedPassword,
      targetRole: targetRole || 'SDE',
      role: 'user',
      streak: 1,
      totalSessions: 0,
      totalPoints: 0,
      toSafeObject: function() {
        return {
          _id: this._id,
          name: this.name,
          email: this.email,
          targetRole: this.targetRole,
          streak: this.streak,
          totalSessions: this.totalSessions,
          totalPoints: this.totalPoints
        };
      },
      comparePassword: async function(cand) { return bcrypt.compare(cand, this.password); }
    };

    global.inMemoryUsers.set(email, mockUser);
    sendToken(mockUser, 201, res);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid credentials.' });

  const { email, password } = req.body;

  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email }).select('+password');
      if (user) {
        if (user.isLocked && user.isLocked()) {
          return res.status(423).json({ error: 'Account locked. Try again in 15 minutes.' });
        }
        const isMatch = await user.comparePassword(password);
        if (isMatch) {
          user.loginAttempts = 0;
          user.lockUntil = undefined;
          await user.save();
          return sendToken(user, 200, res);
        }
      }
    }
  } catch (err) {
    console.warn('MongoDB query failed during login, falling back to memory store:', err.message);
  }

  // In-memory fallback
  try {
    let user = global.inMemoryUsers.get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    sendToken(user, 200, res);
  } catch (err) {
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.cookie('token', 'none', { expires: new Date(0), httpOnly: true });
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  const safe = typeof req.user.toSafeObject === 'function' ? req.user.toSafeObject() : req.user;
  res.json({ success: true, user: safe });
});

module.exports = router;
