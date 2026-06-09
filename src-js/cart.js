let promoDiscount = 0;

function fmt(n) { return '₹' + (n||0).toLocaleString('en-IN'); }

window.updateCartItemYears = function(id, years) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.years = parseInt(years, 10);
    // Also sync addon years for privacy add-on linked to this domain
    const addonPrivacy = cart.find(i => i.addonFor === id && i.id.startsWith('addon-privacy-'));
    if (addonPrivacy) addonPrivacy.years = parseInt(years, 10);
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

  // Count real items (not addons) for subtitle
  const realCount = cart.filter(i => !i.isAddon).length;
  if (sub) sub.textContent = `${cart.length} item${cart.length > 1 ? 's' : ''} in your cart`;

  list.innerHTML = cart.map(item => {
    const y = item.years || 1;
    const itemTotal = item.price * y;

    // ── Domain item (main) ──────────────────────────────────────
    if (item.type === 'domain') {
      const yearDropdown = `
        <div style="margin-top:8px;">
          <label style="font-size:.75rem;color:var(--text-muted);margin-bottom:4px;display:block;">Registration Period</label>
          <select class="form-control" style="width:120px;padding:4px 8px;font-size:.85rem;" onchange="updateCartItemYears('${item.id}', this.value)">
            ${[1,2,3,4,5,6,7,8,9,10].map(yr => `<option value="${yr}" ${y == yr ? 'selected' : ''}>${yr} Year${yr>1?'s':''}</option>`).join('')}
          </select>
        </div>`;
      return `
        <div class="cart-item" style="border-left:3px solid var(--accent);">
          <div style="display:flex;align-items:center;gap:14px;flex:1;">
            <div class="cart-item-icon domain">🌐</div>
            <div class="cart-item-info">
              <h4>${item.name}</h4>
              <p style="color:var(--text-muted);font-size:.82rem;">Domain Registration</p>
              ${yearDropdown}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="text-align:right;">
              <div class="cart-item-price">${fmt(itemTotal)}</div>
              <div style="font-size:.75rem;color:var(--text-muted);">${fmt(item.price)}/yr</div>
            </div>
            <button class="remove-btn" onclick="removeItem('${item.id}')" title="Remove">✕</button>
          </div>
        </div>`;
    }

    // ── Add-on item (auto-added) ────────────────────────────────
    if (item.isAddon) {
      return `
        <div class="cart-item" style="background:rgba(16,185,129,.04);border:1px dashed rgba(16,185,129,.35);border-radius:10px;margin-left:20px;padding:14px 18px;">
          <div style="display:flex;align-items:center;gap:12px;flex:1;">
            <div style="width:36px;height:36px;border-radius:8px;background:rgba(16,185,129,.15);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;">${item.icon||'🎁'}</div>
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <h4 style="font-size:.92rem;margin:0;">${item.name}</h4>
                <span style="background:linear-gradient(135deg,#10b981,#3b82f6);color:#fff;font-size:.65rem;padding:2px 7px;border-radius:20px;font-weight:700;">ADD-ON</span>
              </div>
              <p style="font-size:.78rem;color:var(--text-muted);margin-top:2px;">${item.subName || ''}</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="text-align:right;">
              <div class="cart-item-price" style="font-size:1rem;">${fmt(item.price)}</div>
              <div style="font-size:.72rem;color:var(--text-muted);">per ${item.period||'year'}</div>
            </div>
            <button onclick="removeAddon('${item.id}')" title="Remove add-on"
              style="width:28px;height:28px;border-radius:50%;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.08);color:#ef4444;cursor:pointer;font-size:.85rem;display:flex;align-items:center;justify-content:center;transition:all .2s;"
              onmouseover="this.style.background='rgba(239,68,68,.2)'" onmouseout="this.style.background='rgba(239,68,68,.08)'">✕</button>
          </div>
        </div>`;
    }

    // ── Hosting / other item ────────────────────────────────────
    return `
      <div class="cart-item">
        <div style="display:flex;align-items:center;gap:14px;flex:1;">
          <div class="cart-item-icon hosting">⚡</div>
          <div class="cart-item-info">
            <h4>${item.name}</h4>
            <p>Per ${item.period||'month'}</p>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <div style="text-align:right;">
            <div class="cart-item-price">${fmt(itemTotal)}</div>
            <div style="font-size:.75rem;color:var(--text-muted);">${fmt(item.price)}/mo</div>
          </div>
          <button class="remove-btn" onclick="removeItem('${item.id}')" title="Remove">✕</button>
        </div>
      </div>`;
  }).join('');

  updateTotals();
}

function removeItem(id) {
  // When removing a domain, also remove its linked addons
  let cart = getCart().filter(i => i.id !== id && i.addonFor !== id);
  saveCart(cart);
  renderCart();
  showToast('Item removed from cart', 'error');
}

function removeAddon(id) {
  let cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
  renderCart();
  showToast('Add-on removed', 'error');
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
