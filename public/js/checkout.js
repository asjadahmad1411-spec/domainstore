let selectedPayMethod = 'upi_manual';
let promoDiscount = 0;
let promoCode = '';
let siteSettings = {};
let placedOrderId = null;
let utrValidated = false;
let timerInterval = null;

function fmt(n) { return '₹' + (n || 0).toLocaleString('en-IN'); }

// ── Payment Timer (15 min) ────────────────────────────────────
function startPayTimer() {
  let secs = 15 * 60;
  const disp = document.getElementById('timerDisplay');
  const timerBox = document.getElementById('payTimer');
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secs--;
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    if (disp) disp.textContent = m + ':' + s;
    if (secs <= 120 && timerBox) timerBox.style.animation = 'pulse 1s infinite';
    if (secs <= 0) {
      clearInterval(timerInterval);
      if (disp) disp.textContent = '00:00';
      if (timerBox) timerBox.style.background = 'rgba(239,68,68,.25)';
      showToast('⏱️ Session expired. Please refresh and pay again.', 'error');
    }
  }, 1000);
}

// ── Load settings (UPI ID, QR, deep links) ───────────────────
async function loadSettings() {
  try {
    siteSettings = await fetch('/api/admin/settings').then(r => r.json());
    const upiId   = siteSettings.upiId   || 'domainstore@upi';
    const upiName = siteSettings.upiName || 'DomainStore';
    const amount  = getCart().reduce((s,i) => s+i.price, 0);

    // Show UPI ID
    const upiDisplay = document.getElementById('upiIdDisplay');
    if (upiDisplay) upiDisplay.textContent = upiId;

    // QR Code
    const qrArea = document.getElementById('qrArea');
    if (qrArea) {
      const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR`;
      const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`;
      qrArea.innerHTML = `<img src="${qrUrl}" alt="UPI QR" style="width:180px;height:180px;border-radius:10px;" onerror="this.parentElement.innerHTML='📱'"/>`;
      qrArea.style.cssText += ';background:#fff;border:none;padding:8px;';
    }

    // Deep link buttons per UPI app
    buildUpiAppButtons(upiId, upiName, amount);
    startPayTimer();

  } catch (e) {
    const d = document.getElementById('upiIdDisplay');
    if (d) d.textContent = 'domainstore@upi';
    buildUpiAppButtons('domainstore@upi', 'DomainStore', 0);
    startPayTimer();
  }
}

function buildUpiAppButtons(upiId, name, amount) {
  const container = document.getElementById('upiAppBtns');
  if (!container) return;
  const enc = encodeURIComponent;
  const base = `pa=${enc(upiId)}&pn=${enc(name)}&am=${amount}&cu=INR&tn=DomainStore`;
  const apps = [
    { icon: '🟢', label: 'GPay',     url: `tez://upi/pay?${base}`,      fallback: `https://pay.google.com/` },
    { icon: '💙', label: 'PhonePe',  url: `phonepe://pay?${base}`,       fallback: `https://www.phonepe.com/` },
    { icon: '🔵', label: 'Paytm',    url: `paytmmp://pay?${base}`,       fallback: `https://paytm.com/` },
    { icon: '📱', label: 'BHIM',     url: `upi://pay?${base}`,           fallback: `https://www.bhimupi.org.in/` },
    { icon: '🏦', label: 'Any UPI',  url: `upi://pay?${base}`,           fallback: `upi://pay?${base}` },
    { icon: '📋', label: 'Copy ID',  url: null,                          fallback: null, copy: upiId },
  ];
  container.innerHTML = apps.map(a => `
    <button onclick="${a.copy ? `navigator.clipboard.writeText('${a.copy}').then(()=>showToast('Copied!','success'))` : `openUpiApp('${a.url}','${a.fallback}')`}"
      style="background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:12px;padding:12px 8px;cursor:pointer;transition:all .2s;color:var(--text);display:flex;flex-direction:column;align-items:center;gap:4px;font-size:.75rem;font-weight:600;"
      onmouseover="this.style.borderColor='var(--primary)';this.style.background='rgba(108,61,232,.1)'"
      onmouseout="this.style.borderColor='var(--border)';this.style.background='rgba(255,255,255,.05)'">
      <span style="font-size:1.4rem;">${a.icon}</span>${a.label}
    </button>`).join('');
}

function openUpiApp(deepLink, fallback) {
  // Try deep link first — if not opened in 1.5s, open web fallback
  const start = Date.now();
  window.location.href = deepLink;
  setTimeout(() => {
    if (Date.now() - start < 2000) {
      // App didn't open — show toast
      showToast('UPI app not found. Please open manually or scan QR.', 'error');
    }
  }, 1500);
}

function copyUpiId() {
  const id = siteSettings.upiId || 'domainstore@upi';
  navigator.clipboard.writeText(id).then(() => showToast('✅ UPI ID Copied: ' + id, 'success'));
}

// ── Live UTR format check as user types ──────────────────────
function liveUtrCheck(input) {
  const val   = (input.value || '').trim().toUpperCase();
  const stat  = document.getElementById('utrStatus');
  if (!stat) return;
  if (!val) { stat.style.display = 'none'; utrValidated = false; return; }
  const valid = /^[A-Z0-9]{8,25}$/.test(val);
  stat.style.display = 'block';
  if (valid) {
    stat.style.background = 'rgba(34,197,94,.1)';
    stat.style.border     = '1px solid rgba(34,197,94,.3)';
    stat.style.color      = '#22c55e';
    stat.textContent      = '✅ Valid UTR format — ' + val;
    utrValidated = true;
  } else if (val.length < 8) {
    stat.style.background = 'rgba(245,158,11,.1)';
    stat.style.border     = '1px solid rgba(245,158,11,.3)';
    stat.style.color      = '#f59e0b';
    stat.textContent      = '⏳ Keep typing... (' + val.length + '/8 min)';
    utrValidated = false;
  } else {
    stat.style.background = 'rgba(239,68,68,.1)';
    stat.style.border     = '1px solid rgba(239,68,68,.3)';
    stat.style.color      = '#ef4444';
    stat.textContent      = '❌ Invalid UTR format. Only letters & numbers allowed.';
    utrValidated = false;
  }
}

function validateUTR() {
  const utr = (document.getElementById('utrInput')?.value || '').trim().toUpperCase();
  const msg = document.getElementById('utrMsg');
  if (!utr) {
    if (msg) msg.innerHTML = `<span style="color:#ef4444;">❌ Please enter your UTR/Transaction ID</span>`; return;
  }
  if (!/^[A-Z0-9]{8,25}$/.test(utr)) {
    if (msg) msg.innerHTML = `<span style="color:#ef4444;">❌ Wrong UTR format. Enter 8-25 letters/numbers only.</span>`;
    utrValidated = false; return;
  }
  if (msg) msg.innerHTML = `<span style="color:#22c55e;">✅ UTR confirmed: <strong>${utr}</strong>. Now click Place Order.</span>`;
  utrValidated = true;
}

// ── Load checkout summary ─────────────────────────────────────
function loadCheckoutSummary() {
  const cart = getCart();
  if (!cart.length) { location.href = '/cart.html'; return; }
  const items = document.getElementById('coItems');
  if (items) {
    items.innerHTML = cart.map(i => `
      <div style="display:flex;justify-content:space-between;font-size:.875rem;margin-bottom:8px;gap:8px;">
        <span style="color:var(--text-muted);flex:1;">${i.name}</span>
        <span style="font-weight:600;white-space:nowrap;">${fmt(i.price)}</span>
      </div>`).join('');
  }
  const savedDiscount = parseInt(sessionStorage.getItem('checkout_discount') || '0');
  const savedPromo    = sessionStorage.getItem('checkout_promo') || '';
  if (savedDiscount > 0 && savedPromo) {
    promoDiscount = savedDiscount; promoCode = savedPromo;
    const inp = document.getElementById('coPromo');
    if (inp) inp.value = savedPromo;
    const msg = document.getElementById('coPromoMsg');
    if (msg) msg.innerHTML = `<span style="color:var(--green);">✅ Promo applied! Saving ${fmt(savedDiscount)}</span>`;
  }
  updateTotals();
}

function updateTotals() {
  const cart     = getCart();
  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  const total    = Math.max(subtotal - promoDiscount, 0);
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('coSubtotal', fmt(subtotal));
  set('coDisc', '-' + fmt(promoDiscount));
  set('coTotal', fmt(total));
  const discRow = document.getElementById('coDiscRow');
  if (discRow) discRow.style.display = promoDiscount > 0 ? 'flex' : 'none';
  const codRow = document.getElementById('coCodRow');
  if (codRow) codRow.style.display = 'none';
}

// ── Promo code ────────────────────────────────────────────────
async function applyPromoCode() {
  const code = (document.getElementById('coPromo')?.value || '').trim().toUpperCase();
  const msg  = document.getElementById('coPromoMsg');
  if (!code) return;
  const cart     = getCart();
  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  try {
    const res = await fetch('/api/admin/promos/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, total: subtotal })
    }).then(r => r.json());
    if (res.valid) {
      promoDiscount = res.discount; promoCode = code;
      sessionStorage.setItem('checkout_discount', promoDiscount);
      sessionStorage.setItem('checkout_promo', promoCode);
      if (msg) msg.innerHTML = `<span style="color:var(--green);">✅ ${res.type === 'percent' ? res.value + '% off' : '₹' + res.value + ' off'} applied! Saving ${fmt(res.discount)}</span>`;
      updateTotals();
      showToast('🎉 Promo code applied!', 'success');
    } else {
      if (msg) msg.innerHTML = `<span style="color:#ef4444;">❌ ${res.error}</span>`;
      promoDiscount = 0; promoCode = ''; updateTotals();
    }
  } catch (e) {
    if (msg) msg.innerHTML = `<span style="color:#ef4444;">❌ Could not validate promo</span>`;
  }
}

// ── Place order ───────────────────────────────────────────────
async function placeOrder() {
  const firstName = document.getElementById('firstName')?.value.trim();
  const lastName  = document.getElementById('lastName')?.value.trim();
  const email     = document.getElementById('email')?.value.trim();
  const phone     = document.getElementById('phone')?.value.trim();
  if (!firstName || !lastName) return showToast('Please enter your name', 'error');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('Please enter a valid email', 'error');
  if (!phone) return showToast('Please enter your phone number', 'error');

  // UTR required
  const utrValue = (document.getElementById('utrInput')?.value || '').trim().toUpperCase();
  if (!utrValue) return showToast('❌ Please enter your UTR/Transaction ID after paying', 'error');
  if (!utrValidated) { validateUTR(); if (!utrValidated) return; }

  const cart = getCart();
  if (!cart.length) return showToast('Your cart is empty', 'error');

  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  const total    = Math.max(subtotal - promoDiscount, 0);

  const btn = document.getElementById('placeOrderBtn');
  btn.textContent = '⏳ Placing order...'; btn.disabled = true;

  try {
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: `${firstName} ${lastName}`, email, phone },
        items: cart, promoCode, paymentMethod: 'upi_manual', codFee: 0
      })
    }).then(r => r.json());

    if (!res.success) throw new Error(res.error || 'Order failed');
    placedOrderId = res.orderId;

    // Submit UTR
    await fetch('/api/admin/utr-submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: res.orderId, utr: utrValue })
    });

    clearInterval(timerInterval);
    localStorage.removeItem('ds_cart');
    sessionStorage.removeItem('checkout_discount');
    sessionStorage.removeItem('checkout_promo');
    sessionStorage.setItem('lastOrder', JSON.stringify({
      orderId: res.orderId, email, total: res.total, paymentMethod: 'upi_manual', utr: utrValue
    }));
    location.href = '/confirmation.html';
  } catch (e) {
    showToast(e.message || 'Order failed. Try again.', 'error');
    btn.textContent = '🔒 Place Order'; btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadCheckoutSummary();
  // Pre-fill from user account
  const user = (() => { try { return JSON.parse(localStorage.getItem('ds_user')||'null'); } catch { return null; } })();
  if (user) {
    const nm = (user.name||'').split(' ');
    const fi = document.getElementById('firstName'); if (fi && nm[0]) fi.value = nm[0];
    const li = document.getElementById('lastName');  if (li && nm[1]) li.value = nm.slice(1).join(' ');
    const em = document.getElementById('email');     if (em) em.value = user.email||'';
    const ph = document.getElementById('phone');     if (ph) ph.value = user.phone||'';
  }
  const hb = document.getElementById('hamburger');
  const nl = document.getElementById('navLinks');
  if (hb && nl) hb.addEventListener('click', () => nl.classList.toggle('open'));
});
