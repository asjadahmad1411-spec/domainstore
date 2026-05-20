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

  // Set IDs and Amounts in UI
  ['displayOrderId', 'loadingOrderId', 'successOrderId'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = currentOrderId;
  });
  
  const formattedTotal = '₹' + (currentTotal || 0).toLocaleString('en-IN');
  ['displayAmount', 'successAmount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = formattedTotal;
  });

  try {
    siteSettings = await fetch('/api/admin/settings').then(r => r.json());
  } catch(e) {
    siteSettings = { upiId: 'domainstore@upi', upiName: 'DomainStore' };
  }

  buildUpiUI();
  startSessionTimer();
}

function buildUpiUI() {
  const upiId   = siteSettings.upiId   || 'domainstore@upi';
  const upiName = siteSettings.upiName || 'DomainStore';
  const amount  = currentTotal || 0;

  const uid = document.getElementById('upiIdDisplay');
  if (uid) uid.textContent = upiId;

  const qr = document.getElementById('qrArea');
  if (qr) {
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('DS-' + currentOrderId)}`;
    const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}&color=6c3de8&bgcolor=ffffff&margin=0`;
    qr.innerHTML  = `<img src="${qrUrl}" alt="UPI QR" style="width:100%;height:100%;object-fit:contain;border-radius:12px;"/>`;
  }

  const grid = document.getElementById('appGrid');
  if (!grid) return;
  const enc = encodeURIComponent;
  const q   = `pa=${enc(upiId)}&pn=${enc(upiName)}&am=${amount}&cu=INR&tn=${enc('DS-' + currentOrderId)}`;

  const apps = [
    { icon: '🟢', label: 'GPay', url: `tez://upi/pay?${q}` },
    { icon: '💜', label: 'PhonePe', url: `phonepe://pay?${q}` },
    { icon: '🔵', label: 'Paytm', url: `paytmmp://pay?${q}` },
    { icon: '🏦', label: 'Any UPI App', url: `upi://pay?${q}` },
  ];

  grid.innerHTML = apps.map(a => `
    <div class="app-btn" onclick="openUpiApp('${a.url}')">
      <span style="font-size:1.2rem">${a.icon}</span> ${a.label}
    </div>`).join('');
}

function openUpiApp(url) {
  window.location.href = url;
  setTimeout(() => showToast('If app did not open, please scan the QR code.', 'warning'), 1500);
}

function copyUpiId() {
  navigator.clipboard.writeText(siteSettings.upiId || 'domainstore@upi').then(() => {
    showToast('📋 UPI ID Copied!', 'success');
  });
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(viewId);
  if (el) el.classList.add('active');
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
    if (secs <= 120 && disp) disp.classList.add('urgent');
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
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></span> Processing...'; }

  try {
    // We send 'MANUAL' to tell backend this is the new verification flow
    const res = await fetch('/api/admin/utr-submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: currentOrderId, utr: 'MANUAL' })
    }).then(r => r.json());

    if (!res.success) {
      if (btn) { btn.disabled = false; btn.innerHTML = '✅ I Have Paid'; }
      showToast(res.error || 'Failed to submit request', 'error');
      return;
    }

    clearInterval(sessionTimer);
    showView('viewLoading');
    startVerificationTimer();
    startOrderPolling();

  } catch(e) {
    if (btn) { btn.disabled = false; btn.innerHTML = '✅ I Have Paid'; }
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
      
      // If 2 minutes run out and no success, show timeout message
      document.getElementById('viewLoading').innerHTML = `
        <div style="font-size:3rem;margin-bottom:10px;">⏳</div>
        <h2 style="font-size:1.3rem; margin-bottom:8px;">Manual Verification Pending</h2>
        <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.5;">Your payment request is securely logged. Admin review is taking longer than expected. If amount was deducted, your order will be activated shortly.</p>
        <p style="font-size:0.8rem; margin-top:20px;">Order ID: <strong>${currentOrderId}</strong></p>
        <a href="/" class="btn btn-outline" style="margin-top:20px; text-decoration:none;">Back to Store</a>
      `;
    }
  }, 1000);
}

function startOrderPolling() {
  clearInterval(pollTimer);
  // Poll every 3 seconds
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(\`/api/orders/status/\${currentOrderId}\`).then(r => r.json());
      if (res.status === 'Active') {
        clearInterval(pollTimer);
        clearInterval(verifyTimer);
        showView('viewSuccess');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        showToast('🎉 Payment Confirmed!', 'success');
      }
    } catch(e) { /* silent fail for polling */ }
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => { init(); });
