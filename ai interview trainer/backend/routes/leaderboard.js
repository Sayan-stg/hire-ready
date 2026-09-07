const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Session = require('../models/Session');

// GET /api/leaderboard
router.get('/', protect, async (req, res) => {
  try {
    const { role, period } = req.query;

    if (mongoose.connection.readyState === 1) {
      let dateFilter = {};
      const now = new Date();
      if (period === 'week') {
        dateFilter = { completedAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) } };
      } else if (period === 'month') {
        dateFilter = { completedAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) } };
      }

      const matchFilter = { status: 'completed', ...dateFilter };
      if (role && role !== 'all') matchFilter.role = role;

      const pipeline = [
        { $match: matchFilter },
        {
          $group: {
            _id: '$user',
            totalPoints: { $sum: { $multiply: [{ $ifNull: ['$evaluation.overallScore', 0] }, 10] } },
            sessions: { $sum: 1 },
            avgScore: { $avg: { $ifNull: ['$evaluation.overallScore', 0] } },
            bestScore: { $max: { $ifNull: ['$evaluation.overallScore', 0] } },
          }
        },
        { $sort: { totalPoints: -1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        { $unwind: '$userInfo' },
        {
          $project: {
            name: '$userInfo.name',
            targetRole: '$userInfo.targetRole',
            streak: '$userInfo.streak',
            totalPoints: 1,
            sessions: 1,
            avgScore: { $round: ['$avgScore', 0] },
            bestScore: { $round: ['$bestScore', 0] },
          }
        }
      ];

      const leaderboard = await Session.aggregate(pipeline);
      const userRank = leaderboard.findIndex(u => u._id.toString() === req.user._id.toString()) + 1;
      return res.json({ success: true, leaderboard, userRank });
    }

    // In-memory real session leaderboard
    const userScores = new Map();

    if (global.inMemorySessions) {
      for (const s of global.inMemorySessions.values()) {
        if (s.status === 'completed') {
          const uid = s.user?.toString() || 'demo_user';
          const score = s.evaluation?.overallScore || 70;
          if (!userScores.has(uid)) {
            userScores.set(uid, {
              _id: uid,
              totalPoints: score * 10,
              sessions: 1,
              scores: [score],
              bestScore: score
            });
          } else {
            const entry = userScores.get(uid);
            entry.totalPoints += score * 10;
            entry.sessions += 1;
            entry.scores.push(score);
            entry.bestScore = Math.max(entry.bestScore, score);
          }
        }
      }
    }

    const leaderboard = [];
    for (const [uid, data] of userScores.entries()) {
      let userName = 'Commander';
      let userStreak = 1;
      let userRole = 'SDE';

      if (global.inMemoryUsers) {
        for (const u of global.inMemoryUsers.values()) {
          if (u._id?.toString() === uid) {
            userName = u.name;
            userStreak = u.streak || 1;
            userRole = u.targetRole || 'SDE';
            break;
          }
        }
      }

      if (req.user && req.user._id?.toString() === uid) {
        userName = req.user.name;
        userStreak = req.user.streak || 1;
        userRole = req.user.targetRole || 'SDE';
      }

      const avgScore = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length);
      leaderboard.push({
        _id: uid,
        name: userName,
        targetRole: userRole,
        streak: userStreak,
        totalPoints: data.totalPoints,
        sessions: data.sessions,
        avgScore,
        bestScore: data.bestScore
      });
    }

    // Sort by points
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
    const userRank = leaderboard.findIndex(u => u._id.toString() === req.user._id.toString()) + 1;

    res.json({ success: true, leaderboard, userRank: userRank || 1 });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
});

module.exports = router;
