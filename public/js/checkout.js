let promoDiscount = 0;
let promoCode = '';
let siteSettings = {};
let timerInterval = null;
let utrValidated = false;
let currentOrderId = null;

function fmt(n) { return '₹' + (n || 0).toLocaleString('en-IN'); }

// ── UTR Smart Validation ──────────────────────────────────────
// REAL UTR patterns used by Indian banks:
// IMPS: 12 digits numeric e.g. "427891234567"
// UPI Ref: 12 digits numeric
// NEFT: alphanumeric with bank prefix e.g. "HDFC523456789012"
// RTGS: 22 chars alphanumeric
function validateUtrFormat(utr) {
  const u = (utr || '').trim().toUpperCase();
  if (!u) return { ok: false, msg: '' };
  if (u.length < 12) return { ok: false, msg: `⏳ Keep typing... (${u.length}/12 min)`, level: 'warn' };

  // Must be alphanumeric only
  if (!/^[A-Z0-9]+$/.test(u)) return { ok: false, msg: '❌ Invalid — only letters and numbers allowed', level: 'invalid' };

  // Reject obvious fakes: all same digit, sequential
  if (/^(.)\1+$/.test(u)) return { ok: false, msg: '❌ Invalid UTR — repeated digits not valid', level: 'invalid' };
  if (u === '123456789012' || u === '000000000000' || u === '111111111111' || u === '999999999999')
    return { ok: false, msg: '❌ This UTR number is not valid', level: 'invalid' };

  // Check for sequential runs (e.g. 123456789012)
  let seq = 0;
  for (let i = 1; i < u.length; i++) {
    const diff = u.charCodeAt(i) - u.charCodeAt(i-1);
    if (diff === 1 || diff === -1) { seq++; if (seq > 7) return { ok: false, msg: '❌ Sequential numbers are not valid UTR', level: 'invalid' }; }
    else seq = 0;
  }

  // Valid length ranges
  if (u.length < 12 || u.length > 22) return { ok: false, msg: '❌ UTR must be 12–22 characters', level: 'invalid' };

  // IMPS/UPI Ref: exactly 12 digits
  if (/^\d{12}$/.test(u)) return { ok: true, msg: `✅ Valid UPI/IMPS reference: ${u}`, level: 'valid' };

  // NEFT format: starts with bank code letters
  if (/^[A-Z]{4}\d{8,14}$/.test(u)) return { ok: true, msg: `✅ Valid NEFT UTR: ${u}`, level: 'valid' };

  // Generic alphanumeric long ref
  if (u.length >= 12 && /^[A-Z0-9]{12,22}$/.test(u)) return { ok: true, msg: `✅ Valid reference number: ${u}`, level: 'valid' };

  return { ok: false, msg: '❌ UTR format not recognized. Check your UPI app receipt.', level: 'invalid' };
}

function liveUtrCheck(input) {
  const val    = (input.value || '').trim().toUpperCase();
  const status = document.getElementById('utrStatus');
  if (!status) return;

  const result = validateUtrFormat(val);

  if (!val) {
    status.className = 'utr-status'; utrValidated = false;
    input.className  = 'utr-inp'; return;
  }

  status.className = 'utr-status ' + (result.level || 'warn');
  status.textContent = result.msg;
  input.className  = result.ok ? 'utr-inp valid' : (result.level === 'invalid' ? 'utr-inp invalid' : 'utr-inp');
  utrValidated = result.ok;
}

// ── Timer ─────────────────────────────────────────────────────
function startTimer() {
  let secs = 15 * 60;
  const d = document.getElementById('timerDisplay');
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secs--;
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    if (d) d.textContent = m + ':' + s;
    if (secs <= 0) {
      clearInterval(timerInterval);
      showToast('⏱️ Session expired. Please refresh.', 'error');
    }
  }, 1000);
}

// ── Load Settings + Build UI ──────────────────────────────────
async function loadSettings() {
  try {
    siteSettings = await fetch('/api/admin/settings').then(r => r.json());
  } catch(e) { siteSettings = { upiId: 'domainstore@upi', upiName: 'DomainStore' }; }

  const upiId   = siteSettings.upiId   || 'domainstore@upi';
  const upiName = siteSettings.upiName || 'DomainStore';
  const amount  = getCart().reduce((s, i) => s + i.price, 0);

  // Display UPI ID
  const ud = document.getElementById('upiIdDisplay');
  if (ud) ud.textContent = upiId;

  // QR Code
  const qrArea = document.getElementById('qrArea');
  if (qrArea) {
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=DomainStore`;
    const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(upiLink)}&color=6c3de8&bgcolor=ffffff`;
    qrArea.innerHTML = `<img src="${qrUrl}" alt="UPI QR" style="width:100%;height:100%;object-fit:contain;border-radius:8px;" onerror="this.parentElement.innerHTML='<span style=font-size:2.5rem>📱</span>'"/>`;
  }

  // Deep link buttons
  buildAppButtons(upiId, upiName, amount);
  startTimer();
}

function buildAppButtons(upiId, name, amount) {
  const grid = document.getElementById('upiAppGrid');
  if (!grid) return;
  const enc = encodeURIComponent;
  const q = `pa=${enc(upiId)}&pn=${enc(name)}&am=${amount}&cu=INR&tn=DomainStore`;

  const apps = [
    { icon: '🟢', label: 'GPay',    url: `tez://upi/pay?${q}` },
    { icon: '💜', label: 'PhonePe', url: `phonepe://pay?${q}` },
    { icon: '🔵', label: 'Paytm',   url: `paytmmp://pay?${q}` },
    { icon: '🟡', label: 'BHIM',    url: `upi://pay?${q}` },
    { icon: '🏦', label: 'Any UPI', url: `upi://pay?${q}` },
    { icon: '📋', label: 'Copy ID', url: null, copy: upiId },
  ];

  grid.innerHTML = apps.map(a => `
    <button class="upi-app-btn" onclick="${a.copy
      ? `copyText('${a.copy}','UPI ID')`
      : `tryOpenApp('${a.url}')`}">
      <span class="app-icon">${a.icon}</span>${a.label}
    </button>`).join('');
}

function tryOpenApp(url) {
  // Try deep link — show toast if nothing happens
  window.location.href = url;
  setTimeout(() => {
    showToast('If app did not open, scan the QR code or copy UPI ID.', 'error');
  }, 1800);
}

function copyUpiId() {
  const id = siteSettings.upiId || 'domainstore@upi';
  navigator.clipboard.writeText(id).then(() => showToast('✅ UPI ID copied: ' + id, 'success'));
}

function copyText(text, label) {
  navigator.clipboard.writeText(text).then(() => showToast('📋 Copied: ' + text, 'success'));
}

// ── Summary ───────────────────────────────────────────────────
function loadCheckoutSummary() {
  const cart = getCart();
  if (!cart.length) { location.href = '/cart.html'; return; }

  const items = document.getElementById('coItems');
  if (items) items.innerHTML = cart.map(i => `
    <div style="display:flex;justify-content:space-between;font-size:.875rem;margin-bottom:8px;gap:8px;">
      <span style="color:var(--text-muted);flex:1;">${i.name}</span>
      <span style="font-weight:600;white-space:nowrap;">${fmt(i.price)}</span>
    </div>`).join('');

  const sd = parseInt(sessionStorage.getItem('checkout_discount') || '0');
  const sp = sessionStorage.getItem('checkout_promo') || '';
  if (sd > 0 && sp) {
    promoDiscount = sd; promoCode = sp;
    const inp = document.getElementById('coPromo'); if (inp) inp.value = sp;
    const msg = document.getElementById('coPromoMsg');
    if (msg) msg.innerHTML = `<span style="color:var(--green);">✅ Promo applied! Saving ${fmt(sd)}</span>`;
  }
  updateTotals();
}

function updateTotals() {
  const cart     = getCart();
  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  const total    = Math.max(subtotal - promoDiscount, 0);
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('coSubtotal', fmt(subtotal));
  set('coDisc', '-' + fmt(promoDiscount));
  set('coTotal', fmt(total));
  const dr = document.getElementById('coDiscRow');
  if (dr) dr.style.display = promoDiscount > 0 ? 'flex' : 'none';
}

// ── Promo ─────────────────────────────────────────────────────
async function applyPromoCode() {
  const code = (document.getElementById('coPromo')?.value || '').trim().toUpperCase();
  const msg  = document.getElementById('coPromoMsg');
  if (!code) return;
  const cart = getCart();
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
      if (msg) msg.innerHTML = `<span style="color:var(--green);">✅ ${res.type==='percent'?res.value+'% off':'₹'+res.value+' off'} applied!</span>`;
      updateTotals(); showToast('🎉 Promo applied!', 'success');
    } else {
      if (msg) msg.innerHTML = `<span style="color:#ef4444;">❌ ${res.error}</span>`;
      promoDiscount = 0; promoCode = ''; updateTotals();
    }
  } catch(e) { if (msg) msg.innerHTML = `<span style="color:#ef4444;">❌ Could not validate promo</span>`; }
}

// ── Submit UTR + Place Order in one step ─────────────────────
async function submitUtrAndOrder() {
  const utr = (document.getElementById('utrInput')?.value || '').trim().toUpperCase();
  const stat = document.getElementById('utrStatus');

  // Validate UTR first
  const result = validateUtrFormat(utr);
  if (!result.ok) {
    if (stat) { stat.className = 'utr-status invalid'; stat.textContent = result.msg || '❌ Please enter a valid UTR number from your UPI app'; }
    return;
  }
  // Then place order
  placeOrder(utr);
}

async function placeOrder(utrValue) {
  const firstName = document.getElementById('firstName')?.value.trim();
  const lastName  = document.getElementById('lastName')?.value.trim();
  const email     = document.getElementById('email')?.value.trim();
  const phone     = document.getElementById('phone')?.value.trim();

  if (!firstName || !lastName) return showToast('Please enter your full name', 'error');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('Please enter a valid email', 'error');
  if (!phone) return showToast('Please enter your phone number', 'error');
  if (!utrValue) return showToast('Please enter UTR after paying', 'error');

  const cart = getCart();
  if (!cart.length) return showToast('Cart is empty', 'error');

  const btn = document.getElementById('placeOrderBtn');
  btn.textContent = '⏳ Processing...'; btn.disabled = true;

  try {
    // Create order
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: `${firstName} ${lastName}`, email, phone },
        items: cart, promoCode, paymentMethod: 'upi_manual', codFee: 0
      })
    }).then(r => r.json());

    if (!res.success) throw new Error(res.error || 'Order failed');

    // Submit UTR
    const utrRes = await fetch('/api/admin/utr-submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: res.orderId, utr: utrValue })
    }).then(r => r.json());

    if (!utrRes.success) throw new Error(utrRes.error || 'UTR submission failed');

    clearInterval(timerInterval);
    localStorage.removeItem('ds_cart');
    sessionStorage.removeItem('checkout_discount');
    sessionStorage.removeItem('checkout_promo');
    sessionStorage.setItem('lastOrder', JSON.stringify({
      orderId: res.orderId, email, total: res.total, paymentMethod: 'upi_manual', utr: utrValue
    }));
    location.href = '/confirmation.html';

  } catch(e) {
    showToast(e.message || 'Error. Please try again.', 'error');
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
