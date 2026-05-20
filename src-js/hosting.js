let allPlans = [];
let currentCategory = 'all';

async function loadPlans() {
  try {
    allPlans = await fetch('/api/hosting').then(r => r.json());
    renderPlans();
  } catch (e) {
    document.getElementById('plansGrid').innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;">Could not load plans.</p>';
  }
}

function filterCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderPlans();
}

function renderPlans() {
  const grid = document.getElementById('plansGrid');
  const filtered = currentCategory === 'all' ? allPlans : allPlans.filter(p => p.category === currentCategory);
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">⚡</div><h3>No plans in this category</h3></div>';
    return;
  }
  grid.innerHTML = filtered.map(p => `
    <div class="hosting-card ${p.highlighted ? 'featured' : ''}">
      ${p.badge ? `<span class="badge badge-primary plan-badge">${p.badge}</span>` : ''}
      <div class="plan-name">${p.name}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">${p.category} Hosting</div>
      <div class="plan-price">₹${p.price}<span>/${p.period||'mo'}</span></div>
      <div class="plan-renew">₹${p.renewPrice}/mo on renewal</div>
      <ul class="plan-features">${(p.features||[]).map(f=>`<li>${f}</li>`).join('')}</ul>
      <button class="btn ${p.highlighted?'btn-primary':'btn-outline'}" style="width:100%;justify-content:center;margin-bottom:10px;"
        onclick="addToCart({id:'hosting-${p.id}',type:'hosting',name:'${p.name} Hosting',price:${p.price},period:'month'})">
        ${p.highlighted?'🚀 Get Started':'Select Plan'}
      </button>
    </div>
  `).join('');
}

document.addEventListener('DOMContentLoaded', loadPlans);
