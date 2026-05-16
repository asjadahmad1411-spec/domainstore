// upi-payment.js — UPI Payment Page + Real-time Order Status Polling
let siteSettings = {};
let payTimer     = null;
let pendingTimer = null;
let pollTimer    = null;
let currentOrderId = null;
let currentTotal   = 0;

// ── Init ──────────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(location.search);
  currentOrderId = params.get('order');
  const pending  = (() => { try { return JSON.parse(sessionStorage.getItem('pendingOrder') || 'null'); } catch { return null; } })();

  if (!currentOrderId && pending) currentOrderId = pending.orderId;
  if (!currentOrderId) { location.href = '/checkout.html'; return; }

  currentTotal = pending?.total || 0;

  const oid = document.getElementById('displayOrderId');
  if (oid) oid.textContent = currentOrderId;
  const amt = document.getElementById('displayAmount');
  if (amt) amt.textContent = '₹' + (currentTotal || 0).toLocaleString('en-IN');

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

  const uid = document.getElementById('upiIdDisplay');
  if (uid) uid.textContent = upiId;

  const qr = document.getElementById('qrArea');
  if (qr) {
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('DS-' + currentOrderId)}`;
    const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(upiLink)}&color=6c3de8&bgcolor=ffffff&margin=2`;
    qr.innerHTML  = `<img src="${qrUrl}" alt="UPI QR Code" style="width:100%;height:100%;object-fit:contain;border-radius:8px;" onerror="this.parentElement.innerHTML='<span style=font-size:2rem>📱</span>'"/>`;
  }

  const grid = document.getElementById('appGrid');
  if (!grid) return;
  const enc = encodeURIComponent;
  const q   = `pa=${enc(upiId)}&pn=${enc(upiName)}&am=${amount}&cu=INR&tn=${enc('DS-' + currentOrderId)}`;

  const apps = [
    { icon: '🟢', label: 'Google Pay', url: `tez://upi/pay?${q}`,   featured: true },
    { icon: '💜', label: 'PhonePe',    url: `phonepe://pay?${q}`,    featured: true },
    { icon: '🔵', label: 'Paytm',      url: `paytmmp://pay?${q}`,    featured: false },
    { icon: '🟡', label: 'BHIM',       url: `upi://pay?${q}`,        featured: false },
    { icon: '🏦', label: 'Any UPI',    url: `upi://pay?${q}`,        featured: false },
    { icon: '📋', label: 'Copy ID',    url: null, copy: upiId,       featured: false },
  ];

  grid.innerHTML = apps.map(a => `
    <button class="app-btn${a.featured?' featured':''}" onclick="${a.copy
      ? `copyUpiText('${a.copy}')`
      : `openUpiApp('${a.url}')`}">
      <span class="app-btn-icon">${a.icon}</span>
      <span>${a.label}</span>
    </button>`).join('');
}

function openUpiApp(url) {
  window.location.href = url;
  setTimeout(() => showToast('If app did not open, scan QR or copy UPI ID.', 'error'), 1800);
}

function copyUpiId() { copyUpiText(siteSettings.upiId || 'domainstore@upi'); }
function copyUpiText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('📋 Copied: ' + text, 'success'));
}

// ── Payment Session Timer (10 min) ────────────────────────────
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
      showToast('⏱️ Session expired! Please restart checkout.', 'error');
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

// ── UTR Live Validation ───────────────────────────────────────
function liveUtrCheck(input) {
  const val  = (input.value || '').trim().toUpperCase();
  const hint = document.getElementById('utrHint');
  input.value = val;
  if (!val) { input.className = 'utr-field'; hint.style.display = 'none'; return; }
  const result = validateUtr(val);
  hint.style.display = 'block';
  hint.className      = 'utr-hint ' + result.level;
  hint.textContent    = result.msg;
  input.className     = 'utr-field ' + (result.ok ? 'ok' : result.level === 'invalid' ? 'err' : '');
}

function validateUtr(utr) {
  const u = (utr || '').trim().toUpperCase();
  if (!u) return { ok: false, msg: '', level: '' };
  if (u.length < 8) return { ok: false, msg: `⏳ Keep typing... (${u.length} chars)`, level: 'warn' };
  if (!/^[A-Z0-9]+$/.test(u)) return { ok: false, msg: '❌ Only letters and numbers allowed', level: 'invalid' };
  if (/^(.)\1{7,}$/.test(u)) return { ok: false, msg: '❌ Invalid UTR — repeated digits', level: 'invalid' };
  const badSeq = ['12345678901','23456789012','98765432109'];
  if (badSeq.some(s => u.includes(s))) return { ok: false, msg: '❌ Sequential numbers not valid', level: 'invalid' };
  if (['123456789012','000000000000','111111111111','999999999999'].includes(u))
    return { ok: false, msg: '❌ This UTR is not valid', level: 'invalid' };
  if (/^\d{12}$/.test(u)) return { ok: true, msg: `✅ Valid UPI reference (12-digit)`, level: 'ok' };
  if (/^[A-Z]{4}\d{8,14}$/.test(u)) return { ok: true, msg: `✅ Valid NEFT/RTGS UTR`, level: 'ok' };
  if (u.length >= 12 && u.length <= 22) return { ok: true, msg: `✅ Valid reference number`, level: 'ok' };
  return { ok: false, msg: '❌ UTR format not recognized. Check your payment receipt.', level: 'invalid' };
}

// ── Submit UTR ────────────────────────────────────────────────
async function submitUtr() {
  const utrVal = (document.getElementById('utrInput')?.value || '').trim().toUpperCase();
  const hint   = document.getElementById('utrHint');
  const result = validateUtr(utrVal);

  if (!result.ok) {
    if (hint) { hint.style.display = 'block'; hint.className = 'utr-hint err'; hint.textContent = result.msg || '❌ Enter a valid UTR'; }
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

    clearInterval(payTimer);
    const cu = document.getElementById('confirmedUtr'); if (cu) cu.textContent = utrVal;
    const fo = document.getElementById('finalOrderId'); if (fo) fo.textContent = currentOrderId;

    sessionStorage.setItem('lastOrder', JSON.stringify({
      orderId: currentOrderId, utr: utrVal, total: currentTotal, status: 'UTR Pending'
    }));

    goStep(3);
    startPendingCountdown();
    startOrderPolling(); // ← LIVE POLLING STARTS HERE
    showToast('✅ UTR submitted! Waiting for admin verification.', 'success');

  } catch(e) {
    showToast('Network error. Please try again.', 'error');
    btn.textContent = '✅ Confirm Payment'; btn.disabled = false;
  }
}

// ── LIVE ORDER POLLING — checks every 8 sec if admin activated ─
function startOrderPolling() {
  clearInterval(pollTimer);
  let tries = 0;
  pollTimer = setInterval(async () => {
    tries++;
    if (tries > 75) { clearInterval(pollTimer); return; } // stop after ~10 min
    try {
      const res = await fetch(`/api/orders/status/${currentOrderId}`).then(r => r.json());
      if (res.status === 'Active') {
        clearInterval(pollTimer);
        clearInterval(pendingTimer);
        showActivatedUI();
      }
    } catch(e) { /* silent */ }
  }, 8000);
}

// ── Show SUCCESS when admin activates ────────────────────────
function showActivatedUI() {
  const panel = document.getElementById('panel3');
  if (!panel) return;

  // Burst animation + replace pending content with SUCCESS
  panel.innerHTML = `
    <div class="card">
      <div style="text-align:center;padding:20px 10px;">
        <div style="width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;font-size:2.8rem;margin:0 auto 20px;animation:popIn .6s cubic-bezier(.175,.885,.32,1.275);">✅</div>
        <h2 style="font-size:1.4rem;margin-bottom:8px;color:#22c55e;">Payment Confirmed!</h2>
        <p style="font-size:.88rem;color:var(--text-muted);margin-bottom:20px;">Your domain/hosting has been activated successfully.</p>

        <div style="background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.25);border-radius:12px;padding:16px;margin:16px 0;text-align:left;">
          <div style="font-size:.8rem;color:#22c55e;font-weight:700;margin-bottom:8px;">🎉 What's Activated:</div>
          <div style="font-size:.82rem;color:var(--text-muted);line-height:1.8;">
            ✅ Domain registered & active<br/>
            ✅ Hosting plan activated<br/>
            ✅ Login to dashboard to manage
          </div>
        </div>

        <div style="font-size:.78rem;color:var(--text-muted);margin-bottom:20px;">
          Order: <strong style="color:var(--accent);font-family:monospace;">${currentOrderId}</strong>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <a href="/dashboard/" class="btn btn-primary" style="justify-content:center;text-decoration:none;padding:13px;">
            🚀 Go to Dashboard
          </a>
          <a href="/" class="btn btn-outline" style="justify-content:center;text-decoration:none;">
            🏠 Back to Store
          </a>
        </div>
      </div>
    </div>`;

  // Confetti-style toast
  showToast('🎉 Payment confirmed! Your service is now active!', 'success');
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

// ── Pending Countdown (10 min display) ───────────────────────
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
        box.innerHTML = '<div style="color:#22c55e;font-size:.9rem;font-weight:700;">✅ Check your email for status!</div>';
      }
    }
  }, 1000);
}

document.addEventListener('DOMContentLoaded', () => { init(); });
