// ── Cart utilities ──────────────────────────────────────────
const getCart = () => JSON.parse(localStorage.getItem('ds_cart') || '[]');
const saveCart = (c) => { localStorage.setItem('ds_cart', JSON.stringify(c)); updateCartBadge(); };
const updateCartBadge = () => {
  const n = getCart().length;
  document.querySelectorAll('#cartCount').forEach(el => el.textContent = n);
};

function addToCart(item) {
  const cart = getCart();
  const exists = cart.find(i => i.id === item.id);
  if (exists) { showToast(`${item.name} is already in cart!`, 'error'); return; }
  cart.push(item);
  saveCart(cart);
  showToast(`✅ ${item.name} added to cart!`, 'success');
}

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── Nav hamburger ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  const hb = document.getElementById('hamburger');
  const nl = document.getElementById('navLinks');
  if (hb && nl) hb.addEventListener('click', () => nl.classList.toggle('open'));

  // Scroll fade-up
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

  // Hero particles
  const pc = document.getElementById('particles');
  if (pc) {
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `left:${Math.random()*100}%;animation-duration:${6+Math.random()*10}s;animation-delay:${Math.random()*8}s;width:${1+Math.random()*3}px;height:${1+Math.random()*3}px;`;
      pc.appendChild(p);
    }
  }

  // Home page: load hosting plans preview
  const grid = document.getElementById('homePlanGrid');
  if (grid) loadHomePlans(grid);

  // Hero search redirect
  window.searchDomain = function() {
    const v = (document.getElementById('heroInput') || {}).value || '';
    if (v.trim()) location.href = `/domains.html?q=${encodeURIComponent(v.trim())}`;
    else location.href = '/domains.html';
  };
});

async function loadHomePlans(grid) {
  try {
    const plans = await fetch('/api/hosting').then(r => r.json());
    const shown = plans.filter(p => p.highlighted).slice(0, 3);
    if (!shown.length) { shown.push(...plans.slice(0, 3)); }
    grid.innerHTML = shown.map(p => planCardHTML(p)).join('');
  } catch (e) {
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
    <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="addToCart({id:'hosting-${p.id}',type:'hosting',name:'${p.name} Hosting',price:${p.price},period:'month'})">
      ${p.highlighted ? '🚀 Get Started' : 'Select Plan'}
    </button>
  </div>`;
}

// Smart nav auth button
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('navAuthBtn');
    if (!btn) return;
    const token = localStorage.getItem('ds_user_token');
    const user  = (() => { try { return JSON.parse(localStorage.getItem('ds_user') || 'null'); } catch { return null; } })();
    if (token && user) {
      btn.textContent = '👤 ' + (user.name?.split(' ')[0] || 'Account');
      btn.href = '/dashboard/';
    } else {
      btn.textContent = '👤 Login';
      btn.href = '/login.html';
    }
  });
})();

// ── PRELOADER ─────────────────────────────────────────────────
(function() {
  // Add class to prevent flash
  document.documentElement.classList.add('page-loading');
  // Inject preloader HTML if not already present
  if (!document.getElementById('preloader')) {
    const pl = document.createElement('div');
    pl.id = 'preloader';
    pl.innerHTML = `
      <div class="preloader-logo">🌐 DomainStore</div>
      <div class="preloader-bar"><div class="preloader-bar-fill"></div></div>
      <div class="preloader-dots"><span></span><span></span><span></span></div>`;
    document.body.insertBefore(pl, document.body.firstChild);
  }
  function hidePreloader() {
    const pl = document.getElementById('preloader');
    if (pl) { pl.classList.add('hidden'); }
    document.documentElement.classList.remove('page-loading');
  }
  if (document.readyState === 'complete') { setTimeout(hidePreloader, 300); }
  else { window.addEventListener('load', () => setTimeout(hidePreloader, 400)); }
})();

// ── SMART NAVBAR INJECTOR ─────────────────────────────────────
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    // Fix nav-links: add Offers if missing
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
      // Check if Offers already in nav
      if (!navLinks.querySelector('a[href="/offers.html"]')) {
        const li = document.createElement('li');
        li.innerHTML = '<a href="/offers.html">🎁 Offers</a>';
        navLinks.appendChild(li);
      }
    }

    // Fix nav-actions: inject Account btn if missing
    const navActions = document.querySelector('.nav-actions');
    if (navActions && !document.getElementById('navAuthBtn')) {
      const token = localStorage.getItem('ds_user_token');
      const user  = (function(){ try{ return JSON.parse(localStorage.getItem('ds_user')||'null'); }catch(e){return null;} })();
      const btn = document.createElement('a');
      btn.id = 'navAuthBtn';
      btn.className = 'btn btn-outline btn-sm';
      btn.style.cssText = 'font-size:.82rem;text-decoration:none;';
      if (token && user) {
        btn.textContent = '👤 ' + ((user.name||'Account').split(' ')[0]);
        btn.href = '/dashboard/';
      } else {
        btn.textContent = '👤 Login';
        btn.href = '/login.html';
      }
      // Insert before cart button
      const cartBtn = navActions.querySelector('.cart-btn, #cartBtn');
      if (cartBtn) { navActions.insertBefore(btn, cartBtn); }
      else { navActions.insertBefore(btn, navActions.firstChild); }
    } else if (document.getElementById('navAuthBtn')) {
      // Update existing btn
      const btn = document.getElementById('navAuthBtn');
      const token = localStorage.getItem('ds_user_token');
      const user  = (function(){ try{ return JSON.parse(localStorage.getItem('ds_user')||'null'); }catch(e){return null;} })();
      if (token && user) {
        btn.textContent = '👤 ' + ((user.name||'Account').split(' ')[0]);
        btn.href = '/dashboard/';
      } else {
        btn.textContent = '👤 Login';
        btn.href = '/login.html';
      }
    }

    // Hamburger: make Offers + account visible in mobile menu
    const hb = document.getElementById('hamburger');
    const nl = document.getElementById('navLinks');
    if (hb && nl) {
      hb.addEventListener('click', () => nl.classList.toggle('open'));
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!hb.contains(e.target) && !nl.contains(e.target)) nl.classList.remove('open');
      });
    }
  });
})();
