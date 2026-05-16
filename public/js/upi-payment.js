// upi-payment.js — Dedicated UPI Payment Page Logic
let siteSettings = {};
let payTimer = null;
let pendingTimer = null;
let currentOrderId = null;
let currentTotal = 0;

// ── Init ──────────────────────────────────────────────────────
async function init() {
  // Get order from URL or sessionStorage
  const params = new URLSearchParams(location.search);
  currentOrderId = params.get('order');
  const pending  = (() => { try { return JSON.parse(sessionStorage.getItem('pendingOrder') || 'null'); } catch { return null; } })();

  if (!currentOrderId && pending) currentOrderId = pending.orderId;
  if (!currentOrderId) { location.href = '/checkout.html'; return; }

  currentTotal = pending?.total || 0;

  // Show order info
  const oid = document.getElementById('displayOrderId');
  if (oid) oid.textContent = currentOrderId;

  const amt = document.getElementById('displayAmount');
  if (amt) amt.textContent = '₹' + (currentTotal || 0).toLocaleString('en-IN');

  // Load settings for UPI ID
  try {
    siteSettings = await fetch('/api/admin/settings').then(r => r.json());
  } catch(e) {
    siteSettings = { upiId: 'domainstore@upi', upiName: 'DomainStore' };
  }

  buildUpiUI();
  startPayTimer();
}

// ── Build UPI QR + App Buttons ────────────────────────────────
function buildUpiUI() {
  const upiId   = siteSettings.upiId   || 'domainstore@upi';
  const upiName = siteSettings.upiName || 'DomainStore';
  const amount  = currentTotal || 0;

  // UPI ID display
  const uid = document.getElementById('upiIdDisplay');
  if (uid) uid.textContent = upiId;

  // QR Code (with amount)
  const qr = document.getElementById('qrArea');
  if (qr) {
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('DomainStore-' + currentOrderId)}`;
    const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(upiLink)}&color=6c3de8&bgcolor=ffffff&margin=2`;
    qr.innerHTML  = `<img src="${qrUrl}" alt="UPI QR Code" style="width:100%;height:100%;object-fit:contain;border-radius:8px;" onerror="this.parentElement.innerHTML='<span style=font-size:2rem>📱</span>'"/>`;
  }

  // App Buttons
  const grid = document.getElementById('appGrid');
  if (!grid) return;
  const enc = encodeURIComponent;
  const q   = `pa=${enc(upiId)}&pn=${enc(upiName)}&am=${amount}&cu=INR&tn=${enc('DomainStore-' + currentOrderId)}`;

  const apps = [
    { icon: '🟢', label: 'Google Pay', url: `tez://upi/pay?${q}`,    featured: true  },
    { icon: '💜', label: 'PhonePe',    url: `phonepe://pay?${q}`,     featured: true  },
    { icon: '🔵', label: 'Paytm',      url: `paytmmp://pay?${q}`,     featured: false },
    { icon: '🟡', label: 'BHIM',       url: `upi://pay?${q}`,          featured: false },
    { icon: '🏦', label: 'Any UPI',    url: `upi://pay?${q}`,          featured: false },
    { icon: '📋', label: 'Copy ID',    url: null, copy: upiId,         featured: false },
  ];

  grid.innerHTML = apps.map(a => `
    <button class="app-btn${a.featured?' featured':''}" onclick="${a.copy
      ? `copyText('${a.copy}')`
      : `openApp('${a.url}')`}">
      <span class="app-btn-icon">${a.icon}</span>
      <span>${a.label}</span>
    </button>`).join('');
}

function openApp(url) {
  window.location.href = url;
  setTimeout(() => showToast('If app did not open, scan the QR code above.', 'error'), 1800);
}

function copyUpiId() {
  copyText(siteSettings.upiId || 'domainstore@upi');
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('📋 Copied: ' + text, 'success'));
}

// ── Payment Timer (10 min) ────────────────────────────────────
function startPayTimer() {
  let secs = 10 * 60;
  const disp = document.getElementById('timerDisplay');
  const wrap = document.getElementById('timerWrap');
  clearInterval(payTimer);
  payTimer = setInterval(() => {
    secs--;
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    if (disp) disp.textContent = m + ':' + s;
    if (secs <= 120 && wrap) wrap.classList.add('urgent');
    if (secs <= 0) {
      clearInterval(payTimer);
      if (disp) disp.textContent = '00:00';
      showToast('⏱️ Session expired! Please go back and try again.', 'error');
    }
  }, 1000);
}

// ── Step Navigation ───────────────────────────────────────────
function goStep(step) {
  [1, 2, 3].forEach(n => {
    document.getElementById('panel' + n)?.classList.remove('active');
    document.getElementById('stepTab' + n)?.classList.remove('active');
  });
  document.getElementById('panel' + step)?.classList.add('active');
  document.getElementById('stepTab' + step)?.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Live UTR Validation ───────────────────────────────────────
function liveUtrCheck(input) {
  const val  = (input.value || '').trim().toUpperCase();
  const hint = document.getElementById('utrHint');
  input.value = val;

  if (!val) {
    input.className = 'utr-field';
    hint.style.display = 'none'; return;
  }

  const result = validateUtr(val);
  hint.style.display = 'block';
  hint.className = 'utr-hint ' + result.level;
  hint.textContent = result.msg;
  input.className = 'utr-field ' + (result.ok ? 'ok' : result.level === 'invalid' ? 'err' : '');
}

function validateUtr(utr) {
  const u = (utr || '').trim().toUpperCase();

  if (!u) return { ok: false, msg: '', level: '' };
  if (u.length < 8) return { ok: false, msg: `⏳ Keep typing... (${u.length}/12 min)`, level: 'warn' };
  if (!/^[A-Z0-9]+$/.test(u)) return { ok: false, msg: '❌ Only letters and numbers allowed', level: 'invalid' };

  // Reject obvious fakes
  if (/^(.)\1{7,}$/.test(u)) return { ok: false, msg: '❌ Invalid — repeated digits not a valid UTR', level: 'invalid' };
  const seq = ['12345678901', '23456789012', '98765432109', '00000000000', '11111111111', '99999999999'];
  if (seq.some(s => u.includes(s))) return { ok: false, msg: '❌ Sequential numbers are not valid UTR', level: 'invalid' };
  if (['123456789012','000000000000','111111111111','999999999999','123412341234'].includes(u))
    return { ok: false, msg: '❌ This UTR number is not valid', level: 'invalid' };

  // Valid formats
  if (/^\d{12}$/.test(u)) return { ok: true, msg: `✅ Valid UPI/IMPS reference: ${u}`, level: 'ok' };
  if (/^[A-Z]{4}\d{8,14}$/.test(u)) return { ok: true, msg: `✅ Valid NEFT UTR: ${u}`, level: 'ok' };
  if (u.length >= 12 && u.length <= 22) return { ok: true, msg: `✅ Valid reference: ${u}`, level: 'ok' };

  return { ok: false, msg: '❌ UTR format not recognized. Check your UPI app receipt.', level: 'invalid' };
}

// ── Submit UTR ────────────────────────────────────────────────
async function submitUtr() {
  const utrVal = (document.getElementById('utrInput')?.value || '').trim().toUpperCase();
  const hint   = document.getElementById('utrHint');
  const result = validateUtr(utrVal);

  if (!result.ok) {
    if (hint) { hint.style.display = 'block'; hint.className = 'utr-hint err'; hint.textContent = result.msg || '❌ Please enter a valid UTR'; }
    document.getElementById('utrInput')?.classList.add('err');
    return;
  }

  if (!currentOrderId) { showToast('Order not found. Please restart.', 'error'); return; }

  const btn = document.getElementById('submitUtrBtn');
  btn.textContent = '⏳ Submitting...'; btn.disabled = true;

  try {
    const res = await fetch('/api/admin/utr-submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: currentOrderId, utr: utrVal })
    }).then(r => r.json());

    if (!res.success) {
      btn.textContent = '✅ Confirm Payment'; btn.disabled = false;
      if (hint) { hint.style.display = 'block'; hint.className = 'utr-hint err'; hint.textContent = '❌ ' + (res.error || 'Submission failed'); }
      return;
    }

    // Success — show pending panel
    clearInterval(payTimer);
    const cu = document.getElementById('confirmedUtr'); if (cu) cu.textContent = utrVal;
    const fo = document.getElementById('finalOrderId'); if (fo) fo.textContent = currentOrderId;

    // Save to sessionStorage for confirmation page
    sessionStorage.setItem('lastOrder', JSON.stringify({
      orderId: currentOrderId, utr: utrVal, total: currentTotal, status: 'UTR Pending'
    }));

    goStep(3);
    startPendingCountdown();
    showToast('✅ UTR submitted! Awaiting admin verification.', 'success');

  } catch(e) {
    showToast('Network error. Please try again.', 'error');
    btn.textContent = '✅ Confirm Payment'; btn.disabled = false;
  }
}

// ── Pending Countdown (10 min) ────────────────────────────────
function startPendingCountdown() {
  let secs = 10 * 60;
  const disp = document.getElementById('pendingCountdown');
  clearInterval(pendingTimer);
  pendingTimer = setInterval(() => {
    secs--;
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    if (disp) disp.textContent = m + ':' + s;
    if (secs <= 0) {
      clearInterval(pendingTimer);
      if (disp) disp.textContent = '00:00';
      const box = document.getElementById('pendingTimerBox');
      if (box) {
        box.style.background = 'rgba(34,197,94,.07)';
        box.style.borderColor = 'rgba(34,197,94,.2)';
        box.innerHTML = '<div style="color:#22c55e;font-size:.9rem;font-weight:700;">✅ Check your email for confirmation!</div>';
      }
    }
  }, 1000);
}

// ── Hamburger ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  init();
  const hb = document.getElementById('hamburger');
  const nl = document.getElementById('navLinks');
  if (hb && nl) hb.addEventListener('click', () => nl.classList.toggle('open'));
});
