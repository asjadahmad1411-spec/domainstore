// upi-payment.js — Razorpay Style Payment Flow
let siteSettings = {};
let sessionTimer = null;
let verifyTimer = null;
let pollTimer = null;
let currentOrderId = null;
let currentTotal = 0;

async function init() {
  const params = new URLSearchParams(location.search);
  currentOrderId = params.get('order');
  const pending  = (() => { try { return JSON.parse(sessionStorage.getItem('pendingOrder') || 'null'); } catch { return null; } })();

  if (!currentOrderId && pending) currentOrderId = pending.orderId;
  if (!currentOrderId) { location.href = '/checkout.html'; return; }

  currentTotal = pending?.total || 0;

  const formattedTotal = '₹' + (currentTotal || 0).toLocaleString('en-IN');
  const dispAmt = document.getElementById('displayAmount');
  if(dispAmt) dispAmt.textContent = formattedTotal;

  try {
    siteSettings = await fetch('/api/admin/settings').then(r => r.json());
  } catch(e) {
    siteSettings = { upiId: 'enroothost@upi', upiName: 'EnrootHost' };
  }

  buildUpiUI();
  startSessionTimer();
}

function buildUpiUI() {
  const upiId   = siteSettings.upiId   || 'enroothost@upi';
  const upiName = siteSettings.upiName || 'EnrootHost';
  const amount  = currentTotal || 0;

  const uid = document.getElementById('upiIdDisplay');
  if (uid) uid.innerHTML = `<span>${upiId}</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;

  const qr = document.getElementById('qrArea');
  if (qr) {
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('DS-' + currentOrderId)}`;
    const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiLink)}&color=000000&bgcolor=ffffff&margin=0`;
    qr.innerHTML  = `<img src="${qrUrl}" alt="UPI QR"/>`;
  }
}

function openUpiApp(app) {
  const upiId   = siteSettings.upiId   || 'enroothost@upi';
  const upiName = siteSettings.upiName || 'EnrootHost';
  const amount  = currentTotal || 0;
  
  const enc = encodeURIComponent;
  const q   = `pa=${enc(upiId)}&pn=${enc(upiName)}&am=${amount}&cu=INR&tn=${enc('DS-' + currentOrderId)}`;
  
  let url = `upi://pay?${q}`;
  if(app === 'gpay') url = `tez://upi/pay?${q}`;
  else if(app === 'phonepe') url = `phonepe://pay?${q}`;
  else if(app === 'paytm') url = `paytmmp://pay?${q}`;
  
  window.location.href = url;
  setTimeout(() => showToast('If app did not open, please scan the QR code.', 'warning'), 1500);
}

function copyUpiId() {
  navigator.clipboard.writeText(siteSettings.upiId || 'enroothost@upi').then(() => {
    showToast('UPI ID Copied!', 'success');
  });
}

function showToast(msg, type='success') {
  const toast = document.getElementById('toast');
  if(!toast) return;
  toast.textContent = msg;
  toast.style.background = type === 'error' ? '#ef4444' : (type === 'warning' ? '#f59e0b' : '#333');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function showView(viewId) {
  document.getElementById('viewMain').classList.remove('view-active');
  document.getElementById('viewLoading').classList.remove('view-active');
  document.getElementById('viewSuccess').classList.remove('view-active');
  
  const el = document.getElementById(viewId);
  if (el) el.classList.add('view-active');
}

function startSessionTimer() {
  let secs = 10 * 60;
  const disp = document.getElementById('payTimer');
  clearInterval(sessionTimer);
  sessionTimer = setInterval(() => {
    secs--;
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    if (disp) disp.textContent = m + ':' + s;
    if (secs <= 0) {
      clearInterval(sessionTimer);
      if (disp) disp.textContent = '00:00';
      showToast('Session expired. Please start over.', 'error');
      setTimeout(() => location.href = '/cart.html', 2000);
    }
  }, 1000);
}

async function markAsPaid() {
  if (!currentOrderId) return;
  const btn = document.getElementById('btnIHavePaid');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }

  try {
    const res = await fetch('/api/admin/utr-submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: currentOrderId, utr: 'MANUAL' })
    }).then(r => r.json());

    if (!res.success) {
      if (btn) { btn.disabled = false; btn.textContent = 'I have paid'; }
      showToast(res.error || 'Failed to submit request', 'error');
      return;
    }

    clearInterval(sessionTimer);
    const payTimerEl = document.getElementById('payTimer');
    if (payTimerEl) payTimerEl.style.display = 'none';
    showView('viewLoading');
    startVerificationTimer();
    startOrderPolling();

  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = 'I have paid'; }
    showToast('Network error', 'error');
  }
}

function startVerificationTimer() {
  let secs = 2 * 60; // 2 minutes
  const disp = document.getElementById('verifyTimer');
  clearInterval(verifyTimer);
  
  verifyTimer = setInterval(() => {
    secs--;
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    if (disp) disp.textContent = m + ':' + s;
    
    if (secs <= 0) {
      clearInterval(verifyTimer);
      clearInterval(pollTimer);
      if (disp) disp.textContent = '00:00';
      
      document.getElementById('viewLoading').innerHTML = `
        <div style="font-size:3rem;margin-bottom:10px;">⏳</div>
        <h3 style="font-size:1.1rem; margin-bottom:8px;">Verification Pending</h3>
        <p style="font-size:0.85rem; color:var(--text-mut); max-width:280px; line-height:1.4;">Admin review is taking longer than expected. If amount was deducted, your order will be activated shortly.</p>
        <p style="font-size:0.8rem; margin-top:16px;">Order ID: <strong>${currentOrderId}</strong></p>
        <a href="/" style="display:inline-block; margin-top:16px; padding:8px 16px; border:1px solid var(--border); color:var(--text); text-decoration:none; border-radius:4px; font-size:0.85rem;">Back to Store</a>
      `;
    }
  }, 1000);
}

function startOrderPolling() {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/orders/status/${currentOrderId}`).then(r => r.json());
      if (res.status === 'Active') {
        clearInterval(pollTimer);
        clearInterval(verifyTimer);
        showView('viewSuccess');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        // Fire Ads Conversions
        if (window.gtag && window.googleAdsTag) {
          window.gtag('event', 'conversion', { 'send_to': window.googleAdsTag, 'value': currentTotal, 'currency': 'INR', 'transaction_id': currentOrderId });
        }
        if (window.fbq) {
          window.fbq('track', 'Purchase', { value: currentTotal, currency: 'INR' });
        }
      }
    } catch(e) { /* silent fail for polling */ }
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => { init(); });
