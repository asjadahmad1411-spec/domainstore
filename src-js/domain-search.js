let allTlds = [];

// ── Load TLD pricing grid ─────────────────────────────────────
async function loadTldPricing() {
  try {
    // Use public endpoint to get TLD list
    const data = await fetch('/api/domains/tlds-public').then(r => r.json());
    allTlds = data || [];
    renderTldGrid();
  } catch (e) {
    // Fallback: try via check endpoint
    try {
      const d = await fetch('/api/domains/check?name=example').then(r => r.json());
      allTlds = (d.results || []).map(r => ({
        extension: r.extension, price: r.price, renewPrice: r.renewPrice, popular: r.popular
      }));
      renderTldGrid();
    } catch(e2) {}
  }
}

function renderTldGrid() {
  const grid = document.getElementById('tldPricingGrid');
  if (!grid || !allTlds.length) return;
  grid.innerHTML = allTlds.map(t => `
    <div class="card" style="text-align:center;cursor:pointer;transition:all .25s;"
      onmouseenter="this.style.transform='translateY(-4px)'" onmouseleave="this.style.transform=''"
      onclick="quickSearch('${t.extension}')">
      <div style="font-size:1.5rem;font-weight:900;color:var(--accent);margin-bottom:6px;">${t.extension}</div>
      <div style="font-size:1.5rem;font-weight:800;">₹${t.price}<span style="font-size:.85rem;font-weight:400;color:var(--text-muted)">/yr</span></div>
      <div style="font-size:.75rem;color:var(--text-muted);margin-top:4px;">Renews ₹${t.renewPrice}/yr</div>
      ${t.popular ? '<span class="badge badge-accent" style="margin-top:10px;">Popular</span>' : ''}
    </div>
  `).join('');
}

function quickSearch(ext) {
  const inp = document.getElementById('searchInput');
  if (inp && inp.value.trim()) {
    // append extension to whatever they typed (strip any existing ext first)
    let base = inp.value.trim().split('.')[0];
    inp.value = base + ext;
  }
  runSearch();
}

// ── Smart Search ──────────────────────────────────────────────
async function runSearch() {
  const q = (document.getElementById('searchInput')?.value || '').trim();
  if (!q) { showToast('Please enter a domain name to search', 'error'); return; }

  const res = document.getElementById('searchResults');
  const def = document.getElementById('defaultView');
  if (def) def.style.display = 'none';

  // Show skeletons
  res.innerHTML = `
    <div style="text-align:center;margin-bottom:20px;font-size:.9rem;color:var(--text-muted);">
      🔍 Checking availability for <strong style="color:var(--accent)">${q}</strong>...
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${[1,2,3,4,5].map(() => `<div class="skeleton" style="height:72px;border-radius:12px;"></div>`).join('')}
    </div>`;

  try {
    const data = await fetch(`/api/domains/check?name=${encodeURIComponent(q)}`).then(r => r.json());
    if (data.error) {
      res.innerHTML = `<div class="alert alert-error">❌ ${data.error}</div>`;
      return;
    }
    renderResults(data);
  } catch (e) {
    res.innerHTML = `<div class="alert alert-error">❌ Search failed. Please try again.</div>`;
  }
}

// ── Render Results ────────────────────────────────────────────
function renderResults(data) {
  const res = document.getElementById('searchResults');
  const avail = data.results.filter(r => r.available);
  const taken = data.results.filter(r => !r.available);

  // Smart label
  const searchLabel = data.forcedExt
    ? `<strong style="color:var(--accent)">${data.name}${data.forcedExt}</strong>`
    : `"<strong style="color:var(--accent)">${data.name}</strong>" across all extensions`;

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <div>
        <h2 style="font-size:1.1rem;margin-bottom:4px;">Results for ${searchLabel}</h2>
        ${data.forcedExt ? `<div style="font-size:.78rem;color:var(--text-muted);">💡 Tip: Search without extension to see all TLDs</div>` : ''}
      </div>
      <div style="display:flex;gap:10px;font-size:.85rem;flex-wrap:wrap;">
        <span class="badge badge-green">✅ ${avail.length} Available</span>
        <span class="badge badge-red">❌ ${taken.length} Taken</span>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">`;

  avail.forEach(r => {
    html += `
      <div class="domain-result-row" style="animation:fadeSlide .3s ease;">
        <div style="display:flex;align-items:center;gap:14px;flex:1;min-width:0;">
          <span style="width:36px;height:36px;flex-shrink:0;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);border-radius:10px;display:flex;align-items:center;justify-content:center;">✅</span>
          <div style="min-width:0;">
            <div class="domain-name-display" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${data.name}<span style="color:var(--accent)">${r.extension}</span>
            </div>
            <div class="domain-renew">
              Renews ₹${r.renewPrice || '?'}/yr
              ${r.premium ? ' • <span style="color:#f59e0b;font-weight:700;">⭐ Premium</span>' : ''}
            </div>
          </div>
        </div>
        <div class="domain-meta" style="flex-shrink:0;gap:12px;">
          <div style="text-align:right;">
            <div class="domain-price">₹${r.price || '?'}<span style="font-size:.8rem;color:var(--text-muted)">/yr</span></div>
            ${r.popular ? '<span class="badge badge-accent" style="font-size:.65rem;">Popular</span>' : ''}
          </div>
          <button class="btn btn-green btn-sm"
            onclick="addToCart({id:'domain-${data.name}${r.extension}',type:'domain',name:'${data.name}${r.extension}',price:${r.price || 0}})">
            🛒 Add
          </button>
        </div>
      </div>`;
  });

  taken.forEach(r => {
    html += `
      <div class="domain-result-row unavailable" style="opacity:.5;">
        <div style="display:flex;align-items:center;gap:14px;">
          <span style="width:36px;height:36px;flex-shrink:0;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:10px;display:flex;align-items:center;justify-content:center;">❌</span>
          <div>
            <div class="domain-name-display">${data.name}<span style="color:var(--text-muted)">${r.extension}</span></div>
            <div class="domain-renew" style="color:#ef4444;">Not available</div>
          </div>
        </div>
        <span style="font-size:.85rem;color:var(--text-muted);font-weight:600;">Taken</span>
      </div>`;
  });

  html += `</div>
    <div style="text-align:center;margin-top:24px;">
      <button class="btn btn-outline" onclick="clearSearch()">← Back to All TLDs</button>
    </div>`;

  res.innerHTML = html;
}

function clearSearch() {
  document.getElementById('searchResults').innerHTML = '';
  document.getElementById('searchInput').value = '';
  const def = document.getElementById('defaultView');
  if (def) def.style.display = 'block';
}

// ── Smart input hint ──────────────────────────────────────────
function onSearchInput(input) {
  const val = input.value.trim();
  const hint = document.getElementById('searchHint');
  if (!hint) return;
  if (!val) { hint.textContent = ''; return; }

  if (val.includes('.')) {
    const parts = val.split('.');
    const ext = '.' + parts.slice(1).join('.');
    hint.innerHTML = `🎯 Will search <strong>${parts[0]}${ext}</strong> specifically`;
    hint.style.color = 'var(--accent)';
  } else {
    hint.innerHTML = `🔍 Will check <strong>${val}</strong> across all extensions (.com, .in, .net ...)`;
    hint.style.color = 'var(--text-muted)';
  }
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadTldPricing();
  const urlQ = new URLSearchParams(location.search).get('q');
  if (urlQ) {
    const inp = document.getElementById('searchInput');
    if (inp) inp.value = urlQ;
    runSearch();
  }
});
