let currentTopic = 'all';

async function loadFeed(topicId = null) {
  try {
    let endpoint = '/posts';
    if (topicId && topicId !== 'all') {
      endpoint += `?topic_id=${topicId}`;
    }

    const res = await apiCall(endpoint);
    const posts = await res.json();

    const grid = document.getElementById('postsGrid');
    grid.innerHTML = '';

    if (posts.length === 0) {
      document.getElementById('emptyState').classList.remove('hidden');
      return;
    }

    document.getElementById('emptyState').classList.add('hidden');

    posts.forEach((post, index) => {
      const avatar = post.username.charAt(0).toUpperCase();
      const date = new Date(post.created_at);
      const timeAgo = formatTimeAgo(date);

      const trustBadge =
        post.trust_score >= 70 ? '✓' : post.trust_score >= 40 ? '·' : '!';

      const card = document.createElement('div');
      card.className = 'post-card';
      card.style.animation = `fadeInScale 0.3s ease ${index * 0.05}s backwards`;
      card.innerHTML = `
        <div class="post-header">
          <div class="post-avatar">${avatar}</div>
          <div class="post-info">
            <div class="post-author">
              ${post.username}
              <span class="trust-badge">${trustBadge}</span>
            </div>
            <div class="post-time">${timeAgo}</div>
          </div>
        </div>
        <div class="post-topic">${post.topic_name}</div>
        <div class="post-content">${post.content}</div>
        <div class="post-score">
          Trust-Weighted Score: <span class="post-score-value">${
        post.trust_weighted_score ? post.trust_weighted_score.toFixed(2) : '0.00'
      }</span>
        </div>
        <div class="post-actions">
          <button class="post-action-btn" onclick="votePost(${post.post_id}, 'upvote')">👍 ${
        post.upvotes || 0
      }</button>
          <button class="post-action-btn" onclick="votePost(${post.post_id}, 'downvote')">👎 ${
        post.downvotes || 0
      }</button>
          <button class="post-action-btn" onclick="votePost(${post.post_id}, 'report')">🚩 ${
        post.reports || 0
      }</button>
          <button class="post-action-btn" onclick="sharePost(${post.post_id})">🔗</button>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading feed:', error);
    showToast('Failed to load posts', 'error');
  }
}

async function votePost(postId, type) {
  try {
    const res = await apiCall('/interactions', 'POST', {
      target_post_id: postId,
      interaction_type: type,
    });

    if (res.ok) {
      const data = await res.json();
      showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} recorded!`, 'success');
      // Refresh feed to show updated counts
      setTimeout(() => loadFeed(currentTopic !== 'all' ? currentTopic : null), 500);
    } else {
      const error = await res.json();
      showToast(error.error || 'Failed to record vote', 'error');
    }
  } catch (error) {
    console.error('Error voting:', error);
    showToast('Failed to record vote', 'error');
  }
}

async function sharePost(postId) {
  try {
    const res = await apiCall('/interactions', 'POST', {
      target_post_id: postId,
      interaction_type: 'share',
    });

    if (res.ok) {
      showToast('Post shared!', 'success');
      setTimeout(() => loadFeed(currentTopic !== 'all' ? currentTopic : null), 500);
    } else {
      const error = await res.json();
      showToast(error.error || 'Failed to share', 'error');
    }
  } catch (error) {
    console.error('Error sharing:', error);
    showToast('Failed to share post', 'error');
  }
}

function openNewPostModal() {
  document.getElementById('postModal').classList.remove('hidden');
}

function closeNewPostModal() {
  document.getElementById('postModal').classList.add('hidden');
  document.getElementById('newPostForm').reset();
}

async function createPost(e) {
  e.preventDefault();

  const topicId = document.getElementById('topicSelect').value;
  const content = document.getElementById('postContent').value;

  if (!topicId || !content) {
    showToast('Please fill in all fields', 'error');
    return;
  }

  try {
    const res = await apiCall('/posts', 'POST', {
      topic_id: parseInt(topicId),
      content,
    });

    if (res.ok) {
      showToast('Post created successfully!', 'success');
      closeNewPostModal();
      loadFeed(currentTopic !== 'all' ? currentTopic : null);
    } else {
      const error = await res.json();
      showToast(error.error || 'Failed to create post', 'error');
    }
  } catch (error) {
    console.error('Error creating post:', error);
    showToast('Failed to create post', 'error');
  }
}

function formatTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

document.addEventListener('DOMContentLoaded', () => {
  loadFeed();

  // Topic filter buttons
  document.querySelectorAll('.topic-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.topic-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentTopic = btn.getAttribute('data-topic');
      loadFeed(currentTopic !== 'all' ? currentTopic : null);
    });
  });

  // New post form
  document.getElementById('newPostForm').addEventListener('submit', createPost);

  // Close modal on background click
  document.getElementById('postModal').addEventListener('click', (e) => {
    if (e.target.id === 'postModal') {
      closeNewPostModal();
    }
  });
});
