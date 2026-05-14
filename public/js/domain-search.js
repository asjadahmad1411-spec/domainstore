let allTlds = [];

async function loadTldPricing() {
  try {
    const data = await fetch('/api/domains/check?name=example').then(r => r.json());
    allTlds = data.results || [];
    renderTldGrid();
  } catch (e) {}
}

function renderTldGrid() {
  const grid = document.getElementById('tldPricingGrid');
  if (!grid) return;
  grid.innerHTML = allTlds.map(t => `
    <div class="card" style="text-align:center;cursor:pointer;" onclick="document.getElementById('searchInput').value='';runSearch()">
      <div style="font-size:1.5rem;font-weight:900;color:var(--accent);margin-bottom:6px;">${t.extension}</div>
      <div style="font-size:1.5rem;font-weight:800;">₹${t.price}<span style="font-size:0.85rem;font-weight:400;color:var(--text-muted)">/yr</span></div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">Renews at ₹${t.renewPrice}/yr</div>
      ${t.popular ? '<span class="badge badge-accent" style="margin-top:10px;">Popular</span>' : ''}
    </div>
  `).join('');
}

async function runSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return;
  const res = document.getElementById('searchResults');
  const def = document.getElementById('defaultView');
  if (def) def.style.display = 'none';

  res.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px;">${[1,2,3,4,5].map(()=>`<div class="skeleton" style="height:72px;border-radius:12px;"></div>`).join('')}</div>`;

  try {
    const data = await fetch(`/api/domains/check?name=${encodeURIComponent(q)}`).then(r => r.json());
    renderResults(data);
  } catch (e) {
    res.innerHTML = '<div class="alert alert-error">❌ Search failed. Try again.</div>';
  }
}

function renderResults(data) {
  const res = document.getElementById('searchResults');
  const avail = data.results.filter(r => r.available);
  const taken = data.results.filter(r => !r.available);

  let html = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
      <h2>Results for "<span style="color:var(--accent);">${data.name}</span>"</h2>
      <div style="display:flex;gap:10px;font-size:0.85rem;">
        <span class="badge badge-green">✅ ${avail.length} Available</span>
        <span class="badge badge-red">❌ ${taken.length} Taken</span>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;">
  `;

  avail.forEach(r => {
    html += `
      <div class="domain-result-row">
        <div style="display:flex;align-items:center;gap:14px;">
          <span style="width:32px;height:32px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.8rem;">✅</span>
          <div>
            <div class="domain-name-display">${data.name}<span style="color:var(--accent)">${r.extension}</span></div>
            <div class="domain-renew">Renews at ₹${r.renewPrice}/yr</div>
          </div>
        </div>
        <div class="domain-meta">
          <div>
            <div class="domain-price">₹${r.price}<span style="font-size:0.8rem;color:var(--text-muted)">/yr</span></div>
            ${r.popular ? '<span class="badge badge-accent" style="font-size:0.68rem;">Popular</span>' : ''}
          </div>
          <button class="btn btn-green btn-sm" onclick="addToCart({id:'domain-${data.name}${r.extension}',type:'domain',name:'${data.name}${r.extension}',price:${r.price}})">Add to Cart</button>
        </div>
      </div>
    `;
  });

  taken.forEach(r => {
    html += `
      <div class="domain-result-row unavailable">
        <div style="display:flex;align-items:center;gap:14px;">
          <span style="width:32px;height:32px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.8rem;">❌</span>
          <div>
            <div class="domain-name-display">${data.name}<span style="color:var(--text-muted)">${r.extension}</span></div>
            <div class="domain-renew">Not available</div>
          </div>
        </div>
        <span style="font-size:0.85rem;color:var(--text-muted);">Taken</span>
      </div>
    `;
  });

  html += `</div><div style="text-align:center;margin-top:24px;"><button class="btn btn-outline" onclick="document.getElementById('searchResults').innerHTML='';document.getElementById('defaultView').style.display='block';">← Back to TLDs</button></div>`;
  document.getElementById('searchResults').innerHTML = html;
}

document.addEventListener('DOMContentLoaded', () => {
  loadTldPricing();
  const urlQ = new URLSearchParams(location.search).get('q');
  if (urlQ) {
    document.getElementById('searchInput').value = urlQ;
    runSearch();
  }
});
