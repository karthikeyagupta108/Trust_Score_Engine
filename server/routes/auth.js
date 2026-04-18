const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    // Validation
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const conn = await pool.getConnection();

    // Check if username or email already exists
    const [existing] = await conn.query(
      'SELECT * FROM user_auth WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existing.length > 0) {
      conn.release();
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert into users table
    const [userResult] = await conn.query('INSERT INTO users (status, trust_score, suspicion_score) VALUES (?, ?, ?)', [
      'active',
      50.0,
      0.0,
    ]);
    const userId = userResult.insertId;

    // Insert into user_auth
    await conn.query('INSERT INTO user_auth (user_id, username, email, password_hash, is_admin) VALUES (?, ?, ?, ?, ?)', [
      userId,
      username,
      email,
      passwordHash,
      false,
    ]);

    // Initialize user_behavior
    await conn.query('INSERT INTO user_behavior (user_id, posts_per_day, avg_post_interval, burst_activity_score, interaction_entropy) VALUES (?, ?, ?, ?, ?)', [
      userId,
      0,
      0,
      0,
      1.0,
    ]);

    // Log signup activity
    await conn.query('INSERT INTO activity_log (user_id, action_type, target_id) VALUES (?, ?, ?)', [userId, 'signup', null]);

    conn.release();

    // Generate JWT
    const token = jwt.sign(
      { user_id: userId, username, email, is_admin: false },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Signup successful',
      user_id: userId,
      username,
      email,
      token,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validation
    if (!password || (!email && !username)) {
      return res.status(400).json({ error: 'Email/username and password required' });
    }

    const conn = await pool.getConnection();

    // Fetch user_auth
    const [users] = await conn.query('SELECT * FROM user_auth WHERE email = ? OR username = ?', [email || '', username || '']);

    if (users.length === 0) {
      conn.release();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      conn.release();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Log login activity
    await conn.query('INSERT INTO activity_log (user_id, action_type, target_id) VALUES (?, ?, ?)', [user.user_id, 'login', null]);

    conn.release();

    // Generate JWT
    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
