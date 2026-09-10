const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const Session = require('../models/Session');

// GET /api/evaluation/latest
router.get('/latest', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const session = await Session.findOne({
        user: req.user._id, status: 'completed'
      }).sort({ completedAt: -1 });

      if (session) {
        return res.json({
          success: true,
          evaluation: session.evaluation,
          session: {
            role: session.role,
            difficulty: session.difficulty,
            duration: session.duration,
            completedAt: session.completedAt,
            id: session._id,
            messages: session.messages
          }
        });
      }
    }

    // In-memory sessions lookup
    if (global.inMemorySessions) {
      const userSess = [];
      for (const s of global.inMemorySessions.values()) {
        if (s.status === 'completed') {
          if (s.user?.toString() === req.user._id?.toString()) {
            userSess.push(s);
          }
        }
      }
      userSess.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
      
      // If no session found under exact ID, fallback to the latest completed session (supports guest users seamlessly)
      let latest = userSess[0];
      if (!latest && global.inMemorySessions.size > 0) {
        const allCompleted = Array.from(global.inMemorySessions.values())
          .filter(s => s.status === 'completed')
          .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt));
        if (allCompleted.length > 0) latest = allCompleted[0];
      }

      if (latest) {
        return res.json({
          success: true,
          evaluation: latest.evaluation,
          session: {
            role: latest.role,
            difficulty: latest.difficulty,
            duration: latest.duration,
            completedAt: latest.completedAt,
            id: latest._id,
            messages: latest.messages
          }
        });
      }
    }

    res.json({ success: true, evaluation: null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evaluation.' });
  }
});

// GET /api/evaluation/:sessionId
router.get('/:sessionId', protect, async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const session = await Session.findOne({ _id: req.params.sessionId, user: req.user._id });
      if (session) {
        return res.json({
          success: true,
          evaluation: session.evaluation,
          session: {
            role: session.role,
            difficulty: session.difficulty,
            duration: session.duration,
            completedAt: session.completedAt,
            messages: session.messages
          }
        });
      }
    }

    if (global.inMemorySessions && global.inMemorySessions.has(req.params.sessionId)) {
      const s = global.inMemorySessions.get(req.params.sessionId);
      if (s.user && req.user && s.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access forbidden: unauthorized evaluation request.' });
      }
      return res.json({
        success: true,
        evaluation: s.evaluation,
        session: {
          role: s.role,
          difficulty: s.difficulty,
          duration: s.duration,
          completedAt: s.completedAt,
          messages: s.messages
        }
      });
    }

    res.status(404).json({ error: 'Session not found.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch evaluation.' });
  }
});

module.exports = router;
