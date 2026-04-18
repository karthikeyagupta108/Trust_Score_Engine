const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../db');

const router = express.Router();

// POST /api/interactions - Create interaction (vote, report, share)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { target_post_id, interaction_type } = req.body;
    const actorUserId = req.user.user_id;

    if (!target_post_id || !interaction_type) {
      return res.status(400).json({ error: 'target_post_id and interaction_type required' });
    }

    if (!['upvote', 'downvote', 'report', 'share'].includes(interaction_type)) {
      return res.status(400).json({ error: 'Invalid interaction type' });
    }

    const conn = await pool.getConnection();

    // Check if interaction already exists (for upvote/downvote, prevent duplicate)
    if (['upvote', 'downvote'].includes(interaction_type)) {
      const [existing] = await conn.query(
        'SELECT * FROM interactions WHERE actor_user_id = ? AND target_post_id = ? AND interaction_type = ?',
        [actorUserId, target_post_id, interaction_type]
      );

      if (existing.length > 0) {
        conn.release();
        return res.status(400).json({ error: 'You have already performed this interaction' });
      }
    }

    // Get actor's trust score
    const [actor] = await conn.query('SELECT trust_score FROM users WHERE user_id = ?', [actorUserId]);
    const actorTrustScore = actor[0].trust_score;

    // Determine interaction weight based on actor trust
    let interactionWeight = 1.0;
    if (actorTrustScore > 80) {
      interactionWeight = 1.5;
    } else if (actorTrustScore < 40) {
      interactionWeight = 0.5;
    }

    // Insert interaction
    const [result] = await conn.query(
      'INSERT INTO interactions (actor_user_id, target_post_id, interaction_type, interaction_weight) VALUES (?, ?, ?, ?)',
      [actorUserId, target_post_id, interaction_type, interactionWeight]
    );

    // Log activity
    await conn.query('INSERT INTO activity_log (user_id, action_type, target_id) VALUES (?, ?, ?)', [
      actorUserId,
      interaction_type === 'report' ? 'report' : interaction_type === 'share' ? 'share' : 'vote',
      target_post_id,
    ]);

    // Get post author
    const [posts] = await conn.query('SELECT user_id FROM posts WHERE post_id = ?', [target_post_id]);
    const postAuthorId = posts[0].user_id;

    // Update trust_graph
    const [existing] = await conn.query(
      'SELECT * FROM trust_graph WHERE source_user = ? AND target_user = ?',
      [actorUserId, postAuthorId]
    );

    if (existing.length > 0) {
      await conn.query(
        'UPDATE trust_graph SET interaction_count = interaction_count + 1, last_interaction = NOW() WHERE source_user = ? AND target_user = ?',
        [actorUserId, postAuthorId]
      );
    } else {
      await conn.query(
        'INSERT INTO trust_graph (source_user, target_user, interaction_count, trust_weight) VALUES (?, ?, ?, ?)',
        [actorUserId, postAuthorId, 1, 0.5]
      );
    }

    // Recalculate actor's trust score
    let trustDelta = 0;
    if (interaction_type === 'upvote' || interaction_type === 'share') {
      trustDelta = interactionWeight * 0.5;
    } else if (interaction_type === 'downvote') {
      trustDelta = -interactionWeight * 0.3;
    } else if (interaction_type === 'report') {
      trustDelta = interactionWeight * 0.3; // Reporting is constructive
    }

    const newTrustScore = Math.max(0, Math.min(100, actorTrustScore + trustDelta));
    await conn.query('UPDATE users SET trust_score = ? WHERE user_id = ?', [newTrustScore, actorUserId]);

    // Update burst_activity_score (simulation)
    await conn.query(
      'UPDATE user_behavior SET burst_activity_score = burst_activity_score + 0.1 WHERE user_id = ?',
      [actorUserId]
    );

    // Check if burst_activity_score exceeds threshold and update suspicion_score
    const [behavior] = await conn.query('SELECT burst_activity_score FROM user_behavior WHERE user_id = ?', [actorUserId]);

    if (behavior[0].burst_activity_score > 0.8) {
      const suspicionIncrease = behavior[0].burst_activity_score * 5;
      const [currentUser] = await conn.query('SELECT suspicion_score FROM users WHERE user_id = ?', [actorUserId]);
      const newSuspicionScore = currentUser[0].suspicion_score + suspicionIncrease;
      await conn.query('UPDATE users SET suspicion_score = ? WHERE user_id = ?', [newSuspicionScore, actorUserId]);
    }

    // Call stored procedure to detect suspicious users
    await conn.query('CALL detect_suspicious_users()');

    conn.release();

    res.status(201).json({
      message: 'Interaction recorded',
      interaction_id: result.insertId,
      actor_user_id: actorUserId,
      target_post_id,
      interaction_type,
      new_trust_score: newTrustScore,
    });
  } catch (error) {
    console.error('Error creating interaction:', error);
    res.status(500).json({ error: 'Failed to create interaction' });
  }
});

module.exports = router;
