const fs = require('fs');

// --- 1. Modify src-js/checkout.js ---
let coJs = fs.readFileSync('src-js/checkout.js', 'utf8');

// Add GST calculation and dynamic payment rendering to loadCheckoutSummary / updateTotals
const newUpdateTotals = `
function updateTotals() {
  const cart = getCart();
  const sub  = cart.reduce((s, i) => s + i.price, 0);
  const discountTot = promoDiscount;
  
  // GST calculation (9% CGST, 9% SGST on discounted subtotal)
  const taxable = Math.max(sub - discountTot, 0);
  const cgst = Math.round(taxable * 0.09 * 100) / 100;
  const sgst = Math.round(taxable * 0.09 * 100) / 100;
  const tot  = taxable + cgst + sgst;
  
  const set  = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('coSubtotal', fmt(sub));
  set('coDisc', '-' + fmt(discountTot));
  set('coCGST', fmt(cgst));
  set('coSGST', fmt(sgst));
  set('coTotal', fmt(tot));
  set('coDueToday', fmt(tot)); // the large text
  
  const dr = document.getElementById('coDiscRow');
  if (dr) dr.style.display = discountTot > 0 ? 'flex' : 'none';
  
  // Store gst in window for payload submission
  window.currentCGST = cgst;
  window.currentSGST = sgst;
}`;
coJs = coJs.replace(/function updateTotals\(\) \{[\s\S]*?(?=\n\/\/ ── Promo)/, newUpdateTotals);

// Modify proceedToPayment to append GST
coJs = coJs.replace('const cart = getCart();', `const cart = getCart();
  if (window.currentCGST) cart.push({ name: 'CGST @ 9%', price: window.currentCGST, cycle: 'once' });
  if (window.currentSGST) cart.push({ name: 'SGST @ 9%', price: window.currentSGST, cycle: 'once' });`);

// Add dynamic payment methods fetch
const initSection = `
// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  loadCheckoutSummary();

  // Load payment settings dynamically
  try {
    const setRes = await fetch('/api/admin/settings').then(r=>r.json());
    const pms = setRes.paymentMethods || { phonepe: true, easebuzz: true, crypto: false };
    let pmHtml = '';
    let hasSelected = false;
    
    if (pms.phonepe !== false) {
      pmHtml += \`<div class="pm-option \${!hasSelected ? 'selected' : ''}" onclick="selPM(this, 'phonepe')"><div class="pm-radio"></div>PhonePe - UPI | Credit/Debit Card | NetBanking</div>\`;
      hasSelected = true;
    }
    if (pms.easebuzz !== false) {
      pmHtml += \`<div class="pm-option \${!hasSelected ? 'selected' : ''}" onclick="selPM(this, 'easebuzz')"><div class="pm-radio"></div>Easebuzz - UPI | Credit/Debit Card | NetBanking</div>\`;
      hasSelected = true;
    }
    if (pms.crypto) {
      pmHtml += \`<div class="pm-option \${!hasSelected ? 'selected' : ''}" onclick="selPM(this, 'crypto')"><div class="pm-radio"></div>Crypto Currency</div>\`;
      hasSelected = true;
    }
    if(!pmHtml) pmHtml = '<div class="pm-option selected"><div class="pm-radio"></div>Standard Gateway</div>';
    
    const pmList = document.getElementById('pmList');
    if (pmList) pmList.innerHTML = pmHtml;
  } catch(e) {}`;
  
coJs = coJs.replace(/\/\/ ── Init ─+[\s\S]*?(?=\/\/ Check if user)/, initSection + '\n  // Check if user');

// Add selPM function
coJs += `
function selPM(el, method) {
  document.querySelectorAll('.pm-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  window.selectedPaymentMethod = method;
}
`;

fs.writeFileSync('src-js/checkout.js', coJs);


// --- 2. Modify public/checkout.html ---
const checkoutHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Checkout — EnrootHost</title>
<meta name="description" content="Complete your domain purchase securely."/>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌐</text></svg>"/>
<link rel="stylesheet" href="/css/main.css"/>
<link rel="stylesheet" href="/css/responsive.css"/>
<style>
.co-wrap{max-width:1100px;margin:100px auto 60px;padding:0 20px;}
.progress-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:40px;font-size:.9rem;font-weight:600;overflow-x:auto;padding-bottom:10px;}
.pb-step{display:flex;align-items:center;gap:8px;color:var(--text-muted);white-space:nowrap;}
.pb-step.active{color:var(--accent);}
.pb-step.completed{color:var(--green);}
.pb-circle{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.8rem;background:var(--border);color:var(--text);}
.pb-step.active .pb-circle{background:var(--accent);color:#fff;}
.pb-step.completed .pb-circle{background:var(--green);color:#fff;}
.pb-line{flex:1;height:2px;background:var(--border);margin:0 15px;min-width:30px;}
.pb-step.completed + .pb-line{background:var(--green);}
.co-grid{display:grid;grid-template-columns:1fr 340px;gap:30px;align-items:start;}
.card{background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,.05);}
.cart-header{display:flex;justify-content:space-between;font-size:.85rem;color:var(--text-muted);border-bottom:1px solid var(--border);padding-bottom:10px;margin-bottom:15px;}
.cart-actions{display:flex;justify-content:space-between;border-top:1px solid var(--border);padding-top:15px;margin-top:10px;}
.pm-title{font-size:1.25rem;font-weight:400;color:var(--text);margin-bottom:5px;}
.pm-sub{font-size:.85rem;color:var(--text-muted);margin-bottom:20px;}
.pm-list{border:1px solid var(--border);border-radius:8px;overflow:hidden;}
.pm-option{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid var(--border);cursor:pointer;font-size:.9rem;font-weight:600;color:var(--text);}
.pm-option:last-child{border-bottom:none;}
.pm-option:hover{background:rgba(0,0,0,0.02);}
.pm-radio{width:18px;height:18px;border-radius:50%;border:2px solid var(--text-muted);position:relative;}
.pm-option.selected .pm-radio{border-color:var(--accent);}
.pm-option.selected .pm-radio::after{content:'';position:absolute;width:10px;height:10px;background:var(--accent);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);}
.summary-title{font-size:1.4rem;font-weight:400;color:var(--text);margin-bottom:20px;}
.summary-row{display:flex;justify-content:space-between;font-size:.85rem;color:var(--text-muted);margin-bottom:10px;}
.summary-row.totals{font-weight:600;margin-top:10px;color:var(--text);font-size:1rem;}
.due-today{margin-top:30px;}
.due-label{font-size:.9rem;color:var(--text-muted);margin-bottom:5px;}
.due-amount{font-size:2rem;font-weight:800;color:var(--text);margin-bottom:20px;}
.btn-complete{background:var(--primary);color:#fff;width:100%;border:none;padding:16px;border-radius:6px;font-size:1rem;font-weight:600;cursor:pointer;transition:background .2s;}
.btn-complete:hover{background:var(--accent);}
@media(max-width:860px){.co-grid{grid-template-columns:1fr;}}
</style>
</head>
<body>
<nav class="navbar" id="navbar">
  <a href="/" class="nav-logo" style="display:flex; align-items:center; gap:6px; text-decoration:none;"><span style="font-size:1.4rem;">🌱</span><span style="font-weight:900; background:linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Enroot</span><span style="font-weight:700; color:inherit;">Host</span></a>
  <div class="nav-actions">
    <span style="font-size:.8rem;color:var(--text-muted);">🔒 Secure Checkout</span>
  </div>
</nav>

<div class="co-wrap">
  <div class="progress-bar">
    <div class="pb-step completed"><div class="pb-circle">✓</div>Product Selection</div>
    <div class="pb-line"></div>
    <div class="pb-step completed"><div class="pb-circle">✓</div>Configuration</div>
    <div class="pb-line"></div>
    <div class="pb-step active"><div class="pb-circle">3</div>Review & Checkout</div>
    <div class="pb-line"></div>
    <div class="pb-step"><div class="pb-circle">4</div>Done</div>
  </div>

  <div class="co-grid">
    <div style="display:flex; flex-direction:column; gap:20px;">
      
      <!-- Cart Box -->
      <div class="card">
        <div class="cart-header">
          <span>Product/Options</span>
          <span>Price/Cycle</span>
        </div>
        <div id="coItems" style="margin-bottom:15px; min-height: 50px;"></div>
        
        <!-- Promo -->
        <div style="margin-bottom:14px; margin-top:20px;">
          <div style="display:flex;gap:7px;">
            <input type="text" id="coPromo" placeholder="Promo Code" style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px 10px;color:var(--text);font-size:.85rem;outline:none;text-transform:uppercase;" oninput="this.value=this.value.toUpperCase()"/>
            <button class="btn btn-outline" style="padding:8px 16px; font-size:.85rem;" onclick="applyPromoCode()">Apply</button>
          </div>
          <div id="coPromoMsg" style="font-size:.75rem;margin-top:5px;"></div>
        </div>

        <div class="cart-actions">
          <button class="btn btn-outline" onclick="location.href='/domains'">← Continue Shopping</button>
          <button class="btn btn-outline" onclick="localStorage.removeItem('ds_cart');location.href='/cart'">🗑 Empty Cart</button>
        </div>
      </div>

      <!-- Your Details -->
      <div class="card">
        <div class="pm-title">👤 Your Details</div>
        <div class="pm-sub">Enter your details to create an account.</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">First Name *</label><input type="text" class="form-control" id="firstName"/></div>
          <div class="form-group"><label class="form-label">Last Name *</label><input type="text" class="form-control" id="lastName"/></div>
        </div>
        <div class="form-group"><label class="form-label">Email Address *</label><input type="email" class="form-control" id="email" oninput="checkEmailExists(this.value)"/></div>
        <div class="form-group"><label class="form-label">Phone Number *</label><input type="tel" class="form-control" id="phone"/></div>
        
        <div id="passwordSection">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Password *</label><input type="password" class="form-control" id="password"/></div>
            <div class="form-group"><label class="form-label">Confirm Password *</label><input type="password" class="form-control" id="confirmPassword"/></div>
          </div>
          <div id="emailCheckMsg" style="font-size:.75rem;margin-top:-5px;margin-bottom:8px;"></div>
        </div>
      </div>

      <!-- Payment Methods -->
      <div class="card">
        <div class="pm-title">Payment Method</div>
        <div class="pm-sub">Please choose your preferred method of payment.</div>
        <div class="pm-list" id="pmList">
          <!-- Injected via JS -->
          <div class="pm-option selected"><div class="pm-radio"></div>Loading...</div>
        </div>
      </div>

    </div>

    <!-- RIGHT: Summary -->
    <div>
      <div class="card" style="position: sticky; top: 90px;">
        <div class="summary-title">Order Summary</div>
        <div class="summary-row"><span>Subtotal</span><span id="coSubtotal">₹0</span></div>
        <div class="summary-row" id="coDiscRow" style="display:none;color:var(--green);"><span>Discount</span><span id="coDisc">-₹0</span></div>
        <div class="summary-row"><span>CGST @ 9.00%</span><span id="coCGST">₹0</span></div>
        <div class="summary-row"><span>SGST @ 9.00%</span><span id="coSGST">₹0</span></div>
        <div class="summary-row totals"><span>Totals</span><span id="coTotal">₹0</span></div>
        
        <div class="due-today">
          <div class="due-label">Total Due Today</div>
          <div class="due-amount" id="coDueToday">₹0</div>
          <button class="btn-complete" id="proceedBtn" onclick="proceedToPayment()">Complete Order</button>
        </div>
        <p style="font-size:.7rem;text-align:center;margin-top:15px;color:var(--text-muted);">By proceeding you agree to our Terms of Service</p>
      </div>
    </div>

  </div>
</div>

<div class="toast" id="toast"></div>
<script src="/js/main.js"></script>
<script src="/js/checkout.js"></script>
</body>
</html>
`;
fs.writeFileSync('public/checkout.html', checkoutHtml);

// --- 3. Modify public/admin/settings.html for Payment Gateways ---
let settingsHtml = fs.readFileSync('public/admin/settings.html', 'utf8');
const oldPaymentMethods = `<!-- Payment Methods -->
      <div class="panel">
        <div class="panel-header"><span class="panel-title">💳 Payment Methods</span></div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,.04);border-radius:10px;">
            <div><div style="font-weight:600;font-size:.9rem;">📲 UPI / QR Code</div><div style="font-size:.75rem;color:var(--text-muted);">Manual UTR verification</div></div>
            <label class="toggle"><input type="checkbox" id="t-upi_manual" checked/><span class="toggle-slider"></span></label>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,.04);border-radius:10px;">
            <div><div style="font-weight:600;font-size:.9rem;">💳 Credit/Debit Card</div><div style="font-size:.75rem;color:var(--text-muted);">Visa, Mastercard, Rupay</div></div>
            <label class="toggle"><input type="checkbox" id="t-card" checked/><span class="toggle-slider"></span></label>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,.04);border-radius:10px;">
            <div><div style="font-weight:600;font-size:.9rem;">🏦 Net Banking</div><div style="font-size:.75rem;color:var(--text-muted);">All major banks</div></div>
            <label class="toggle"><input type="checkbox" id="t-netbanking" checked/><span class="toggle-slider"></span></label>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,.04);border-radius:10px;">
            <div><div style="font-weight:600;font-size:.9rem;">🚚 Cash on Delivery</div><div style="font-size:.75rem;color:var(--text-muted);">Orders up to ₹5,000 (₹50 fee)</div></div>
            <label class="toggle"><input type="checkbox" id="t-cod" checked/><span class="toggle-slider"></span></label>
          </div>
        </div>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="savePaymentMethods()">💾 Save Payment Settings</button>
      </div>`;

const newPaymentMethods = `<!-- Payment Methods -->
      <div class="panel">
        <div class="panel-header"><span class="panel-title">💳 Payment Gateways</span></div>
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,.04);border-radius:10px;">
            <div><div style="font-weight:600;font-size:.9rem;">PhonePe</div><div style="font-size:.75rem;color:var(--text-muted);">UPI | Credit/Debit Card | NetBanking</div></div>
            <label class="toggle"><input type="checkbox" id="t-phonepe" checked/><span class="toggle-slider"></span></label>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,.04);border-radius:10px;">
            <div><div style="font-weight:600;font-size:.9rem;">Easebuzz</div><div style="font-size:.75rem;color:var(--text-muted);">UPI | Credit/Debit Card | NetBanking</div></div>
            <label class="toggle"><input type="checkbox" id="t-easebuzz" checked/><span class="toggle-slider"></span></label>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,.04);border-radius:10px;">
            <div><div style="font-weight:600;font-size:.9rem;">Crypto Currency</div><div style="font-size:.75rem;color:var(--text-muted);">Accept Bitcoin, ETH, etc.</div></div>
            <label class="toggle"><input type="checkbox" id="t-crypto"/><span class="toggle-slider"></span></label>
          </div>
        </div>
        <button class="btn btn-primary" style="margin-top:16px;" onclick="savePaymentMethods()">💾 Save Payment Settings</button>
      </div>`;

settingsHtml = settingsHtml.replace(oldPaymentMethods, newPaymentMethods);

// Update savePaymentMethods in settings.html
const oldSavePM = `async function savePaymentMethods() {
  const pm = {};
  ['upi_manual','card','netbanking','cod'].forEach(k => {
    const el = document.getElementById('t-' + k);
    pm[k] = el ? el.checked : true;
  });`;

const newSavePM = `async function savePaymentMethods() {
  const pm = {};
  ['phonepe','easebuzz','crypto'].forEach(k => {
    const el = document.getElementById('t-' + k);
    pm[k] = el ? el.checked : false;
  });`;

settingsHtml = settingsHtml.replace(oldSavePM, newSavePM);

// Update loadSettingsPage in settings.html to set toggles
const setToggleSection = `function loadSettingsPage() {
  apiFetch('/api/admin/settings').then(s => {
    currentSettings = s;
    const setV = (id,v) => { const e=document.getElementById(id); if(e) e.value = v||''; };
    const setC = (id,v) => { const e=document.getElementById(id); if(e) e.checked = !!v; };
    
    setV('storeName', s.storeName);
    setV('tagline', s.tagline);
    setV('supportEmail', s.supportEmail);
    setV('supportPhone', s.supportPhone);
    setV('gstNumber', s.gstNumber);
    setV('upiId', s.upiId);
    setV('upiName', s.upiName);
    setV('googleAdsTag', s.googleAdsTag);
    setV('metaPixelId', s.metaPixelId);
    
    setC('t-cloaking', s.enableCloaking);
    setC('t-homeCloaking', s.enableHomeCloaking);
    
    const pm = s.paymentMethods || {};
    setC('t-phonepe', pm.phonepe !== false); // default true
    setC('t-easebuzz', pm.easebuzz !== false); // default true
    setC('t-crypto', pm.crypto);
    
    refreshQR();
  });
}`;
settingsHtml = settingsHtml.replace(/function loadSettingsPage\(\) \{[\s\S]*?(?=\}\n\nfunction refreshQR)/, setToggleSection);

fs.writeFileSync('public/admin/settings.html', settingsHtml);
console.log('Done modifying files!');
