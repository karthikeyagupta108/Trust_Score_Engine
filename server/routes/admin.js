const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const pool = require('../db');

const router = express.Router();

// GET /api/admin/suspicious - Get all suspicious users with cluster info
router.get('/suspicious', authenticateToken, isAdmin, async (req, res) => {
  try {
    const conn = await pool.getConnection();

    const [suspicious] = await conn.query(
      `SELECT s.user_id, ua.username, u.trust_score, u.suspicion_score, s.reason, s.severity, s.detection_time, sc.cluster_type
       FROM suspicious_users s
       JOIN users u ON s.user_id = u.user_id
       JOIN user_auth ua ON u.user_id = ua.user_id
       LEFT JOIN cluster_members cm ON s.user_id = cm.user_id
       LEFT JOIN suspicious_clusters sc ON cm.cluster_id = sc.cluster_id
       ORDER BY s.severity DESC`
    );

    conn.release();

    res.json(suspicious);
  } catch (error) {
    console.error('Error fetching suspicious users:', error);
    res.status(500).json({ error: 'Failed to fetch suspicious users' });
  }
});

// GET /api/admin/clusters - Get all clusters with member counts
router.get('/clusters', authenticateToken, isAdmin, async (req, res) => {
  try {
    const conn = await pool.getConnection();

    const [clusters] = await conn.query(
      `SELECT sc.cluster_id, sc.cluster_type, sc.cluster_score, COUNT(cm.user_id) as member_count,
              AVG(cm.suspicion_score) as avg_suspicion
       FROM suspicious_clusters sc
       LEFT JOIN cluster_members cm ON sc.cluster_id = cm.cluster_id
       GROUP BY sc.cluster_id, sc.cluster_type, sc.cluster_score`
    );

    conn.release();

    res.json(clusters);
  } catch (error) {
    console.error('Error fetching clusters:', error);
    res.status(500).json({ error: 'Failed to fetch clusters' });
  }
});

// GET /api/admin/trust-history - Get global trust history
router.get('/trust-history', authenticateToken, isAdmin, async (req, res) => {
  try {
    const userId = req.query.user_id;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const conn = await pool.getConnection();

    let query = 'SELECT th.*, ua.username FROM trust_history th JOIN user_auth ua ON th.user_id = ua.user_id';
    let params = [];

    if (userId) {
      query += ' WHERE th.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY th.updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [history] = await conn.query(query, params);

    conn.release();

    res.json(history);
  } catch (error) {
    console.error('Error fetching trust history:', error);
    res.status(500).json({ error: 'Failed to fetch trust history' });
  }
});

// POST /api/admin/recalculate - Manually trigger suspicious user detection
router.post('/recalculate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const conn = await pool.getConnection();

    await conn.query('CALL detect_suspicious_users()');

    conn.release();

    res.json({ message: 'Suspicious user detection recalculated' });
  } catch (error) {
    console.error('Error recalculating:', error);
    res.status(500).json({ error: 'Failed to recalculate suspicious users' });
  }
});

// GET /api/admin/stats - Platform statistics
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const conn = await pool.getConnection();

    const [totalUsers] = await conn.query('SELECT COUNT(*) as count FROM users');
    const [avgTrust] = await conn.query('SELECT AVG(trust_score) as avg FROM users');
    const [suspiciousCount] = await conn.query('SELECT COUNT(*) as count FROM suspicious_users');
    const [totalPosts] = await conn.query('SELECT COUNT(*) as count FROM posts');
    const [totalInteractions] = await conn.query('SELECT COUNT(*) as count FROM interactions');
    const [topTopic] = await conn.query(
      `SELECT t.topic_name, COUNT(p.post_id) as post_count
       FROM topics t
       LEFT JOIN posts p ON t.topic_id = p.topic_id
       GROUP BY t.topic_id, t.topic_name
       ORDER BY post_count DESC
       LIMIT 1`
    );

    conn.release();

    res.json({
      total_users: totalUsers[0].count,
      avg_trust_score: avgTrust[0].avg ? avgTrust[0].avg.toFixed(2) : 0,
      suspicious_users: suspiciousCount[0].count,
      suspicious_percentage: ((suspiciousCount[0].count / totalUsers[0].count) * 100).toFixed(2) + '%',
      total_posts: totalPosts[0].count,
      total_interactions: totalInteractions[0].count,
      most_active_topic: topTopic.length > 0 ? topTopic[0].topic_name : 'N/A',
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
