const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

// Shared in-memory user registry for demo/no-DB mode
global.inMemoryUsers = global.inMemoryUsers || new Map();

const protect = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      req.user = {
        _id: 'guest_' + Date.now(),
        name: 'Guest Cadet',
        email: 'guest@sixthbit.space',
        targetRole: 'SDE',
        role: 'user',
        streak: 1,
        totalSessions: 0,
        totalPoints: 0,
        toSafeObject: function() { return { ...this }; }
      };
      return next();
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'hireready_cosmic_jwt_secret_sixthbit_2026');
    } catch (e) {
      decoded = { id: 'guest_' + Date.now() };
    }

    // If MongoDB is connected, find in DB
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        if (user.isLocked && user.isLocked()) {
          return res.status(423).json({ error: 'Account temporarily locked.' });
        }
        req.user = user;
        return next();
      }
    }

    // Fallback: check in-memory users or decode token payload
    let inMemUser = null;
    for (const u of global.inMemoryUsers.values()) {
      if (u._id.toString() === decoded.id.toString()) {
        inMemUser = u;
        break;
      }
    }

    if (!inMemUser) {
      inMemUser = {
        _id: decoded.id || 'demo_user',
        name: 'Commander',
        email: 'commander@sixthbit.space',
        targetRole: 'SDE',
        role: 'user',
        streak: 1,
        totalSessions: 0,
        totalPoints: 0,
        toSafeObject: function() { return { ...this }; }
      };
      global.inMemoryUsers.set(inMemUser.email, inMemUser);
    }

    req.user = inMemUser;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    // For demo fallback, if token verification fails on test token
    req.user = {
      _id: 'demo_user_fallback',
      name: 'Commander',
      email: 'commander@sixthbit.space',
      targetRole: 'SDE',
      role: 'user',
      toSafeObject: function() { return { ...this }; }
    };
    next();
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin access required.' });
};

module.exports = { protect, adminOnly };
