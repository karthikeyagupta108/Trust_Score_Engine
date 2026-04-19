CREATE DATABASE IF NOT EXISTS trust_score_engine;
USE trust_score_engine;

-- ============================================================
-- TABLE 1: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  trust_score FLOAT DEFAULT 50.0,
  suspicion_score FLOAT DEFAULT 0.0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 2: user_auth
-- ============================================================
CREATE TABLE IF NOT EXISTS user_auth (
  auth_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 3: topics
-- ============================================================
CREATE TABLE IF NOT EXISTS topics (
  topic_id INT AUTO_INCREMENT PRIMARY KEY,
  topic_name VARCHAR(100) NOT NULL,
  description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 4: posts
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  post_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  topic_id INT NOT NULL,
  content_hash VARCHAR(255),
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  visibility_score FLOAT DEFAULT 1.0,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 5: interactions
-- ============================================================
CREATE TABLE IF NOT EXISTS interactions (
  interaction_id INT AUTO_INCREMENT PRIMARY KEY,
  actor_user_id INT NOT NULL,
  target_post_id INT NOT NULL,
  interaction_type ENUM('upvote','downvote','report','share') NOT NULL,
  interaction_weight FLOAT DEFAULT 1.0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (target_post_id) REFERENCES posts(post_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 6: post_vote_summary
-- ============================================================
CREATE TABLE IF NOT EXISTS post_vote_summary (
  post_id INT PRIMARY KEY,
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  reports INT DEFAULT 0,
  trust_weighted_score FLOAT DEFAULT 0.0,
  FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 7: trust_graph
-- ============================================================
CREATE TABLE IF NOT EXISTS trust_graph (
  trust_id INT AUTO_INCREMENT PRIMARY KEY,
  source_user INT NOT NULL,
  target_user INT NOT NULL,
  interaction_count INT DEFAULT 1,
  trust_weight FLOAT DEFAULT 0.5,
  last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_trust_pair (source_user, target_user),
  FOREIGN KEY (source_user) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (target_user) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 8: trust_history
-- ============================================================
CREATE TABLE IF NOT EXISTS trust_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  old_score FLOAT,
  new_score FLOAT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 9: user_behavior
-- ============================================================
CREATE TABLE IF NOT EXISTS user_behavior (
  behavior_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNIQUE NOT NULL,
  posts_per_day FLOAT DEFAULT 0,
  avg_post_interval FLOAT DEFAULT 0,
  burst_activity_score FLOAT DEFAULT 0,
  interaction_entropy FLOAT DEFAULT 1.0,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 10: activity_log
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
  activity_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action_type ENUM('vote','post','report','share','login','signup') NOT NULL,
  target_id INT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 11: suspicious_users
-- ============================================================
CREATE TABLE IF NOT EXISTS suspicious_users (
  user_id INT PRIMARY KEY,
  reason VARCHAR(255),
  severity INT DEFAULT 1,
  detection_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 12: suspicious_clusters
-- ============================================================
CREATE TABLE IF NOT EXISTS suspicious_clusters (
  cluster_id INT AUTO_INCREMENT PRIMARY KEY,
  cluster_type VARCHAR(45),
  cluster_score FLOAT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE 13: cluster_members
-- ============================================================
CREATE TABLE IF NOT EXISTS cluster_members (
  cluster_id INT NOT NULL,
  user_id INT NOT NULL,
  suspicion_score INT DEFAULT 0,
  PRIMARY KEY (cluster_id, user_id),
  FOREIGN KEY (cluster_id) REFERENCES suspicious_clusters(cluster_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES suspicious_users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TRIGGERS
-- ============================================================

DELIMITER $$

-- TRIGGER 1: Trust history logging
CREATE TRIGGER trust_history_trigger
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
  IF NEW.trust_score != OLD.trust_score THEN
    INSERT INTO trust_history (user_id, old_score, new_score)
    VALUES (OLD.user_id, OLD.trust_score, NEW.trust_score);
  END IF;
END$$

-- TRIGGER 2: Update vote summary after interaction
CREATE TRIGGER vote_summary_trigger
AFTER INSERT ON interactions
FOR EACH ROW
BEGIN
  DECLARE vote_count INT DEFAULT 0;
  DECLARE downvote_count INT DEFAULT 0;
  DECLARE report_count INT DEFAULT 0;
  DECLARE weighted_score FLOAT DEFAULT 0.0;

  SELECT COALESCE(SUM(CASE WHEN i.interaction_type = 'upvote' THEN i.interaction_weight ELSE 0 END), 0)
  INTO vote_count
  FROM interactions i
  WHERE i.target_post_id = NEW.target_post_id;

  SELECT COALESCE(SUM(CASE WHEN i.interaction_type = 'downvote' THEN i.interaction_weight ELSE 0 END), 0)
  INTO downvote_count
  FROM interactions i
  WHERE i.target_post_id = NEW.target_post_id;

  SELECT COALESCE(SUM(CASE WHEN i.interaction_type = 'report' THEN i.interaction_weight ELSE 0 END), 0)
  INTO report_count
  FROM interactions i
  WHERE i.target_post_id = NEW.target_post_id;

  -- SELECT COALESCE(SUM(i.interaction_weight * u.trust_score / 100), 0)
  -- INTO weighted_score
  -- FROM interactions i
  -- JOIN users u ON i.actor_user_id = u.user_id
  -- WHERE i.target_post_id = NEW.target_post_id AND i.interaction_type = 'upvote'
  -- NOT IN
  -- SELECT COALESCE(SUM(i.interaction_weight * u.trust_score / 100), 0)
  -- FROM interactions i
  -- JOIN users u ON i.actor_user_id = u.user_id
  -- WHERE i.target_post_id = NEW.target_post_id AND i.interaction_type = 'downvote';


SELECT 
    COALESCE(SUM(
        CASE 
            WHEN i.interaction_type = 'upvote' THEN i.interaction_weight * u.trust_score / 100
            WHEN i.interaction_type = 'downvote' THEN - (i.interaction_weight * u.trust_score / 100)
            ELSE 0
        END
    ), 0)
INTO weighted_score
FROM interactions i
JOIN users u ON i.actor_user_id = u.user_id
WHERE i.target_post_id = NEW.target_post_id;


  INSERT INTO post_vote_summary (post_id, upvotes, downvotes, reports, trust_weighted_score)
  VALUES (NEW.target_post_id, vote_count, downvote_count, report_count, weighted_score)
  ON DUPLICATE KEY UPDATE
    upvotes = vote_count,
    downvotes = downvote_count,
    reports = report_count,
    trust_weighted_score = weighted_score;
END$$

DELIMITER ;

-- ============================================================
-- STORED PROCEDURES
-- ============================================================

DELIMITER $$

CREATE PROCEDURE detect_suspicious_users()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_user_id INT;
  DECLARE v_suspicion_score FLOAT;
  DECLARE v_cluster_id INT;
  DECLARE v_cluster_type VARCHAR(45);

  DECLARE user_cursor CURSOR FOR
    SELECT user_id, suspicion_score FROM users
    WHERE suspicion_score > 30 AND user_id NOT IN (SELECT user_id FROM suspicious_users);

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN user_cursor;

  read_loop: LOOP
    FETCH user_cursor INTO v_user_id, v_suspicion_score;
    IF done THEN
      LEAVE read_loop;
    END IF;

    -- Determine cluster based on suspicion score severity
    IF v_suspicion_score < 40 THEN
      SET v_cluster_type = 'Low Risk';
    ELSEIF v_suspicion_score < 70 THEN
      SET v_cluster_type = 'Medium Risk';
    ELSE
      SET v_cluster_type = 'High Risk';
    END IF;

    -- Insert into suspicious_users
    INSERT IGNORE INTO suspicious_users (user_id, reason, severity)
    VALUES (v_user_id, CONCAT('Suspicion score: ', v_suspicion_score),
            CASE WHEN v_suspicion_score >= 70 THEN 7 WHEN v_suspicion_score >= 40 THEN 4 ELSE 1 END);

    -- Get or create cluster
    SELECT cluster_id INTO v_cluster_id
    FROM suspicious_clusters
    WHERE cluster_type = v_cluster_type
    LIMIT 1;

    IF v_cluster_id IS NULL THEN
      INSERT INTO suspicious_clusters (cluster_type, cluster_score)
      VALUES (v_cluster_type, v_suspicion_score);
      SET v_cluster_id = LAST_INSERT_ID();
    END IF;

    -- Insert into cluster_members
    INSERT IGNORE INTO cluster_members (cluster_id, user_id, suspicion_score)
    VALUES (v_cluster_id, v_user_id, v_suspicion_score);
  END LOOP;

  CLOSE user_cursor;
END$$

DELIMITER ;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Topics
INSERT IGNORE INTO topics (topic_id, topic_name, description) VALUES
(1, 'Technology', 'Tech trends, innovations, and discussions'),
(2, 'Politics', 'Political news and discourse'),
(3, 'Science', 'Scientific research and discoveries'),
(4, 'Sports', 'Sports events and athlete updates'),
(5, 'Entertainment', 'Movies, music, and entertainment news');

-- Users (5 regular + 1 admin)
INSERT IGNORE INTO users (user_id, status, trust_score, suspicion_score) VALUES
(1, 'active', 92.0, 0.0),
(2, 'active', 78.0, 0.0),
(3, 'active', 65.0, 0.0),
(4, 'active', 45.0, 0.0),
(5, 'active', 20.0, 35.0),
(6, 'active', 85.0, 0.0);

-- User Auth (passwords: bcrypt hashed - in production these would be properly hashed)
-- For now using placeholder values; backend will handle actual hashing
INSERT IGNORE INTO user_auth (user_id, username, email, password_hash, is_admin) VALUES
(1, 'alice_truth', 'alice@trust.io', '$2b$10$dXJ3SW6G7P50eS3xsVlCmeiKZbStbu.3d0hgWWK5Zt6WlxJnCo9o.', FALSE),
(2, 'bob_reliable', 'bob@trust.io', '$2b$10$N9qo8uLOickgx2ZMRZoM.eDwgoHgSvNUUjqSSQvtQrVC1Yn5WZKHM', FALSE),
(3, 'charlie_steady', 'charlie@trust.io', '$2b$10$V3ND6obweHHV0FfY2ti8Z.DwHWjNBH9yr0zQeChw5XYbVxWv2KVBS', FALSE),
(4, 'diana_moderate', 'diana@trust.io', '$2b$10$WQvLX3z6LuRcDyVfVnDx6.W.uG7/3h2nJL8b3n9l4g5H1j2K3m4N', FALSE),
(5, 'eve_suspicious', 'eve@trust.io', '$2b$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP', FALSE),
(6, 'admin_user', 'admin@trust.io', '$2b$10$abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOP', TRUE);

-- User Behavior
INSERT IGNORE INTO user_behavior (user_id, posts_per_day, avg_post_interval, burst_activity_score, interaction_entropy) VALUES
(1, 2.5, 600.0, 0.2, 0.85),
(2, 2.0, 720.0, 0.3, 0.88),
(3, 1.5, 960.0, 0.4, 0.75),
(4, 1.0, 1440.0, 0.5, 0.65),
(5, 8.5, 180.0, 0.95, 0.2),
(6, 0.5, 2880.0, 0.1, 0.90);

-- Posts
INSERT IGNORE INTO posts (post_id, user_id, topic_id, content) VALUES
(1, 1, 1, 'Just launched our new AI framework! Really excited to share this with the community.'),
(2, 2, 3, 'Latest research shows quantum computing breakthrough in error correction methods.'),
(3, 3, 4, 'The championship game yesterday was absolutely incredible! Best match of the season.'),
(4, 1, 2, 'Important discussion about digital privacy policies in 2026.'),
(5, 4, 5, 'Have you watched the new sci-fi series? Highly recommended!'),
(6, 2, 1, 'Docker containers have revolutionized our deployment pipeline.'),
(7, 3, 3, 'Fascinating study on neuroplasticity and learning algorithms.'),
(8, 5, 2, 'URGENT: Check out this crazy theory about political conspiracies!!!'),
(9, 1, 4, 'Sports analytics is transforming how teams train and prepare.'),
(10, 6, 5, 'Entertainment industry trends for the upcoming quarter.');

-- Interactions (votes, reports, shares)
INSERT IGNORE INTO interactions (actor_user_id, target_post_id, interaction_type, interaction_weight) VALUES
(1, 2, 'upvote', 1.0),
(2, 1, 'upvote', 1.0),
(3, 1, 'upvote', 1.0),
(4, 1, 'upvote', 1.0),
(1, 3, 'upvote', 1.0),
(2, 4, 'upvote', 1.0),
(3, 5, 'share', 1.5),
(1, 6, 'upvote', 1.0),
(2, 7, 'upvote', 1.0),
(4, 8, 'report', 1.0),
(1, 8, 'report', 1.0),
(5, 9, 'upvote', 1.0),
(5, 2, 'downvote', 1.0),
(6, 10, 'upvote', 1.0);

-- Post Vote Summaries (initial)
INSERT IGNORE INTO post_vote_summary (post_id, upvotes, downvotes, reports, trust_weighted_score) VALUES
(1, 3, 0, 0, 2.45),
(2, 1, 0, 0, 0.78),
(3, 1, 0, 0, 0.92),
(4, 1, 0, 0, 0.85),
(5, 0, 0, 0, 0.0),
(6, 1, 0, 0, 0.78),
(7, 1, 0, 0, 0.65),
(8, 0, 0, 2, -0.85),
(9, 1, 0, 0, 0.92),
(10, 1, 0, 0, 0.85);

-- Trust Graph
INSERT IGNORE INTO trust_graph (source_user, target_user, interaction_count, trust_weight) VALUES
(1, 2, 3, 0.85),
(2, 1, 2, 0.80),
(1, 3, 2, 0.75),
(3, 1, 1, 0.70),
(2, 3, 1, 0.65),
(1, 4, 1, 0.55),
(5, 1, 1, 0.20),
(1, 5, 2, 0.25),
(6, 1, 1, 0.90);

-- Activity Log
INSERT IGNORE INTO activity_log (user_id, action_type, target_id) VALUES
(1, 'signup', NULL),
(2, 'signup', NULL),
(3, 'signup', NULL),
(4, 'signup', NULL),
(5, 'signup', NULL),
(6, 'signup', NULL),
(1, 'post', 1),
(2, 'post', 2),
(1, 'vote', 2),
(2, 'vote', 1);

-- Trust History
INSERT IGNORE INTO trust_history (user_id, old_score, new_score) VALUES
(1, 50.0, 92.0),
(2, 50.0, 78.0),
(3, 50.0, 65.0),
(4, 50.0, 45.0),
(5, 50.0, 20.0),
(6, 50.0, 85.0);
