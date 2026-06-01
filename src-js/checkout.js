// checkout.js — form validation + auto account creation + order → UPI redirect
let promoDiscount = 0;
let promoCode     = '';
let isLoggedIn    = false;
let emailCheckTimer = null;

function fmt(n) { return '₹' + (n || 0).toLocaleString('en-IN'); }

// ── Load summary ──────────────────────────────────────────────
function loadCheckoutSummary() {
  const cart = getCart();
  if (window.currentCGST) cart.push({ name: 'CGST @ 9%', price: window.currentCGST, cycle: 'once' });
  if (window.currentSGST) cart.push({ name: 'SGST @ 9%', price: window.currentSGST, cycle: 'once' });
  if (!cart.length) { location.href = '/cart.html'; return; }

  const items = document.getElementById('coItems');
  if (items) items.innerHTML = cart.map(i => {
    const itemTotal = (i.price || 0) * (i.years || 1);
    const yearText = i.type === 'domain' ? ` (${i.years || 1} Year${(i.years || 1) > 1 ? 's' : ''})` : '';
    return `
    <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:7px;gap:8px;">
      <span style="color:var(--text-muted);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${i.name}${yearText}</span>
      <span style="font-weight:700;white-space:nowrap;">${fmt(itemTotal)}</span>
    </div>`;
  }).join('');

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
  const sub  = cart.reduce((s, i) => s + (i.price * (i.years || 1)), 0);
  const discountTot = promoDiscount;
  
  // GST calculation (9% CGST, 9% SGST on discounted subtotal)
  const taxable = Math.max(sub - discountTot, 0);
  const cgst = Math.round(taxable * 0.09 * 100) / 100;
  const sgst = Math.round(taxable * 0.09 * 100) / 100;
  const tot  = taxable + cgst + sgst;
  
  const set  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('coSubtotal', fmt(sub));
  set('coDisc', '-' + fmt(discountTot));
  set('coCGST', fmt(cgst));
  set('coSGST', fmt(sgst));
  set('coTotal', fmt(tot));
  set('coDueToday', fmt(tot)); // the large text
  
  const dr = document.getElementById('coDiscRow');
  if (dr) dr.style.display = discountTot > 0 ? 'flex' : 'none';
  
  // Store gst in window for payload submission
  window.currentCGST = cgst;
  window.currentSGST = sgst;
}
// ── Promo ─────────────────────────────────────────────────────
async function applyPromoCode() {
  const code = (document.getElementById('coPromo')?.value || '').trim().toUpperCase();
  const msg  = document.getElementById('coPromoMsg');
  if (!code) return;
  const sub = getCart().reduce((s, i) => s + (i.price * (i.years || 1)), 0);
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

  if (!firstName || !lastName) return showToast('Please enter your full name', 'error');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('Please enter a valid email', 'error');
  if (!phone || phone.replace(/\D/g,'').length < 10) return showToast('Please enter a valid phone number', 'error');

  if (!isLoggedIn) {
    if (!password || password.length < 6) return showToast('Password must be at least 6 characters', 'error');
    if (password !== confirmPw) return showToast('Passwords do not match', 'error');
  }

  let cart = getCart();
  if (!cart.length) return showToast('Your cart is empty', 'error');
  
  // Calculate final total correctly with years
  const sub  = cart.reduce((s, i) => s + (i.price * (i.years || 1)), 0);
  const taxable = Math.max(sub - promoDiscount, 0);
  const cgst = Math.round(taxable * 0.09 * 100) / 100;
  const sgst = Math.round(taxable * 0.09 * 100) / 100;
  const finalTotal = taxable + cgst + sgst;

  const btn = document.getElementById('proceedBtn');
  btn.textContent = '⏳ Creating order...'; btn.disabled = true;

  try {
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
        authToken = regRes.token;
        userData  = regRes.user;
        localStorage.setItem('ds_user_token', authToken);
        localStorage.setItem('ds_user', JSON.stringify(userData));
        showToast('✅ Account created!', 'success');
      } else if (regRes.error && regRes.error.includes('already exists')) {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        }).then(r => r.json());
        if (loginRes.token) {
          authToken = loginRes.token;
          userData  = loginRes.user;
          localStorage.setItem('ds_user_token', authToken);
          localStorage.setItem('ds_user', JSON.stringify(userData));
        } else {
          throw new Error('Email exists. Incorrect password.');
        }
      } else {
        throw new Error(regRes.error || 'Registration failed');
      }
    } else {
      userData = JSON.parse(localStorage.getItem('ds_user') || '{}');
    }

    btn.textContent = '💳 Processing order...';
    const methodEl = document.querySelector('input[name="paymentMethod"]:checked');
    const paymentMethod = methodEl ? methodEl.value : 'upi';

    // Store order total explicitly for UPI page to use
    const orderPayload = {
      items: cart,
      total: finalTotal, // using dynamically calculated final total
      discount: promoDiscount,
      promoCode: promoCode,
      paymentMethod,
      customer: {
        name: userData.name, email: userData.email, phone: userData.phone
      }
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify(orderPayload)
    }).then(r => r.json());

    if (res.success) {
      localStorage.removeItem('ds_cart'); // clear cart
      sessionStorage.setItem('pendingOrder', JSON.stringify({ orderId: res.orderId, total: finalTotal }));
      
      btn.innerHTML = `<span class="spinner"></span> Redirecting to Payment Gateway...`;
      
      // Ads tracking logic
      if (window.gtag && window.googleAdsTag) {
        window.gtag('event', 'begin_checkout', { 'value': finalTotal, 'currency': 'INR' });
      }
      if (window.fbq) {
        window.fbq('track', 'InitiateCheckout');
      }

      setTimeout(() => {
        location.href = `/upi-payment.html?order=${res.orderId}`;
      }, 5000); // Wait 5 seconds so they see the loading indicator and notice "Redirecting..."
      
    } else {
      throw new Error(res.error || 'Order creation failed');
    }
  } catch (err) {
    btn.textContent = 'Complete Order'; btn.disabled = false;
    showToast(err.message, 'error');
  }
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('ds_user_token');
  const user  = (() => { try { return JSON.parse(localStorage.getItem('ds_user') || 'null'); } catch { return null; } })();
  
  if (token && user) {
    isLoggedIn = true;
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone').value = user.phone || '';
    if (user.name) {
      const parts = user.name.split(' ');
      document.getElementById('firstName').value = parts[0] || '';
      document.getElementById('lastName').value  = parts.slice(1).join(' ') || '';
    }
    const ac = document.getElementById('accountCreationBlock');
    if (ac) {
      ac.innerHTML = `
        <div style="background:#ecfdf5; border:1px solid #a7f3d0; padding:12px; border-radius:6px; display:flex; align-items:center; gap:10px;">
          <div style="width:32px;height:32px;background:var(--brand);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;">✓</div>
          <div>
            <div style="font-weight:600;font-size:.9rem;color:#065f46;">Logged in as ${user.name}</div>
            <div style="font-size:.75rem;color:#047857;">Your order will be added to your account.</div>
          </div>
        </div>
      `;
    }
  }

  loadCheckoutSummary();
});
