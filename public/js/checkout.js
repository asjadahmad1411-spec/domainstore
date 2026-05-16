// checkout.js — handles form validation + order creation → redirect to UPI page
let promoDiscount = 0;
let promoCode = '';

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

  // Restore saved promo
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
  const cart = getCart();
  const sub  = cart.reduce((s, i) => s + i.price, 0);
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
  } catch(e) { if (msg) msg.innerHTML = `<span style="color:#ef4444;">❌ Error validating promo</span>`; }
}

// ── Proceed to Pay: validate → create order → redirect ────────
async function proceedToPayment() {
  const firstName = document.getElementById('firstName')?.value.trim();
  const lastName  = document.getElementById('lastName')?.value.trim();
  const email     = document.getElementById('email')?.value.trim();
  const phone     = document.getElementById('phone')?.value.trim();

  if (!firstName || !lastName) return showToast('Please enter your full name', 'error');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('Please enter a valid email', 'error');
  if (!phone || phone.length < 10) return showToast('Please enter a valid phone number', 'error');

  const cart = getCart();
  if (!cart.length) return showToast('Your cart is empty', 'error');

  const btn = document.getElementById('proceedBtn');
  btn.textContent = '⏳ Creating order...'; btn.disabled = true;

  try {
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer: { name: `${firstName} ${lastName}`, email, phone },
        items: cart, promoCode, paymentMethod: 'upi_manual', codFee: 0
      })
    }).then(r => r.json());

    if (!res.success) throw new Error(res.error || 'Order creation failed');

    // Clear cart + save order info for payment page
    localStorage.removeItem('ds_cart');
    sessionStorage.removeItem('checkout_discount');
    sessionStorage.removeItem('checkout_promo');
    sessionStorage.setItem('pendingOrder', JSON.stringify({
      orderId: res.orderId, total: res.total, email, name: `${firstName} ${lastName}`
    }));

    // Redirect to UPI payment page
    location.href = '/upi-payment.html?order=' + res.orderId;

  } catch(e) {
    showToast(e.message || 'Error. Please try again.', 'error');
    btn.textContent = '📲 Proceed to Pay'; btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCheckoutSummary();
  // Pre-fill from user account if logged in
  const user = (() => { try { return JSON.parse(localStorage.getItem('ds_user') || 'null'); } catch { return null; } })();
  if (user) {
    const nm = (user.name || '').split(' ');
    const fi = document.getElementById('firstName'); if (fi && nm[0]) fi.value = nm[0];
    const li = document.getElementById('lastName');  if (li && nm[1]) li.value = nm.slice(1).join(' ');
    const em = document.getElementById('email');     if (em) em.value = user.email || '';
    const ph = document.getElementById('phone');     if (ph) ph.value = user.phone || '';
  }
  const hb = document.getElementById('hamburger');
  const nl = document.getElementById('navLinks');
  if (hb && nl) hb.addEventListener('click', () => nl.classList.toggle('open'));
});
