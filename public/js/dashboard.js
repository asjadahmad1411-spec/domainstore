// Shared dashboard JS utilities
const DS_TOKEN_KEY = 'ds_user_token';
const DS_USER_KEY  = 'ds_user';

function getDsToken() { return localStorage.getItem(DS_TOKEN_KEY); }
function getDsUser()  { try { return JSON.parse(localStorage.getItem(DS_USER_KEY) || 'null'); } catch { return null; } }

function dsLogout() {
  localStorage.removeItem(DS_TOKEN_KEY);
  localStorage.removeItem(DS_USER_KEY);
  location.href = '/login.html';
}

function requireDsAuth() {
  if (!getDsToken()) { location.href = '/login.html'; return false; }
  return true;
}

async function dsApi(path, options = {}) {
  const token = getDsToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? 'Bearer ' + token : '',
      ...(options.headers || {})
    }
  });
  const data = await res.json();
  if (res.status === 401) { dsLogout(); throw new Error('Session expired'); }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function dsToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 3500);
}

function getStatusBadge(status) {
  const map = {
    'Active':      '<span class="status-active">✅ Active</span>',
    'Pending':     '<span class="status-pending">⏳ Pending</span>',
    'UTR Pending': '<span class="status-utr">🏦 UTR Pending</span>',
    'Cancelled':   '<span class="status-cancelled">❌ Cancelled</span>',
    'default':     `<span class="status-pending">${status}</span>`
  };
  return map[status] || map['default'];
}

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtAmt(n) { return '₹' + (n || 0).toLocaleString('en-IN'); }

function copyText(text, label) {
  navigator.clipboard.writeText(text).then(() => dsToast('📋 Copied: ' + (label || text), 'success'));
}

// Sidebar mobile toggle
function initDashSidebar() {
  const toggle  = document.getElementById('dashMobileToggle');
  const sidebar = document.getElementById('dashSidebar');
  const overlay = document.getElementById('dashOverlay');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('show');
    });
    if (overlay) overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
  // Set active nav item
  const path = location.pathname;
  document.querySelectorAll('.dash-nav-item').forEach(a => {
    if (a.href && a.href.includes(path.split('/').pop())) a.classList.add('active');
  });
  // Fill user info
  const user = getDsUser();
  if (user) {
    const av = document.getElementById('dashAvatar');
    const un = document.getElementById('dashUserName');
    const ue = document.getElementById('dashUserEmail');
    if (av) av.textContent = (user.name || 'U')[0].toUpperCase();
    if (un) un.textContent = user.name || 'User';
    if (ue) ue.textContent = user.email || '';
  }
}
