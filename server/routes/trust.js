const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../db');

const router = express.Router();

// GET /api/trust/graph/:id - Get trust graph edges for a user
router.get('/graph/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const conn = await pool.getConnection();

    const [edges] = await conn.query(
      `SELECT t.*, ua_source.username as source_username, ua_target.username as target_username
       FROM trust_graph t
       JOIN user_auth ua_source ON t.source_user = ua_source.user_id
       JOIN user_auth ua_target ON t.target_user = ua_target.user_id
       WHERE t.source_user = ? OR t.target_user = ?`,
      [userId, userId]
    );

    conn.release();

    res.json(edges);
  } catch (error) {
    console.error('Error fetching trust graph:', error);
    res.status(500).json({ error: 'Failed to fetch trust graph' });
  }
});

// GET /api/trust/leaderboard - Get top 10 users by trust score
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const conn = await pool.getConnection();

    const [leaderboard] = await conn.query(
      `SELECT u.user_id, ua.username, u.trust_score, u.suspicion_score, u.created_at
       FROM users u
       JOIN user_auth ua ON u.user_id = ua.user_id
       WHERE u.status = 'active'
       ORDER BY u.trust_score DESC
       LIMIT 10`
    );

    conn.release();

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
