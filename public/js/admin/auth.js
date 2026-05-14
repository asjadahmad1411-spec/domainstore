// Shared admin auth utilities — included on every admin page

function getAdminToken() { return localStorage.getItem('ds_admin_token'); }
function setAdminToken(t) { localStorage.setItem('ds_admin_token', t); }
function clearAdminToken() { localStorage.removeItem('ds_admin_token'); }

function requireAdminAuth() {
  if (!getAdminToken() && !location.pathname.endsWith('/admin/index.html') && !location.pathname.endsWith('/admin/')) {
    location.href = '/admin/index.html';
  }
}

function adminLogout() {
  clearAdminToken();
  location.href = '/admin/index.html';
}

async function apiFetch(url, options = {}) {
  const token = getAdminToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) { clearAdminToken(); location.href = '/admin/index.html'; throw new Error('Unauthorized'); }
  return res.json();
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
}

function initSidebarToggle() {
  const btn = document.getElementById('sidebarToggle');
  const sb = document.getElementById('sidebar');
  if (btn && sb) {
    btn.addEventListener('click', () => sb.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (sb.classList.contains('open') && !sb.contains(e.target) && e.target !== btn) sb.classList.remove('open');
    });
  }
}

// Login page handler
async function doLogin() {
  const username = document.getElementById('adminUser')?.value.trim();
  const password = document.getElementById('adminPass')?.value;
  const btn = document.getElementById('loginBtn');
  const errEl = document.getElementById('loginError');
  if (!username || !password) { if (errEl) { errEl.textContent = 'Enter username and password'; errEl.style.display='flex'; } return; }
  if (btn) { btn.textContent = '⏳ Logging in...'; btn.disabled = true; }
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }).then(r => r.json());
    if (res.success) {
      setAdminToken(res.token);
      location.href = '/admin/dashboard.html';
    } else {
      if (errEl) { errEl.textContent = '❌ Invalid credentials'; errEl.style.display='flex'; }
      if (btn) { btn.textContent = '🔓 Login to Admin Panel'; btn.disabled = false; }
    }
  } catch (e) {
    if (errEl) { errEl.textContent = '❌ Server error. Is the server running?'; errEl.style.display='flex'; }
    if (btn) { btn.textContent = '🔓 Login to Admin Panel'; btn.disabled = false; }
  }
}

// Auto-run auth check and sidebar init on page load (except login page)
document.addEventListener('DOMContentLoaded', () => {
  const isLoginPage = location.pathname.endsWith('/admin/index.html') || location.pathname === '/admin/' || location.pathname.endsWith('/admin');
  if (!isLoginPage) {
    requireAdminAuth();
    initSidebarToggle();
    const d = document.getElementById('dateStr');
    if (d) d.textContent = new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  }
});
