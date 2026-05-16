// ═══════════════════════════════════════════════════════════
// main.js — DomainStore Global Script
// ═══════════════════════════════════════════════════════════

// ── Cart ──────────────────────────────────────────────────────
const getCart  = () => JSON.parse(localStorage.getItem('ds_cart') || '[]');
const saveCart = (c) => { localStorage.setItem('ds_cart', JSON.stringify(c)); updateCartBadge(); };
const updateCartBadge = () => {
  const n = getCart().length;
  document.querySelectorAll('#cartCount').forEach(el => el.textContent = n);
};

function addToCart(item) {
  const cart = getCart();
  if (cart.find(i => i.id === item.id)) { showToast(`${item.name} already in cart!`, 'error'); return; }
  cart.push(item);
  saveCart(cart);
  showToast(`✅ ${item.name} added to cart!`, 'success');
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Theme (apply immediately before DOM ready) ────────────────
(function() {
  if (localStorage.getItem('ds_theme') === 'light') document.body.classList.add('light-mode');
})();

function toggleTheme() {
  const isLight = document.body.classList.toggle('light-mode');
  localStorage.setItem('ds_theme', isLight ? 'light' : 'dark');
  document.querySelectorAll('#themeToggle').forEach(b => {
    b.textContent = isLight ? '☀️' : '🌙';
    b.title = isLight ? 'Switch Dark Mode' : 'Switch Light Mode';
  });
}

// ── Preloader ─────────────────────────────────────────────────
(function() {
  document.documentElement.classList.add('page-loading');
  if (!document.getElementById('preloader')) {
    const pl = document.createElement('div');
    pl.id = 'preloader';
    pl.innerHTML = `<div class="preloader-logo">🌐 DomainStore</div>
      <div class="preloader-bar"><div class="preloader-bar-fill"></div></div>
      <div class="preloader-dots"><span></span><span></span><span></span></div>`;
    document.addEventListener('DOMContentLoaded', () => document.body.insertBefore(pl, document.body.firstChild));
  }
  function hide() {
    const pl = document.getElementById('preloader');
    if (pl) pl.classList.add('hidden');
    document.documentElement.classList.remove('page-loading');
  }
  if (document.readyState === 'complete') setTimeout(hide, 200);
  else window.addEventListener('load', () => setTimeout(hide, 350));
})();

// ════════════════════════════════════════════════════════════
// DOMContentLoaded — runs ONCE, handles everything
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {

  updateCartBadge();

  // ── Theme button state ──────────────────────────────────
  const isLight = document.body.classList.contains('light-mode');
  document.querySelectorAll('#themeToggle').forEach(b => {
    b.textContent = isLight ? '☀️' : '🌙';
    b.title = isLight ? 'Switch Dark Mode' : 'Switch Light Mode';
  });

  // ── Auth button (Login / Account name) ─────────────────
  const token = localStorage.getItem('ds_user_token');
  const user  = (() => { try { return JSON.parse(localStorage.getItem('ds_user') || 'null'); } catch { return null; } })();
  document.querySelectorAll('#navAuthBtn, .mobile-login-link').forEach(el => {
    if (token && user) {
      const name = (user.name || 'Account').split(' ')[0];
      el.textContent = '👤 ' + name;
      el.href = '/dashboard/';
    } else {
      el.textContent = '👤 Login';
      el.href = '/login.html';
    }
  });

  // ── HAMBURGER MENU ── (SINGLE handler, no duplicates) ───
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    // Remove any cloned node listeners by replacing element
    const newHb = hamburger.cloneNode(true);
    hamburger.parentNode.replaceChild(newHb, hamburger);

    newHb.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      const open = navLinks.classList.toggle('open');
      newHb.classList.toggle('active', open);
      newHb.setAttribute('aria-expanded', open.toString());
      document.body.style.overflow = open ? 'hidden' : '';
    });

    // Close on outside tap/click
    document.addEventListener('click', function(e) {
      if (navLinks.classList.contains('open') &&
          !navLinks.contains(e.target) &&
          !newHb.contains(e.target)) {
        navLinks.classList.remove('open');
        newHb.classList.remove('active');
        newHb.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });

    // Close when a menu link is tapped
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinks.classList.remove('open');
        newHb.classList.remove('active');
        newHb.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // ── Scroll fade-up ──────────────────────────────────────
  const obs = new IntersectionObserver(entries =>
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1 }
  );
  document.querySelectorAll('.fade-up').forEach(el => obs.observe(el));

  // ── Hero particles ──────────────────────────────────────
  const pc = document.getElementById('particles');
  if (pc) {
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `left:${Math.random()*100}%;animation-duration:${7+Math.random()*10}s;animation-delay:${Math.random()*8}s;width:${1+Math.random()*3}px;height:${1+Math.random()*3}px;`;
      pc.appendChild(p);
    }
  }

  // ── Home: load hosting plans ────────────────────────────
  const grid = document.getElementById('homePlanGrid');
  if (grid) loadHomePlans(grid);

  // ── Hero search ─────────────────────────────────────────
  window.searchDomain = function() {
    const v = (document.getElementById('heroInput') || {}).value || '';
    location.href = v.trim() ? `/domains.html?q=${encodeURIComponent(v.trim())}` : '/domains.html';
  };

  // ── Active nav link highlight ───────────────────────────
  const path = location.pathname;
  if (navLinks) {
    navLinks.querySelectorAll('a').forEach(a => {
      if (a.getAttribute('href') === path || (path === '/' && a.getAttribute('href') === '/')) {
        a.style.color = 'var(--accent)';
        a.style.fontWeight = '700';
      }
    });
  }

});

// ── Home plans card ───────────────────────────────────────────
async function loadHomePlans(grid) {
  try {
    const plans = await fetch('/api/hosting').then(r => r.json());
    let shown = plans.filter(p => p.highlighted).slice(0, 3);
    if (!shown.length) shown = plans.slice(0, 3);
    grid.innerHTML = shown.map(planCardHTML).join('');
  } catch(e) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;">Could not load plans.</p>';
  }
}

function planCardHTML(p) {
  return `<div class="hosting-card ${p.highlighted ? 'featured' : ''}">
    ${p.badge ? `<span class="badge badge-primary plan-badge">${p.badge}</span>` : ''}
    <div class="plan-name">${p.name}</div>
    <div class="plan-price">₹${p.price}<span>/mo</span></div>
    <div class="plan-renew">₹${p.renewPrice}/mo on renewal</div>
    <ul class="plan-features">${(p.features||[]).map(f=>`<li>${f}</li>`).join('')}</ul>
    <button class="btn btn-primary" style="width:100%;justify-content:center;"
      onclick="addToCart({id:'hosting-${p.id}',type:'hosting',name:'${p.name} Hosting',price:${p.price},period:'month'})">
      ${p.highlighted ? '🚀 Get Started' : 'Select Plan'}
    </button>
  </div>`;
}
