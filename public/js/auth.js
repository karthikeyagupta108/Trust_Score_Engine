// Auth utilities
const API_BASE = 'http://localhost:3000/api';

// Check authentication on page load
function checkAuth() {
  const token = localStorage.getItem('token');
  const username = localStorage.getItem('username');
  const is_admin = localStorage.getItem('is_admin') === 'true';

  if (!token) {
    // Not logged in, redirect to login if on protected page
    const protectedPages = ['dashboard.html', 'feed.html', 'profile.html', 'admin.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (protectedPages.includes(currentPage)) {
      window.location.href = '/login.html';
    }
    return;
  }

  // Update user display
  if (username) {
    const userDisplay = document.getElementById('userDisplay');
    if (userDisplay) {
      userDisplay.textContent = username;
    }
  }

  // Show admin link if admin
  if (is_admin) {
    const adminLink = document.getElementById('adminLink');
    if (adminLink) {
      adminLink.innerHTML = '<a href="/admin.html" class="nav-link">Admin</a>';
    }
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('username');
  localStorage.removeItem('is_admin');
  window.location.href = '/login.html';
}

// API helper
async function apiCall(endpoint, method = 'GET', body = null) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);

  if (response.status === 401) {
    logout();
    throw new Error('Unauthorized');
  }

  return response;
}

// Toast notification
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type}`;

  setTimeout(() => {
    toast.className = 'toast hidden';
  }, 3000);
}

// Initialize auth on DOM ready
document.addEventListener('DOMContentLoaded', checkAuth);
