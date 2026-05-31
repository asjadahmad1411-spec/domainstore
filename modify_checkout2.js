const fs = require('fs');

// 1. Modify public/checkout.html
let html = fs.readFileSync('public/checkout.html', 'utf8');

// Extract promo box
const promoMatch = html.match(/<!-- Promo -->[\s\S]*?<\/div>(\s*<\/div>\s*<\/div>)/);
if (promoMatch) {
  // Remove it from the cart box
  const promoBox = `<!-- Promo -->
        <div style="margin-bottom:14px; margin-top:20px;">
          <div style="display:flex;gap:7px;">
            <input type="text" id="coPromo" placeholder="Promo Code" style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px 10px;color:var(--text);font-size:.85rem;outline:none;text-transform:uppercase;" oninput="this.value=this.value.toUpperCase()"/>
            <button class="btn btn-outline" style="padding:8px 16px; font-size:.85rem;" onclick="applyPromoCode()">Apply</button>
          </div>
          <div id="coPromoMsg" style="font-size:.75rem;margin-top:5px;"></div>
        </div>`;
        
  html = html.replace(promoBox, '');
  
  // Insert it into Order Summary, just before "Total Due Today"
  html = html.replace(/<div class="due-today">/, promoBox + '\n        <div class="due-today">');
}
fs.writeFileSync('public/checkout.html', html);


// 2. Modify src-js/checkout.js
let js = fs.readFileSync('src-js/checkout.js', 'utf8');

// Update loadCheckoutSummary HTML
const oldItemHtml = /\`<div style="display:flex;justify-content:space-between;font-size:\.85rem;margin-bottom:7px;gap:8px;">[\s\S]*?<\/div>\`/g;
const newItemHtml = `\`
    <div style="display:flex;justify-content:space-between;margin-bottom:15px;gap:12px;border-bottom:1px solid var(--border);padding-bottom:12px;">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:800;font-size:1.05rem;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${i.name}</div>
        \${(i.name.includes('.') && !i.name.includes(' ')) ? '<div style="font-size:0.75rem;color:var(--accent);margin-top:3px;">Domain Registration</div>' : ''}
      </div>
      <div style="text-align:right;">
        <div style="font-weight:700;font-size:1rem;white-space:nowrap;color:var(--text);">\${fmt(i.price)}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-top:3px;">Renewal \${fmt((i.price > 500 && i.price < 1500) ? i.price + 300 : i.price)}/yr</div>
      </div>
    </div>\``;
    
js = js.replace(oldItemHtml, newItemHtml);

// Add 5 second loading delay to proceedToPayment
const redirectLogic = /location\.href = '\/upi-payment\.html\?order=' \+ orderRes\.orderId;/;
const newRedirectLogic = `btn.innerHTML = '<span style="font-size:1.1rem;display:inline-block;animation:spin 1s linear infinite;">⏳</span> Securing Payment...';
    // 5-second loading delay as requested
    setTimeout(() => {
      location.href = '/upi-payment.html?order=' + orderRes.orderId;
    }, 5000);`;
    
js = js.replace(redirectLogic, newRedirectLogic);

// Add CSS keyframes for spinner if needed
const initInit = /\/\/ ── Init ─+/;
js = js.replace(initInit, `// ── Init ─────────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = '@keyframes spin { 100% { transform: rotate(360deg); } }';
document.head.appendChild(style);
`);

fs.writeFileSync('src-js/checkout.js', js);
console.log('Modification script completed');
