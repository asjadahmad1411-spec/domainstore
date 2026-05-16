// checkout.js — form validation + auto account creation + order → UPI redirect
let promoDiscount = 0;
let promoCode     = '';
let isLoggedIn    = false;
let emailCheckTimer = null;

function fmt(n) { return '₹' + (n || 0).toLocaleString('en-IN'); }

// ── Load summary ──────────────────────────────────────────────
function loadCheckoutSummary() {
  const cart = getCart();
  if (!cart.length) { location.href = '/cart.html'; return; }

  const items = document.getElementById('coItems');
  if (items) items.innerHTML = cart.map(i => `
    <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:7px;gap:8px;">
      <span style="color:var(--text-muted);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${i.name}</span>
      <span style="font-weight:700;white-space:nowrap;">${fmt(i.price)}</span>
    </div>`).join('');

  const sd = parseInt(sessionStorage.getItem('checkout_discount') || '0');
  const sp = sessionStorage.getItem('checkout_promo') || '';
  if (sd > 0 && sp) {
    promoDiscount = sd; promoCode = sp;
    const inp = document.getElementById('coPromo'); if (inp) inp.value = sp;
    const msg = document.getElementById('coPromoMsg');
    if (msg) msg.innerHTML = `<span style="color:var(--green);">✅ ${fmt(sd)} saved!</span>`;
  }
  updateTotals();
}

function updateTotals() {
  const cart = getCart();
  const sub  = cart.reduce((s, i) => s + i.price, 0);
  const tot  = Math.max(sub - promoDiscount, 0);
  const set  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('coSubtotal', fmt(sub));
  set('coDisc', '-' + fmt(promoDiscount));
  set('coTotal', fmt(tot));
  const dr = document.getElementById('coDiscRow');
  if (dr) dr.style.display = promoDiscount > 0 ? 'flex' : 'none';
}

// ── Promo ─────────────────────────────────────────────────────
async function applyPromoCode() {
  const code = (document.getElementById('coPromo')?.value || '').trim().toUpperCase();
  const msg  = document.getElementById('coPromoMsg');
  if (!code) return;
  const sub = getCart().reduce((s, i) => s + i.price, 0);
  try {
    const res = await fetch('/api/admin/promos/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, total: sub })
    }).then(r => r.json());
    if (res.valid) {
      promoDiscount = res.discount; promoCode = code;
      sessionStorage.setItem('checkout_discount', promoDiscount);
      sessionStorage.setItem('checkout_promo', promoCode);
      if (msg) msg.innerHTML = `<span style="color:var(--green);">✅ Saving ${fmt(res.discount)}!</span>`;
      updateTotals(); showToast('🎉 Promo applied!', 'success');
    } else {
      if (msg) msg.innerHTML = `<span style="color:#ef4444;">❌ ${res.error}</span>`;
      promoDiscount = 0; promoCode = ''; updateTotals();
    }
  } catch(e) { if (msg) msg.innerHTML = `<span style="color:#ef4444;">❌ Error</span>`; }
}

// ── Password helpers ──────────────────────────────────────────
function togglePwd(fieldId, btnId) {
  const inp = document.getElementById(fieldId);
  const btn = document.getElementById(btnId);
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text'; if (btn) btn.textContent = '🙈'; }
  else { inp.type = 'password'; if (btn) btn.textContent = '👁️'; }
}

function checkPwdStrength(val) {
  const bars  = ['sb1','sb2','sb3','sb4'];
  const label = document.getElementById('strengthLabel');
  let score = 0;
  if (val.length >= 6) score++;
  if (val.length >= 10) score++;
  if (/[A-Z]/.test(val) || /[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const colors = ['#ef4444','#f97316','#eab308','#22c55e'];
  const labels = ['Weak','Fair','Good','Strong'];
  bars.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.background = i < score ? colors[score - 1] : 'var(--border)';
  });
  if (label) {
    label.textContent = val.length > 0 ? labels[Math.min(score, 4) - 1] || '' : '';
    label.style.color = score > 0 ? colors[score - 1] : 'var(--text-muted)';
  }
}

function checkPwdMatch() {
  const p1  = document.getElementById('password')?.value || '';
  const p2  = document.getElementById('confirmPassword')?.value || '';
  const msg = document.getElementById('pwdMatchMsg');
  if (!msg || !p2) return;
  if (p1 === p2) {
    msg.innerHTML = '<span style="color:#22c55e;">✅ Passwords match</span>';
  } else {
    msg.innerHTML = '<span style="color:#ef4444;">❌ Passwords do not match</span>';
  }
}

// ── Email existence check ─────────────────────────────────────
function checkEmailExists(email) {
  clearTimeout(emailCheckTimer);
  const msg = document.getElementById('emailCheckMsg');
  if (!msg || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (msg) msg.textContent = '';
    return;
  }
  emailCheckTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      }).then(r => r.json());
      if (res.exists) {
        msg.innerHTML = `<span style="color:#f59e0b;">⚠️ Account already exists with this email. <a href="/login.html" style="color:var(--accent);text-decoration:underline;">Login instead</a> or use different email.</span>`;
        // Hide password section since they already have an account
        const ps = document.getElementById('passwordSection');
        if (ps) ps.style.opacity = '.5';
      } else {
        msg.innerHTML = `<span style="color:#22c55e;">✅ New account will be created</span>`;
        const ps = document.getElementById('passwordSection');
        if (ps) ps.style.opacity = '1';
      }
    } catch(e) { if (msg) msg.textContent = ''; }
  }, 600);
}

// ── Main: Proceed to Pay ──────────────────────────────────────
async function proceedToPayment() {
  const firstName = document.getElementById('firstName')?.value.trim() || '';
  const lastName  = document.getElementById('lastName')?.value.trim()  || '';
  const email     = document.getElementById('email')?.value.trim()     || '';
  const phone     = document.getElementById('phone')?.value.trim()     || '';
  const password  = document.getElementById('password')?.value         || '';
  const confirmPw = document.getElementById('confirmPassword')?.value  || '';

  // Validate basic fields
  if (!firstName || !lastName) return showToast('Please enter your full name', 'error');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('Please enter a valid email', 'error');
  if (!phone || phone.replace(/\D/g,'').length < 10) return showToast('Please enter a valid phone number', 'error');

  // Validate password (only if not logged in)
  if (!isLoggedIn) {
    if (!password || password.length < 6) return showToast('Password must be at least 6 characters', 'error');
    if (password !== confirmPw) return showToast('Passwords do not match', 'error');
  }

  const cart = getCart();
  if (!cart.length) return showToast('Your cart is empty', 'error');

  const btn = document.getElementById('proceedBtn');
  btn.textContent = '⏳ Creating order...'; btn.disabled = true;

  try {
    // ── Step 1: Auto-create account (if not logged in) ──────
    let authToken = localStorage.getItem('ds_user_token');
    let userData  = null;

    if (!isLoggedIn) {
      btn.textContent = '🔐 Creating account...';
      const regRes = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${firstName} ${lastName}`, email, phone, password
        })
      }).then(r => r.json());

      if (regRes.token) {
        // New account created
        authToken = regRes.token;
        userData  = regRes.user;
        localStorage.setItem('ds_user_token', authToken);
        localStorage.setItem('ds_user', JSON.stringify(userData));
        showToast('✅ Account created!', 'success');
      } else if (regRes.error?.includes('already')) {
        // Email already exists — try to use without login (still place order)
        showToast('ℹ️ Existing email — placing order as guest', 'success');
      } else if (regRes.error) {
        throw new Error(regRes.error);
      }
    }

    // ── Step 2: Place order ─────────────────────────────────
    btn.textContent = '📦 Placing order...';
    const orderRes = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: `${firstName} ${lastName}`, email, phone },
        items: cart, promoCode, paymentMethod: 'upi_manual', codFee: 0
      })
    }).then(r => r.json());

    if (!orderRes.success) throw new Error(orderRes.error || 'Order creation failed');

    // Clear cart + save session data
    localStorage.removeItem('ds_cart');
    sessionStorage.removeItem('checkout_discount');
    sessionStorage.removeItem('checkout_promo');
    sessionStorage.setItem('pendingOrder', JSON.stringify({
      orderId: orderRes.orderId, total: orderRes.total, email,
      name: `${firstName} ${lastName}`
    }));

    // Redirect to UPI payment
    location.href = '/upi-payment.html?order=' + orderRes.orderId;

  } catch(e) {
    showToast(e.message || 'Error. Please try again.', 'error');
    btn.textContent = '📲 Proceed to Pay'; btn.disabled = false;
  }
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCheckoutSummary();

  // Check if user is already logged in
  const token = localStorage.getItem('ds_user_token');
  const user  = (() => { try { return JSON.parse(localStorage.getItem('ds_user') || 'null'); } catch { return null; } })();

  if (token && user) {
    isLoggedIn = true;
    // Pre-fill fields
    const nm = (user.name || '').split(' ');
    const fi = document.getElementById('firstName'); if (fi && nm[0]) fi.value = nm[0];
    const li = document.getElementById('lastName');  if (li && nm[1]) li.value = nm.slice(1).join(' ');
    const em = document.getElementById('email');     if (em) em.value = user.email || '';
    const ph = document.getElementById('phone');     if (ph) ph.value = user.phone || '';
    // Hide password section — already logged in
    const ps = document.getElementById('passwordSection');
    if (ps) {
      ps.innerHTML = `<div style="background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.2);border-radius:10px;padding:10px 14px;margin-top:12px;font-size:.8rem;color:#22c55e;">
        ✅ Logged in as <strong>${user.name || user.email}</strong> — <a href="/dashboard/" style="color:var(--accent);">My Account</a>
      </div>`;
    }
  }
});
