async function loadProfile() {
  try {
    const userId = localStorage.getItem('user_id');

    // Load profile
    const profileRes = await apiCall('/users/me');
    const profile = await profileRes.json();

    if (profileRes.ok) {
      const avatar = profile.username.charAt(0).toUpperCase();
      document.getElementById('profileAvatar').textContent = avatar;
      document.getElementById('profileUsername').textContent = profile.username;

      const memberDate = new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      document.getElementById('memberSince').textContent = `Member since ${memberDate}`;
      document.getElementById('statusBadge').textContent = profile.status
        .charAt(0)
        .toUpperCase() + profile.status.slice(1);

      // Set scores
      document.getElementById('trustScoreDisplay').textContent = profile.trust_score.toFixed(1);
      document.getElementById('suspicionScoreDisplay').textContent = profile.suspicion_score.toFixed(1);

      // Animate circular progress
      const trustPercent = (profile.trust_score / 100) * 314;
      const trustCircle = document.getElementById('trustCircleFill');
      trustCircle.style.strokeDashoffset = 314 - trustPercent;

      const suspPercent = (profile.suspicion_score / 100) * 314;
      const suspCircle = document.getElementById('suspicionCircleFill');
      suspCircle.style.strokeDashoffset = 314 - suspPercent;

      // Set trust label
      let trustLabel = 'Excellent';
      if (profile.trust_score >= 80) trustLabel = 'Excellent';
      else if (profile.trust_score >= 60) trustLabel = 'Very Good';
      else if (profile.trust_score >= 40) trustLabel = 'Good';
      else if (profile.trust_score >= 20) trustLabel = 'Fair';
      else trustLabel = 'Poor';
      document.getElementById('trustLabel').textContent = trustLabel;

      // Set suspicion label
      let suspLabel = 'Low Risk';
      if (profile.suspicion_score >= 70) suspLabel = 'High Risk';
      else if (profile.suspicion_score >= 40) suspLabel = 'Medium Risk';
      else suspLabel = 'Low Risk';
      document.getElementById('suspicionLabel').textContent = suspLabel;
    }

    // Load trust history
    await loadTrustHistory(userId);

    // Load activity
    await loadActivity(userId);

    // Load behavior
    await loadBehavior(userId);

    // Load posts
    await loadUserPosts(userId);

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        switchTab(tabName);
      });
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    showToast('Failed to load profile', 'error');
  }
}

async function loadTrustHistory(userId) {
  try {
    const res = await apiCall(`/users/${userId}/trust-history?page=1`);
    const data = await res.json();

    const table = document.getElementById('historyTable');
    table.innerHTML = '';

    if (data.data.length === 0) {
      table.innerHTML = '<tr><td colspan="4">No trust history</td></tr>';
      return;
    }

    data.data.forEach((entry) => {
      const change = entry.new_score - entry.old_score;
      const changeClass = change > 0 ? 'positive' : 'negative';
      const changeSign = change > 0 ? '+' : '';
      const date = new Date(entry.updated_at).toLocaleDateString();

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${date}</td>
        <td>${entry.old_score.toFixed(2)}</td>
        <td>${entry.new_score.toFixed(2)}</td>
        <td><span class="change-badge ${changeClass}">${changeSign}${change.toFixed(2)}</span></td>
      `;
      table.appendChild(row);
    });
  } catch (error) {
    console.error('Error loading trust history:', error);
  }
}

async function loadActivity(userId) {
  try {
    const res = await apiCall(`/users/${userId}/activity?limit=10`);
    const activities = await res.json();

    const list = document.getElementById('activityList');
    list.innerHTML = '';

    const iconMap = {
      vote: '🗳',
      post: '📝',
      report: '🚩',
      share: '🔗',
      login: '🔑',
      signup: '✨',
    };

    if (activities.length === 0) {
      list.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No recent activity</div>';
      return;
    }

    activities.forEach((activity) => {
      const icon = iconMap[activity.action_type] || '📍';
      const date = new Date(activity.timestamp).toLocaleDateString();

      const item = document.createElement('div');
      item.className = 'activity-item';
      item.innerHTML = `
        <div class="activity-icon">${icon}</div>
        <div class="activity-details">
          <div class="activity-type">${activity.action_type.toUpperCase()}</div>
          <div class="activity-time">${date}</div>
        </div>
      `;
      list.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading activity:', error);
  }
}

async function loadBehavior(userId) {
  try {
    const res = await apiCall(`/users/${userId}/behavior`);
    const behavior = await res.json();

    document.getElementById('postsPerDay').textContent = behavior.posts_per_day.toFixed(2);
    document.getElementById('avgPostInterval').textContent = behavior.avg_post_interval.toFixed(2);
    document.getElementById('burstActivityScore').textContent =
      behavior.burst_activity_score.toFixed(2);
    document.getElementById('interactionEntropy').textContent =
      behavior.interaction_entropy.toFixed(2);
  } catch (error) {
    console.error('Error loading behavior:', error);
  }
}

async function loadUserPosts(userId) {
  try {
    const res = await apiCall('/posts');
    const allPosts = await res.json();
    const userPosts = allPosts.filter((p) => p.user_id === parseInt(userId));

    const list = document.getElementById('postsList');
    list.innerHTML = '';

    if (userPosts.length === 0) {
      list.innerHTML =
        '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No posts yet</div>';
      return;
    }

    userPosts.forEach((post) => {
      const date = new Date(post.created_at).toLocaleDateString();

      const card = document.createElement('div');
      card.className = 'post-card';
      card.innerHTML = `
        <div class="post-topic">${post.topic_name}</div>
        <div class="post-content">${post.content}</div>
        <div class="post-score">
          Score: <span class="post-score-value">${
        post.trust_weighted_score ? post.trust_weighted_score.toFixed(2) : '0.00'
      }</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem;">${date}</div>
      `;
      list.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading posts:', error);
  }
}

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-pane').forEach((pane) => {
    pane.classList.remove('active');
  });

  // Remove active class from all buttons
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.remove('active');
  });

  // Show selected tab
  document.getElementById(tabName).classList.add('active');

  // Add active class to button
  event.target.classList.add('active');
}

document.addEventListener('DOMContentLoaded', loadProfile);
