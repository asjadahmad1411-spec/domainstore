let promoDiscount = 0;

function fmt(n) { return '₹' + (n||0).toLocaleString('en-IN'); }

window.updateCartItemYears = function(id, years) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.years = parseInt(years, 10);
    saveCart(cart);
    renderCart();
  }
};

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

  list.innerHTML = cart.map(item => {
    let yearDropdown = '';
    const y = item.years || 1;
    if (item.type === 'domain') {
      yearDropdown = `
        <div style="margin-top:8px;">
          <select class="form-control" style="width:100px; padding: 4px 8px; font-size: 0.85rem;" onchange="updateCartItemYears('${item.id}', this.value)">
            ${[1,2,3,4,5,6,7,8,9,10].map(yr => `<option value="${yr}" ${y == yr ? 'selected' : ''}>${yr} Year${yr>1?'s':''}</option>`).join('')}
          </select>
        </div>
      `;
    }
    const itemTotal = item.price * y;
    return `
      <div class="cart-item">
        <div style="display:flex;align-items:center;gap:14px;flex:1;">
          <div class="cart-item-icon ${item.type}">
            ${item.type === 'domain' ? '🌐' : '⚡'}
          </div>
          <div class="cart-item-info">
            <h4>${item.name}</h4>
            <p>${item.type === 'domain' ? 'Domain Registration' : `Per ${item.period||'month'}`}</p>
            ${yearDropdown}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="text-align:right;">
            <div class="cart-item-price">${fmt(itemTotal)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${fmt(item.price)}/${item.type === 'domain' ? 'yr' : 'mo'}</div>
          </div>
          <button class="remove-btn" onclick="removeItem('${item.id}')" title="Remove">✕</button>
        </div>
      </div>
    `;
  }).join('');

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
  const subtotal = cart.reduce((s, i) => s + (i.price * (i.years || 1)), 0);
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
  const subtotal = cart.reduce((s, i) => s + (i.price * (i.years || 1)), 0);

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
  sessionStorage.setItem('checkout_discount', promoDiscount);
  sessionStorage.setItem('checkout_promo', document.getElementById('promoInput')?.value || '');
  location.href = '/checkout.html';
}

document.addEventListener('DOMContentLoaded', renderCart);
