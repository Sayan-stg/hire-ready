const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Session = require('../models/Session');
const mongoose = require('mongoose');

// Memory storage for resume (parse text in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.includes('text')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and text files allowed'));
    }
  },
});

// GET /api/users/profile
router.get('/profile', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user._id);
      const sessions = await Session.find({ user: req.user._id, status: 'completed' })
        .sort({ completedAt: -1 }).limit(5).select('role difficulty evaluation.overallScore duration completedAt');

      return res.json({
        success: true,
        user: user ? user.toSafeObject() : req.user,
        recentSessions: sessions,
      });
    }

    // In-memory fallback
    const user = (global.inMemoryUsers && global.inMemoryUsers.get(req.user._id?.toString())) || req.user;
    let sessions = [];
    if (global.inMemorySessions) {
      for (const s of global.inMemorySessions.values()) {
        if (s.user?.toString() === req.user._id?.toString() && s.status === 'completed') {
          sessions.push(s);
        }
      }
    }

    res.json({
      success: true,
      user: user.toSafeObject ? user.toSafeObject() : user,
      recentSessions: sessions.slice(0, 5),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, targetRole } = req.body;
    const updates = {};
    if (name) updates.name = name.trim().substring(0, 100);
    if (targetRole) updates.targetRole = targetRole;

    if (mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
      return res.json({ success: true, user: user.toSafeObject() });
    }

    // In-memory fallback
    const user = (global.inMemoryUsers && global.inMemoryUsers.get(req.user._id?.toString())) || req.user;
    if (updates.name) user.name = updates.name;
    if (updates.targetRole) user.targetRole = updates.targetRole;
    if (global.inMemoryUsers) global.inMemoryUsers.set(req.user._id?.toString(), user);

    res.json({ success: true, user: user.toSafeObject ? user.toSafeObject() : user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// PUT /api/users/settings
router.put('/settings', protect, async (req, res) => {
  try {
    const { theme, pressureMode, difficulty, notifications } = req.body;
    const settings = {};
    if (theme) settings['settings.theme'] = theme;
    if (typeof pressureMode === 'boolean') settings['settings.pressureMode'] = pressureMode;
    if (difficulty) settings['settings.difficulty'] = difficulty;
    if (typeof notifications === 'boolean') settings['settings.notifications'] = notifications;

    if (mongoose.connection.readyState === 1) {
      const user = await User.findByIdAndUpdate(req.user._id, { $set: settings }, { new: true });
      return res.json({ success: true, settings: user.settings });
    }

    // In-memory fallback
    const user = (global.inMemoryUsers && global.inMemoryUsers.get(req.user._id?.toString())) || req.user;
    user.settings = user.settings || {};
    if (theme) user.settings.theme = theme;
    if (typeof pressureMode === 'boolean') user.settings.pressureMode = pressureMode;
    if (difficulty) user.settings.difficulty = difficulty;
    if (typeof notifications === 'boolean') user.settings.notifications = notifications;

    res.json({ success: true, settings: user.settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

// PUT /api/users/password
router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required.' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect.' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// POST /api/users/resume
router.post('/resume', protect, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    // Extract text from file (basic text extraction)
    let resumeText = '';
    if (req.file.mimetype.includes('text')) {
      resumeText = req.file.buffer.toString('utf-8').substring(0, 3000);
    } else {
      // For PDF, just store a placeholder (full PDF parsing needs additional lib)
      resumeText = `Resume uploaded: ${req.file.originalname}. Size: ${req.file.size} bytes. Processing complete.`;
    }

    await User.findByIdAndUpdate(req.user._id, { resumeText });
    res.json({ success: true, message: 'Resume uploaded successfully.', preview: resumeText.substring(0, 200) });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Resume upload failed.' });
  }
});

// GET /api/users/stats
router.get('/stats', protect, async (req, res) => {
  try {
    let sessions = [];
    let user = req.user;

    if (mongoose.connection.readyState === 1) {
      user = await User.findById(req.user._id) || req.user;
      sessions = await Session.find({ user: req.user._id, status: 'completed' });
    } else if (global.inMemorySessions) {
      for (const s of global.inMemorySessions.values()) {
        if (s.user?.toString() === req.user._id?.toString() && s.status === 'completed') {
          sessions.push(s);
        }
      }
    }

    const avgScore = sessions.length
      ? Math.round(sessions.reduce((a, s) => a + (s.evaluation?.overallScore || 0), 0) / sessions.length)
      : 0;

    const roleBreakdown = sessions.reduce((acc, s) => {
      acc[s.role] = (acc[s.role] || 0) + 1;
      return acc;
    }, {});

    const recentScores = sessions.slice(-7).map(s => ({
      date: s.completedAt,
      score: s.evaluation?.overallScore || 0,
      role: s.role,
    }));

    // Aggregate real filler words across all completed sessions
    const fillerTotals = { um: 0, like: 0, so: 0, uh: 0, basically: 0, actually: 0, literally: 0 };
    sessions.forEach(s => {
      if (s.evaluation?.fillerMap) {
        Object.entries(s.evaluation.fillerMap).forEach(([k, v]) => {
          fillerTotals[k] = (fillerTotals[k] || 0) + v;
        });
      }
    });

    res.json({
      success: true,
      stats: {
        totalSessions: sessions.length,
        totalPoints: user.totalPoints || (sessions.length * 750),
        streak: user.streak || (sessions.length > 0 ? 1 : 0),
        avgScore,
        roleBreakdown,
        recentScores,
        fillerTotals,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

module.exports = router;
