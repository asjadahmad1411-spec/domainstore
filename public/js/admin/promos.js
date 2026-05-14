let allPromos = [];

async function loadPromos() {
  try {
    allPromos = await apiFetch('/api/admin/promos');
    renderPromos();
  } catch (e) {
    document.getElementById('promosBody').innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load promo codes</td></tr>';
  }
}

function renderPromos() {
  const tbody = document.getElementById('promosBody');
  if (!allPromos.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No promo codes yet. Create one!</td></tr>';
    return;
  }
  tbody.innerHTML = allPromos.slice().reverse().map(p => `
    <tr>
      <td style="font-family:monospace;font-weight:800;color:var(--accent);letter-spacing:1px;">${p.code}</td>
      <td>${p.type === 'percent' ? 'Percentage (%)' : 'Flat (₹)'}</td>
      <td style="font-weight:700;">${p.type === 'percent' ? p.value + '%' : '₹' + p.value}</td>
      <td style="color:var(--text-muted);font-size:0.82rem;">${p.expiry ? new Date(p.expiry).toLocaleDateString('en-IN') : 'No expiry'}</td>
      <td>
        <label class="toggle" title="${p.active?'Active':'Inactive'}">
          <input type="checkbox" ${p.active?'checked':''} onchange="togglePromo('${p.id}',this.checked)"/>
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td style="color:var(--text-muted);font-size:0.8rem;">${p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : '-'}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deletePromo('${p.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function openPromoModal() {
  document.getElementById('promoCode').value = '';
  document.getElementById('promoType').value = 'percent';
  document.getElementById('promoValue').value = '';
  document.getElementById('promoExpiry').value = '';
  document.getElementById('promoActive').checked = true;
  openModal('promoModal');
}

async function savePromo() {
  const code = document.getElementById('promoCode').value.trim();
  const type = document.getElementById('promoType').value;
  const value = parseInt(document.getElementById('promoValue').value);
  const expiry = document.getElementById('promoExpiry').value || null;
  const active = document.getElementById('promoActive').checked;

  if (!code) return showToast('Promo code is required', 'error');
  if (!value || value <= 0) return showToast('Enter a valid discount value', 'error');
  if (type === 'percent' && value > 100) return showToast('Percentage cannot exceed 100%', 'error');

  try {
    await apiFetch('/api/admin/promos', { method: 'POST', body: JSON.stringify({ code, type, value, expiry, active }) });
    showToast(`Promo "${code.toUpperCase()}" created!`, 'success');
    closeModal('promoModal');
    loadPromos();
  } catch (e) { showToast(e.message || 'Failed to create promo', 'error'); }
}

async function togglePromo(id, active) {
  try {
    await apiFetch(`/api/admin/promos/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
    showToast(active ? 'Promo activated' : 'Promo deactivated', 'success');
    const p = allPromos.find(x => x.id === id);
    if (p) p.active = active;
  } catch (e) { showToast('Failed to update promo', 'error'); loadPromos(); }
}

async function deletePromo(id) {
  if (!confirm('Delete this promo code?')) return;
  try {
    await apiFetch(`/api/admin/promos/${id}`, { method: 'DELETE' });
    showToast('Promo deleted', 'success');
    loadPromos();
  } catch (e) { showToast('Failed to delete promo', 'error'); }
}

document.addEventListener('DOMContentLoaded', loadPromos);
