const fs = require('fs');
const path = require('path');

// 1. Fix main.js - move searchDomain outside DOMContentLoaded
let mainJs = fs.readFileSync('src-js/main.js', 'utf8');
if (mainJs.includes('window.searchDomain = function() {') && mainJs.includes('DOMContentLoaded')) {
  // Extract searchDomain function
  const searchRegex = /window\.searchDomain = function\(\) \{[\s\S]*?\};/g;
  const match = searchRegex.exec(mainJs);
  if (match) {
    mainJs = mainJs.replace(match[0], ''); // remove from inside
    // add it at the top after imports/globals
    mainJs = mainJs.replace('// ── Toast ─────────────────────────────────────────────────────', match[0] + '\n\n// ── Toast ─────────────────────────────────────────────────────');
    fs.writeFileSync('src-js/main.js', mainJs);
    console.log('Fixed main.js searchDomain');
  }
}

// 2. Fix server/routes/domains.js to search all extensions
let domainsJs = fs.readFileSync('server/routes/domains.js', 'utf8');
// Replace the tldsToSearch assignment
domainsJs = domainsJs.replace(
  /const tldsToSearch = forcedExts[\s\S]*?: tldData;/g,
  `const tldsToSearch = tldData; // Always search all TLDs as per user request`
);
fs.writeFileSync('server/routes/domains.js', domainsJs);
console.log('Fixed domains.js');

// 3. Fix src-js/cart.js to add year selection and calculate price correctly
let cartJs = fs.readFileSync('src-js/cart.js', 'utf8');
// Insert updateCartItemYears function if not exists
if (!cartJs.includes('function updateCartItemYears')) {
  cartJs = cartJs.replace('function removeFromCart(id)', `
window.updateCartItemYears = function(id, years) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) {
    item.years = parseInt(years, 10);
    saveCart(cart);
    renderCart();
  }
};

function removeFromCart(id)`);
}
// Update rendering in cart.js
cartJs = cartJs.replace(
  /html \+= \`[\s\S]*?<div class="cart-price">₹\$\{item\.price\}<\/div>[\s\S]*?<\/div>\`;/g,
  (match) => {
    return `
    let yearDropdown = '';
    if (item.type === 'domain') {
      const y = item.years || 1;
      yearDropdown = \`
        <div style="margin-top:8px;">
          <select class="form-control" style="width:100px; padding: 4px 8px; font-size: 0.85rem;" onchange="updateCartItemYears('\${item.id}', this.value)">
            \${[1,2,3,4,5,6,7,8,9,10].map(yr => \`<option value="\${yr}" \${y == yr ? 'selected' : ''}>\${yr} Year\${yr>1?'s':''}</option>\`).join('')}
          </select>
        </div>
      \`;
    }
    const itemTotal = item.price * (item.years || 1);
    html += \`
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-title">\${item.name}</div>
          <div class="cart-meta">\${item.type === 'domain' ? 'Domain Registration' : 'Web Hosting Plan'}</div>
          \${yearDropdown}
        </div>
        <div style="text-align:right;">
          <div class="cart-price">₹\${itemTotal}</div>
          <div style="font-size:0.75rem;color:var(--text-muted);">₹\${item.price}/\${item.type === 'domain' ? 'yr' : 'mo'}</div>
          <button class="cart-remove" onclick="removeFromCart('\${item.id}')" title="Remove item">✕</button>
        </div>
      </div>\`;
    `;
  }
);
// Update total calculation in cart.js
cartJs = cartJs.replace(/const total = cart\.reduce\(\(sum, i\) => sum \+ i\.price, 0\);/g, 'const total = cart.reduce((sum, i) => sum + (i.price * (i.years || 1)), 0);');
cartJs = cartJs.replace(/const total = cart\.reduce\(\(sum, i\) => sum \+ Number\(i\.price\), 0\);/g, 'const total = cart.reduce((sum, i) => sum + (Number(i.price) * (i.years || 1)), 0);');
fs.writeFileSync('src-js/cart.js', cartJs);
console.log('Fixed cart.js');

// 4. Fix src-js/checkout.js for year selection and calculation
let checkoutJs = fs.readFileSync('src-js/checkout.js', 'utf8');
checkoutJs = checkoutJs.replace(/const total = cart\.reduce\(\(sum, i\) => sum \+ Number\(i\.price\), 0\);/g, 'const subtotal = cart.reduce((sum, i) => sum + (Number(i.price) * (i.years || 1)), 0);\n  const total = subtotal;');
checkoutJs = checkoutJs.replace(/const subtotal = cart\.reduce\(\(sum, i\) => sum \+ Number\(i\.price\), 0\);/g, 'const subtotal = cart.reduce((sum, i) => sum + (Number(i.price) * (i.years || 1)), 0);');

checkoutJs = checkoutJs.replace(
  /html \+= \`[\s\S]*?<div class="co-price">₹\$\{i\.price\}<\/div>[\s\S]*?<\/div>\`;/g,
  (match) => {
    return `
    const itemTotal = Number(i.price) * (i.years || 1);
    const yearText = i.type === 'domain' ? \` (\${i.years || 1} Year\${(i.years || 1) > 1 ? 's' : ''})\` : '';
    html += \`
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;align-items:center;">
        <div>
          <div class="co-title">\${i.name}\${yearText}</div>
          <div class="co-meta">\${i.type === 'domain' ? 'Domain Registration' : 'Web Hosting'}</div>
        </div>
        <div class="co-price">₹\${itemTotal}</div>
      </div>\`;
    `;
  }
);
fs.writeFileSync('src-js/checkout.js', checkoutJs);
console.log('Fixed checkout.js');

// 5. Replace PhonePe/Easebuzz with PayU in public/checkout.html
let checkoutHtml = fs.readFileSync('public/checkout.html', 'utf8');
checkoutHtml = checkoutHtml.replace(/PhonePe \/ UPI/g, 'PayU Secure / UPI');
checkoutHtml = checkoutHtml.replace(/PhonePe Gateway/g, 'PayU Gateway');
checkoutHtml = checkoutHtml.replace(/Easebuzz \/ Cards/g, 'Credit \/ Debit Cards');
checkoutHtml = checkoutHtml.replace(/Easebuzz Gateway/g, 'PayU Payment Gateway');
checkoutHtml = checkoutHtml.replace(/<img src="https:\/\/upload.wikimedia.org\/wikipedia\/commons\/7\/71\/PhonePe_Logo.svg"/g, '<img src="https://upload.wikimedia.org/wikipedia/commons/c/cd/Paytm_logo.svg"'); // Just swapping icons around if needed, actually let's just make sure it says PayU.
fs.writeFileSync('public/checkout.html', checkoutHtml);
console.log('Fixed checkout.html');
