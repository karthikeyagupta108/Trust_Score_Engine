let trustChart;

async function loadDashboard() {
  try {
    const userId = localStorage.getItem('user_id');

    // Load user profile
    const profileRes = await apiCall('/users/me');
    const profile = await profileRes.json();

    if (profileRes.ok) {
      document.getElementById('trustScore').textContent = profile.trust_score.toFixed(1);
      document.getElementById('suspicionScore').textContent = profile.suspicion_score.toFixed(1);

      // Set trust score bar
      const trustPercent = (profile.trust_score / 100) * 100;
      const trustBar = document.getElementById('trustScoreBar');
      trustBar.style.width = trustPercent + '%';

      // Set trust status
      let status = '';
      if (profile.trust_score >= 70) {
        status = '✓ Excellent standing';
      } else if (profile.trust_score >= 40) {
        status = '~ Fair standing';
      } else {
        status = '✗ Low standing';
      }
      document.getElementById('trustStatus').textContent = status;

      // Set suspicion score bar
      const suspPercent = (profile.suspicion_score / 100) * 100;
      const suspBar = document.getElementById('suspicionScoreBar');
      suspBar.style.width = suspPercent + '%';

      // Show warning if suspicious
      const warning = document.getElementById('suspicionWarning');
      if (profile.suspicion_score > 30) {
        warning.classList.remove('hidden');
      }
    }

    // Load activity
    const activityRes = await apiCall(`/users/${userId}/activity?limit=5`);
    const activities = await activityRes.json();

    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '';

    const iconMap = {
      vote: '🗳',
      post: '📝',
      report: '🚩',
      share: '🔗',
      login: '🔑',
      signup: '✨',
    };

    activities.forEach((activity) => {
      const icon = iconMap[activity.action_type] || '📍';
      const date = new Date(activity.timestamp);
      const timeAgo = formatTimeAgo(date);

      const item = document.createElement('div');
      item.className = 'activity-item';
      item.innerHTML = `
        <div class="activity-icon">${icon}</div>
        <div class="activity-details">
          <div class="activity-type">${activity.action_type.toUpperCase()}</div>
          <div class="activity-time">${timeAgo}</div>
        </div>
      `;
      activityList.appendChild(item);
    });

    // Load trust history for chart
    const historyRes = await apiCall(`/users/${userId}/trust-history?limit=30`);
    const history = await historyRes.json();

    if (historyRes.ok) {
      loadTrustChart(history.data);
    }

    // Load behavior metrics
    const behaviorRes = await apiCall(`/users/${userId}/behavior`);
    const behavior = await behaviorRes.json();

    if (behaviorRes.ok) {
      document.getElementById('postsPerDayVal').textContent = behavior.posts_per_day.toFixed(2);
      document.getElementById('burstActivityVal').textContent = behavior.burst_activity_score.toFixed(2);
      document.getElementById('entropyVal').textContent = behavior.interaction_entropy.toFixed(2);

      // Set metric bars (scale appropriately)
      const postsBar = document.getElementById('postsPerDayBar');
      postsBar.innerHTML = `<div style="width: ${Math.min(behavior.posts_per_day * 20, 100)}%; height: 100%; background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan)); border-radius: 2px; transition: width 0.6s ease;"></div>`;

      const burstBar = document.getElementById('burstActivityBar');
      burstBar.innerHTML = `<div style="width: ${behavior.burst_activity_score * 100}%; height: 100%; background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan)); border-radius: 2px; transition: width 0.6s ease;"></div>`;

      const entropyBar = document.getElementById('entropyBar');
      entropyBar.innerHTML = `<div style="width: ${behavior.interaction_entropy * 50}%; height: 100%; background: linear-gradient(90deg, var(--accent-blue), var(--accent-cyan)); border-radius: 2px; transition: width 0.6s ease;"></div>`;
    }

    // Load leaderboard
    const leaderboardRes = await apiCall('/trust/leaderboard');
    const leaderboard = await leaderboardRes.json();

    if (leaderboardRes.ok) {
      const leaderboardEl = document.getElementById('leaderboard');
      leaderboardEl.innerHTML = '';

      leaderboard.forEach((user, index) => {
        const rank = index + 1;
        let badgeClass = '';
        if (rank === 1) badgeClass = 'gold';
        if (rank === 2) badgeClass = 'silver';
        if (rank === 3) badgeClass = 'bronze';

        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `
          <div class="rank-badge ${badgeClass}">#${rank}</div>
          <div class="leaderboard-info">
            <div class="leaderboard-name">${user.username}</div>
            <div class="leaderboard-score">${user.trust_score.toFixed(1)} pts</div>
          </div>
          <div class="leaderboard-bar">
            <div class="leaderboard-score-bar">
              <div class="leaderboard-score-bar-fill" style="width: ${(user.trust_score / 100) * 100}%"></div>
            </div>
            <div class="leaderboard-score-val">${user.trust_score.toFixed(1)}</div>
          </div>
        `;
        leaderboardEl.appendChild(item);
      });
    }

    // Load post and interaction counts
    const postsRes = await apiCall('/posts');
    const posts = await postsRes.json();
    document.getElementById('totalPosts').textContent = posts.length;

    // Count interactions (rough estimate from posts)
    let interactionCount = 0;
    posts.forEach((post) => {
      if (post.upvotes) interactionCount += post.upvotes;
      if (post.downvotes) interactionCount += post.downvotes;
      if (post.reports) interactionCount += post.reports;
    });
    document.getElementById('totalInteractions').textContent = interactionCount;
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showToast('Failed to load dashboard data', 'error');
  }
}

function loadTrustChart(historyData) {
  const ctx = document.getElementById('trustChart').getContext('2d');

  // Sort by date
  historyData.sort((a, b) => new Date(a.updated_at) - new Date(b.updated_at));

  const labels = historyData.map((h) => new Date(h.updated_at).toLocaleDateString());
  const dataPoints = historyData.map((h) => h.new_score);

  if (trustChart) {
    trustChart.destroy();
  }

  trustChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Trust Score',
          data: dataPoints,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#3b82f6',
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#f1f5f9',
            font: { family: 'Inter, sans-serif' },
          },
        },
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter, sans-serif' },
          },
          grid: {
            color: 'rgba(30, 41, 59, 0.3)',
          },
        },
        x: {
          ticks: {
            color: '#94a3b8',
            font: { family: 'Inter, sans-serif' },
          },
          grid: {
            display: false,
          },
        },
      },
    },
  });
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

document.addEventListener('DOMContentLoaded', loadDashboard);
