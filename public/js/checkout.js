let selectedPayMethod = 'upi_manual';
let promoDiscount = 0;
let promoCode = '';
let siteSettings = {};
let placedOrderId = null;
let utrValidated = false;

// fmt helper (safe to redefine as function — no conflict with main.js)
function fmt(n) { return '\u20b9' + (n || 0).toLocaleString('en-IN'); }
// NOTE: getCart() comes from main.js

// ── Load settings (UPI ID etc.) ─────────────────────────────
async function loadSettings() {
  try {
    siteSettings = await fetch('/api/admin/settings').then(r => r.json());
    const upiDisplay = document.getElementById('upiIdDisplay');
    if (upiDisplay) upiDisplay.textContent = siteSettings.upiId || 'domainstore@upi';

    // Generate QR code link using Google QR API
    const qrArea = document.getElementById('qrArea');
    if (qrArea && siteSettings.upiId) {
      const upiLink = `upi://pay?pa=${encodeURIComponent(siteSettings.upiId)}&pn=${encodeURIComponent(siteSettings.upiName || 'DomainStore')}&cu=INR`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiLink)}`;
      qrArea.innerHTML = `<img src="${qrUrl}" alt="UPI QR Code" style="width:160px;height:160px;border-radius:10px;" onerror="this.parentElement.innerHTML='📱'"/>`;
      qrArea.style.background = '#fff';
      qrArea.style.border = 'none';
      qrArea.style.padding = '8px';
    }
  } catch (e) {
    const upiDisplay = document.getElementById('upiIdDisplay');
    if (upiDisplay) upiDisplay.textContent = 'domainstore@upi';
  }
}

function copyUpiId() {
  const id = siteSettings.upiId || 'domainstore@upi';
  navigator.clipboard.writeText(id).then(() => showToast('UPI ID copied! ' + id, 'success'));
}

// ── Payment method switcher ──────────────────────────────────
function selectPayMethod(el, method) {
  selectedPayMethod = method;
  document.querySelectorAll('.pay-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');

  const fields = ['upi_manual', 'card', 'netbanking', 'cod'];
  fields.forEach(f => {
    const el = document.getElementById('field-' + f);
    if (el) el.style.display = f === method ? 'block' : 'none';
  });

  utrValidated = false; // reset UTR validation on method change
  updateTotals();
}

// ── Load checkout summary ────────────────────────────────────
function loadCheckoutSummary() {
  const cart = getCart();
  if (!cart.length) { location.href = '/cart.html'; return; }

  const items = document.getElementById('coItems');
  if (items) {
    items.innerHTML = cart.map(i => `
      <div style="display:flex;justify-content:space-between;font-size:.875rem;margin-bottom:8px;gap:8px;">
        <span style="color:var(--text-muted);flex:1;">${i.name}</span>
        <span style="font-weight:600;white-space:nowrap;">${fmt(i.price)}</span>
      </div>
    `).join('');
  }

  // Restore promo from session
  const savedDiscount = parseInt(sessionStorage.getItem('checkout_discount') || '0');
  const savedPromo    = sessionStorage.getItem('checkout_promo') || '';
  if (savedDiscount > 0 && savedPromo) {
    promoDiscount = savedDiscount;
    promoCode     = savedPromo;
    const inp = document.getElementById('coPromo');
    if (inp) inp.value = savedPromo;
    const msg = document.getElementById('coPromoMsg');
    if (msg) msg.innerHTML = `<span style="color:var(--green);">✅ Promo applied! Saving ${fmt(savedDiscount)}</span>`;
  }

  updateTotals();
}

function updateTotals() {
  const cart = getCart();
  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  const codFee = selectedPayMethod === 'cod' ? 50 : 0;
  const total = Math.max(subtotal - promoDiscount, 0) + codFee;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('coSubtotal', fmt(subtotal));
  set('coDisc', '-' + fmt(promoDiscount));
  set('coTotal', fmt(total));

  const discRow = document.getElementById('coDiscRow');
  if (discRow) discRow.style.display = promoDiscount > 0 ? 'flex' : 'none';

  const codRow = document.getElementById('coCodRow');
  if (codRow) codRow.style.display = selectedPayMethod === 'cod' ? 'flex' : 'none';
}

// ── Promo code ───────────────────────────────────────────────
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
      promoDiscount = res.discount;
      promoCode     = code;
      sessionStorage.setItem('checkout_discount', promoDiscount);
      sessionStorage.setItem('checkout_promo', promoCode);
      if (msg) msg.innerHTML = `<span style="color:var(--green);">✅ ${res.type === 'percent' ? res.value + '% off' : '₹' + res.value + ' off'} applied! Saving ${fmt(res.discount)}</span>`;
      updateTotals();
      showToast('🎉 Promo code applied!', 'success');
    } else {
      if (msg) msg.innerHTML = `<span style="color:var(--accent2);">❌ ${res.error}</span>`;
      promoDiscount = 0; promoCode = ''; updateTotals();
    }
  } catch (e) {
    if (msg) msg.innerHTML = `<span style="color:var(--accent2);">❌ Could not validate promo</span>`;
  }
}

// ── UTR Validation ───────────────────────────────────────────
function validateUTR() {
  const utr = (document.getElementById('utrInput')?.value || '').trim().toUpperCase();
  const msg = document.getElementById('utrMsg');
  if (!utr) { if (msg) msg.innerHTML = `<span style="color:var(--accent2);">❌ Please enter your UTR/Transaction ID</span>`; return; }
  if (!/^[A-Z0-9]{8,25}$/.test(utr)) {
    if (msg) msg.innerHTML = `<span style="color:var(--accent2);">❌ Invalid format. UTR should be 8-25 alphanumeric characters.</span>`;
    utrValidated = false; return;
  }
  if (msg) msg.innerHTML = `<span style="color:var(--green);">✅ UTR format valid: <strong>${utr}</strong>. Click "Place Order" to submit.</span>`;
  utrValidated = true;
}

// ── Place order ──────────────────────────────────────────────
async function placeOrder() {
  const firstName = document.getElementById('firstName')?.value.trim();
  const lastName  = document.getElementById('lastName')?.value.trim();
  const email     = document.getElementById('email')?.value.trim();
  const phone     = document.getElementById('phone')?.value.trim();

  if (!firstName || !lastName) return showToast('Please enter your name', 'error');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('Please enter a valid email', 'error');
  if (!phone) return showToast('Please enter your phone number', 'error');

  // UPI manual: require UTR to be entered and validated
  let utrValue = '';
  if (selectedPayMethod === 'upi_manual') {
    utrValue = (document.getElementById('utrInput')?.value || '').trim().toUpperCase();
    if (!utrValue) return showToast('Please enter your UTR/Transaction ID after paying', 'error');
    if (!utrValidated) { validateUTR(); if (!utrValidated) return; }
  }

  const cart = getCart();
  if (!cart.length) return showToast('Your cart is empty', 'error');

  const codFee = selectedPayMethod === 'cod' ? 50 : 0;
  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  const baseTotal = Math.max(subtotal - promoDiscount, 0);
  const total = baseTotal + codFee;

  if (selectedPayMethod === 'cod' && baseTotal > 5000) return showToast('COD available only for orders up to ₹5,000', 'error');

  const btn = document.getElementById('placeOrderBtn');
  btn.textContent = '⏳ Placing order...'; btn.disabled = true;

  try {
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: `${firstName} ${lastName}`, email, phone },
        items: cart,
        promoCode,
        paymentMethod: selectedPayMethod,
        codFee
      })
    }).then(r => r.json());

    if (!res.success) throw new Error(res.error || 'Order failed');

    placedOrderId = res.orderId;

    // If UPI manual, submit UTR
    if (selectedPayMethod === 'upi_manual' && utrValue) {
      try {
        await fetch('/api/admin/utr-submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: res.orderId, utr: utrValue })
        });
      } catch (e) {}
    }

    localStorage.removeItem('ds_cart');
    sessionStorage.removeItem('checkout_discount');
    sessionStorage.removeItem('checkout_promo');
    sessionStorage.setItem('lastOrder', JSON.stringify({
      orderId: res.orderId, email, total: res.total,
      paymentMethod: selectedPayMethod, utr: utrValue
    }));
    location.href = '/confirmation.html';

  } catch (e) {
    showToast(e.message || 'Order failed. Try again.', 'error');
    btn.textContent = '🔒 Place Order'; btn.disabled = false;
  }
}

// ── Card formatting ───────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadCheckoutSummary();
  const hb = document.getElementById('hamburger');
  const nl = document.getElementById('navLinks');
  if (hb && nl) hb.addEventListener('click', () => nl.classList.toggle('open'));

  const cardNum = document.getElementById('cardNum');
  if (cardNum) cardNum.addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g,'').replace(/(.{4})/g,'$1 ').trim().slice(0,19);
  });
  const cardExp = document.getElementById('cardExp');
  if (cardExp) cardExp.addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g,'').replace(/^(\d{2})(\d)/,'$1/$2').slice(0,5);
  });
});
