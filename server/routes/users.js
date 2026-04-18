const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../db');

const router = express.Router();

// GET /api/users/me - Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const conn = await pool.getConnection();

    const [users] = await conn.query('SELECT * FROM users WHERE user_id = ?', [userId]);

    if (users.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'User not found' });
    }

    const [authData] = await conn.query('SELECT username, email, is_admin FROM user_auth WHERE user_id = ?', [userId]);

    conn.release();

    res.json({
      user_id: users[0].user_id,
      username: authData[0].username,
      email: authData[0].email,
      is_admin: authData[0].is_admin,
      created_at: users[0].created_at,
      status: users[0].status,
      trust_score: users[0].trust_score,
      suspicion_score: users[0].suspicion_score,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// GET /api/users/:id/trust-history - Get trust history (paginated)
router.get('/:id/trust-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const conn = await pool.getConnection();

    const [history] = await conn.query(
      'SELECT * FROM trust_history WHERE user_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );

    const [count] = await conn.query('SELECT COUNT(*) as total FROM trust_history WHERE user_id = ?', [userId]);

    conn.release();

    res.json({
      data: history,
      total: count[0].total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Error fetching trust history:', error);
    res.status(500).json({ error: 'Failed to fetch trust history' });
  }
});

// GET /api/users/:id/activity - Get recent activity
router.get('/:id/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const limit = parseInt(req.query.limit) || 20;

    const conn = await pool.getConnection();

    const [activity] = await conn.query(
      'SELECT * FROM activity_log WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit]
    );

    conn.release();

    res.json(activity);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// GET /api/users/:id/behavior - Get user behavior metrics
router.get('/:id/behavior', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    const conn = await pool.getConnection();

    const [behavior] = await conn.query('SELECT * FROM user_behavior WHERE user_id = ?', [userId]);

    conn.release();

    if (behavior.length === 0) {
      return res.status(404).json({ error: 'Behavior data not found' });
    }

    res.json(behavior[0]);
  } catch (error) {
    console.error('Error fetching behavior:', error);
    res.status(500).json({ error: 'Failed to fetch behavior data' });
  }
});

// PATCH /api/users/me/status - Update user status
router.patch('/me/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.user.user_id;

    if (!status || !['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const conn = await pool.getConnection();

    await conn.query('UPDATE users SET status = ? WHERE user_id = ?', [status, userId]);

    conn.release();

    res.json({ message: 'Status updated', status });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;
