let editingPlanId = null;

async function loadPlans() {
  try {
    const plans = await apiFetch('/api/hosting');
    renderPlans(plans);
  } catch (e) {
    document.getElementById('plansBody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load plans</td></tr>';
  }
}

function renderPlans(plans) {
  const tbody = document.getElementById('plansBody');
  if (!plans.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">No plans yet</td></tr>'; return; }
  tbody.innerHTML = plans.map(p => `
    <tr>
      <td style="font-family:monospace;font-size:0.8rem;color:var(--text-muted);">${p.id}</td>
      <td style="font-weight:700;">${p.name}</td>
      <td><span class="status ${p.category==='vps'?'status-active':p.category==='dedicated'?'status-pending':'status-active'}" style="text-transform:capitalize;">${p.category}</span></td>
      <td style="font-weight:700;color:var(--accent);">₹${p.price}</td>
      <td>₹${p.renewPrice}</td>
      <td>${p.highlighted ? '<span class="status status-active">⭐ Yes</span>' : '-'}</td>
      <td>${p.badge ? `<span class="status status-pending">${p.badge}</span>` : '-'}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-outline" onclick="openPlanModal('${p.id}')">✏️ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deletePlan('${p.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

let cachedPlans = [];

async function openPlanModal(editId = null) {
  cachedPlans = await apiFetch('/api/hosting');
  editingPlanId = editId;
  document.getElementById('planModalTitle').textContent = editId ? 'Edit Plan' : 'Add Plan';
  if (editId) {
    const p = cachedPlans.find(x => x.id === editId);
    if (!p) return;
    document.getElementById('planId').value = p.id;
    document.getElementById('planId').disabled = true;
    document.getElementById('planName').value = p.name;
    document.getElementById('planCat').value = p.category;
    document.getElementById('planBadge').value = p.badge || '';
    document.getElementById('planPrice').value = p.price;
    document.getElementById('planRenew').value = p.renewPrice;
    document.getElementById('planFeatures').value = (p.features || []).join('\n');
    document.getElementById('planFeatured').checked = !!p.highlighted;
  } else {
    ['planId','planName','planBadge','planPrice','planRenew','planFeatures'].forEach(id => { document.getElementById(id).value = ''; document.getElementById(id).disabled = false; });
    document.getElementById('planFeatured').checked = false;
    document.getElementById('planCat').value = 'shared';
  }
  openModal('planModal');
}

async function savePlan() {
  const id = document.getElementById('planId').value.trim();
  const name = document.getElementById('planName').value.trim();
  const price = parseInt(document.getElementById('planPrice').value);
  const renewPrice = parseInt(document.getElementById('planRenew').value);
  const category = document.getElementById('planCat').value;
  const badge = document.getElementById('planBadge').value.trim();
  const features = document.getElementById('planFeatures').value.split('\n').map(f=>f.trim()).filter(Boolean);
  const highlighted = document.getElementById('planFeatured').checked;

  if (!id || !name || !price) return showToast('ID, name and price are required', 'error');

  const payload = { id, name, category, price, renewPrice: renewPrice||price, badge, features, highlighted, period: 'month' };
  try {
    if (editingPlanId) {
      await apiFetch(`/api/hosting/${editingPlanId}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Plan updated!', 'success');
    } else {
      await apiFetch('/api/hosting', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Plan added!', 'success');
    }
    closeModal('planModal');
    loadPlans();
  } catch (e) { showToast('Failed to save plan', 'error'); }
}

async function deletePlan(id) {
  if (!confirm(`Delete plan "${id}"?`)) return;
  try {
    await apiFetch(`/api/hosting/${id}`, { method: 'DELETE' });
    showToast('Plan deleted', 'success');
    loadPlans();
  } catch (e) { showToast('Failed to delete plan', 'error'); }
}

document.addEventListener('DOMContentLoaded', loadPlans);
