let promoDiscount = 0;

function fmt(n) { return '₹' + (n||0).toLocaleString('en-IN'); }

function renderCart() {
  const cart = getCart();
  const list = document.getElementById('cartItemsList');
  const empty = document.getElementById('emptyCart');
  const grid = document.getElementById('cartGrid');
  const sub = document.getElementById('cartSubtitle');

  if (!list) return;

  if (!cart.length) {
    if (grid) grid.style.display = 'none';
    if (empty) empty.style.display = 'block';
    if (sub) sub.textContent = '';
    return;
  }

  if (grid) grid.style.display = 'grid';
  if (empty) empty.style.display = 'none';
  if (sub) sub.textContent = `${cart.length} item${cart.length > 1 ? 's' : ''} in your cart`;

  list.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div style="display:flex;align-items:center;gap:14px;flex:1;">
        <div class="cart-item-icon ${item.type}">
          ${item.type === 'domain' ? '🌐' : '⚡'}
        </div>
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <p>${item.type === 'domain' ? '1 Year Registration' : `Per ${item.period||'month'}`}</p>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:16px;">
        <span class="cart-item-price">${fmt(item.price)}</span>
        <button class="remove-btn" onclick="removeItem('${item.id}')" title="Remove">✕</button>
      </div>
    </div>
  `).join('');

  updateTotals();
}

function removeItem(id) {
  const cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
  renderCart();
  showToast('Item removed', 'error');
}

function updateTotals() {
  const cart = getCart();
  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  const total = Math.max(subtotal - promoDiscount, 0);

  const sub = document.getElementById('subtotal');
  const tot = document.getElementById('totalAmt');
  const discRow = document.getElementById('discountRow');
  const discAmt = document.getElementById('discountAmt');

  if (sub) sub.textContent = fmt(subtotal);
  if (tot) tot.textContent = fmt(total);
  if (discRow) discRow.style.display = promoDiscount > 0 ? 'flex' : 'none';
  if (discAmt) discAmt.textContent = '-' + fmt(promoDiscount);
}

async function applyPromo() {
  const code = (document.getElementById('promoInput').value || '').trim();
  const msg = document.getElementById('promoMsg');
  if (!code) return;

  const cart = getCart();
  const subtotal = cart.reduce((s, i) => s + i.price, 0);

  try {
    const res = await fetch('/api/admin/promos/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, total: subtotal })
    }).then(r => r.json());

    if (res.valid) {
      promoDiscount = res.discount;
      msg.innerHTML = `<span style="color:var(--green);">✅ Promo applied! You save ${fmt(res.discount)}</span>`;
      updateTotals();
    } else {
      promoDiscount = 0;
      msg.innerHTML = `<span style="color:var(--accent2);">❌ ${res.error}</span>`;
      updateTotals();
    }
  } catch (e) {
    msg.innerHTML = `<span style="color:var(--accent2);">❌ Could not validate promo</span>`;
  }
}

function proceedToCheckout() {
  const cart = getCart();
  if (!cart.length) return showToast('Cart is empty!', 'error');
  const subtotal = cart.reduce((s, i) => s + i.price, 0);
  sessionStorage.setItem('checkout_discount', promoDiscount);
  sessionStorage.setItem('checkout_promo', document.getElementById('promoInput')?.value || '');
  location.href = '/checkout.html';
}

document.addEventListener('DOMContentLoaded', renderCart);
