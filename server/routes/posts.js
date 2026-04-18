const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../db');

const router = express.Router();

// GET /api/posts - Get all posts with optional topic filter
router.get('/', async (req, res) => {
  try {
    const topicId = req.query.topic_id;
    const conn = await pool.getConnection();

    let query = `
      SELECT p.*, ua.username, t.topic_name, pvs.upvotes, pvs.downvotes, pvs.reports, pvs.trust_weighted_score, u.trust_score
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      JOIN user_auth ua ON u.user_id = ua.user_id
      JOIN topics t ON p.topic_id = t.topic_id
      LEFT JOIN post_vote_summary pvs ON p.post_id = pvs.post_id
    `;

    let params = [];
    if (topicId) {
      query += ' WHERE p.topic_id = ?';
      params.push(topicId);
    }

    query += ' ORDER BY p.created_at DESC LIMIT 50';

    const [posts] = await conn.query(query, params);

    conn.release();

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// POST /api/posts - Create new post
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, topic_id } = req.body;
    const userId = req.user.user_id;

    if (!content || !topic_id) {
      return res.status(400).json({ error: 'Content and topic_id required' });
    }

    const conn = await pool.getConnection();

    // Insert post
    const [result] = await conn.query('INSERT INTO posts (user_id, topic_id, content) VALUES (?, ?, ?)', [userId, topic_id, content]);

    const postId = result.insertId;

    // Initialize post vote summary
    await conn.query('INSERT INTO post_vote_summary (post_id, upvotes, downvotes, reports, trust_weighted_score) VALUES (?, ?, ?, ?, ?)', [
      postId,
      0,
      0,
      0,
      0,
    ]);

    // Log activity
    await conn.query('INSERT INTO activity_log (user_id, action_type, target_id) VALUES (?, ?, ?)', [userId, 'post', postId]);

    // Update user behavior (posts_per_day increment)
    await conn.query(
      'UPDATE user_behavior SET posts_per_day = posts_per_day + 1 WHERE user_id = ?',
      [userId]
    );

    conn.release();

    res.status(201).json({
      message: 'Post created',
      post_id: postId,
      user_id: userId,
      topic_id,
      content,
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// GET /api/posts/:id - Get single post with interactions
router.get('/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const conn = await pool.getConnection();

    const [posts] = await conn.query(
      `SELECT p.*, ua.username, t.topic_name, pvs.upvotes, pvs.downvotes, pvs.reports, pvs.trust_weighted_score, u.trust_score
       FROM posts p
       JOIN users u ON p.user_id = u.user_id
       JOIN user_auth ua ON u.user_id = ua.user_id
       JOIN topics t ON p.topic_id = t.topic_id
       LEFT JOIN post_vote_summary pvs ON p.post_id = pvs.post_id
       WHERE p.post_id = ?`,
      [postId]
    );

    if (posts.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'Post not found' });
    }

    conn.release();

    res.json(posts[0]);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// GET /api/posts/:id/interactions - Get all interactions on a post
router.get('/:id/interactions', async (req, res) => {
  try {
    const postId = req.params.id;
    const conn = await pool.getConnection();

    const [interactions] = await conn.query(
      `SELECT i.*, ua.username FROM interactions i
       JOIN users u ON i.actor_user_id = u.user_id
       JOIN user_auth ua ON u.user_id = ua.user_id
       WHERE i.target_post_id = ?
       ORDER BY i.timestamp DESC`,
      [postId]
    );

    conn.release();

    res.json(interactions);
  } catch (error) {
    console.error('Error fetching interactions:', error);
    res.status(500).json({ error: 'Failed to fetch interactions' });
  }
});

module.exports = router;
