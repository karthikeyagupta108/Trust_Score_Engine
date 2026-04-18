async function loadAdminPanel() {
  try {
    // Check if user is admin
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    if (!isAdmin) {
      window.location.href = '/dashboard.html';
      return;
    }

    // Load stats
    await loadStats();

    // Load initial data
    await loadSuspiciousUsers();
    await loadClusters();
    await loadTrustHistory();

    // Panel switching
    document.querySelectorAll('.admin-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.getAttribute('data-panel');
        switchAdminPanel(panel);
      });
    });
  } catch (error) {
    console.error('Error loading admin panel:', error);
    showToast('Failed to load admin panel', 'error');
  }
}

async function loadStats() {
  try {
    const res = await apiCall('/admin/stats');
    const stats = await res.json();

    if (res.ok) {
      document.getElementById('totalUsers').textContent = stats.total_users;
      document.getElementById('avgTrust').textContent = stats.avg_trust_score;
      document.getElementById('suspiciousCount').textContent = stats.suspicious_users;
      document.getElementById('suspiciousPercent').textContent = stats.suspicious_percentage;
      document.getElementById('totalPosts').textContent = stats.total_posts;
      document.getElementById('topTopic').textContent = stats.most_active_topic;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function loadSuspiciousUsers() {
  try {
    const res = await apiCall('/admin/suspicious');
    const users = await res.json();

    if (res.ok) {
      const table = document.getElementById('suspiciousTable');
      table.innerHTML = '';

      if (users.length === 0) {
        table.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">No suspicious users</td></tr>';
        return;
      }

      users.forEach((user) => {
        const date = new Date(user.detection_time).toLocaleDateString();
        const severityClass = user.severity < 4 ? 'low' : user.severity < 7 ? 'medium' : 'high';

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${user.user_id}</td>
          <td>${user.username}</td>
          <td>${user.trust_score.toFixed(1)}</td>
          <td>${user.suspicion_score.toFixed(1)}</td>
          <td>${user.reason}</td>
          <td><span class="severity-badge severity-${severityClass}">${user.severity}</span></td>
          <td>${user.cluster_type || 'N/A'}</td>
          <td>${date}</td>
        `;
        table.appendChild(row);
      });
    }
  } catch (error) {
    console.error('Error loading suspicious users:', error);
  }
}

async function loadClusters() {
  try {
    const res = await apiCall('/admin/clusters');
    const clusters = await res.json();

    if (res.ok) {
      const grid = document.getElementById('clustersGrid');
      grid.innerHTML = '';

      if (clusters.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted);">No clusters yet</div>';
        return;
      }

      clusters.forEach((cluster) => {
        const riskClass = cluster.cluster_type === 'Low Risk' ? 'low-risk' : cluster.cluster_type === 'Medium Risk' ? 'medium-risk' : 'high-risk';

        const card = document.createElement('div');
        card.className = `cluster-card ${riskClass}`;
        card.innerHTML = `
          <h3>${cluster.cluster_type}</h3>
          <div class="cluster-stat">
            <span class="cluster-stat-label">Members:</span>
            <span class="cluster-stat-value">${cluster.member_count || 0}</span>
          </div>
          <div class="cluster-stat">
            <span class="cluster-stat-label">Avg Suspicion:</span>
            <span class="cluster-stat-value">${cluster.avg_suspicion ? cluster.avg_suspicion.toFixed(2) : 'N/A'}</span>
          </div>
          <div class="cluster-stat">
            <span class="cluster-stat-label">Score:</span>
            <span class="cluster-stat-value">${cluster.cluster_score.toFixed(2)}</span>
          </div>
        `;
        grid.appendChild(card);
      });
    }
  } catch (error) {
    console.error('Error loading clusters:', error);
  }
}

async function loadTrustHistory(userId = null) {
  try {
    let endpoint = '/admin/trust-history?limit=20';
    if (userId) {
      endpoint += `&user_id=${userId}`;
    }

    const res = await apiCall(endpoint);
    const history = await res.json();

    if (res.ok) {
      const table = document.getElementById('historyTable');
      table.innerHTML = '';

      if (history.length === 0) {
        table.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">No history found</td></tr>';
        return;
      }

      history.forEach((entry) => {
        const change = entry.new_score - entry.old_score;
        const changeClass = change > 0 ? 'positive' : 'negative';
        const changeSign = change > 0 ? '+' : '';
        const date = new Date(entry.updated_at).toLocaleDateString();

        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${entry.username}</td>
          <td>${entry.old_score.toFixed(2)}</td>
          <td>${entry.new_score.toFixed(2)}</td>
          <td><span class="change-badge ${changeClass}">${changeSign}${change.toFixed(2)}</span></td>
          <td>${date}</td>
        `;
        table.appendChild(row);
      });
    }
  } catch (error) {
    console.error('Error loading trust history:', error);
  }
}

function filterTrustHistory() {
  const userId = document.getElementById('historyUserFilter').value;
  loadTrustHistory(userId || null);
}

async function recalculateSuspicious() {
  try {
    const res = await apiCall('/admin/recalculate', 'POST');

    if (res.ok) {
      showToast('Suspicious user detection recalculated', 'success');
      // Reload data
      setTimeout(() => {
        loadStats();
        loadSuspiciousUsers();
        loadClusters();
      }, 500);
    } else {
      showToast('Failed to recalculate', 'error');
    }
  } catch (error) {
    console.error('Error recalculating:', error);
    showToast('Error recalculating suspicious users', 'error');
  }
}

function switchAdminPanel(panelName) {
  // Hide all panels
  document.querySelectorAll('.admin-panel').forEach((panel) => {
    panel.classList.remove('active');
  });

  // Remove active class from all buttons
  document.querySelectorAll('.admin-nav-btn').forEach((btn) => {
    btn.classList.remove('active');
  });

  // Show selected panel
  document.getElementById(panelName + 'Panel').classList.add('active');

  // Add active class to button
  event.target.classList.add('active');
}

document.addEventListener('DOMContentLoaded', loadAdminPanel);
