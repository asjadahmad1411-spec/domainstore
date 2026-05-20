let editingExt = null;

async function loadTlds() {
  try {
    const tlds = await apiFetch('/api/domains/tlds');
    renderTlds(tlds);
  } catch (e) {
    document.getElementById('tldBody').innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load TLDs</td></tr>';
  }
}

function renderTlds(tlds) {
  const tbody = document.getElementById('tldBody');
  if (!tlds.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">No TLDs configured</td></tr>'; return; }
  tbody.innerHTML = tlds.map(t => `
    <tr>
      <td style="font-weight:800;color:var(--accent);font-size:1rem;">${t.extension}</td>
      <td>₹${t.price}</td>
      <td>₹${t.renewPrice}</td>
      <td>${t.popular ? '<span class="status status-active">✅ Yes</span>' : '<span style="color:var(--text-muted);">No</span>'}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-outline" onclick="openEditTld('${t.extension}',${t.price},${t.renewPrice},${t.popular})">✏️ Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteTld('${t.extension}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAddTld() {
  editingExt = null;
  document.getElementById('tldModalTitle').textContent = 'Add TLD';
  document.getElementById('tldExt').value = '';
  document.getElementById('tldExt').disabled = false;
  document.getElementById('tldPrice').value = '';
  document.getElementById('tldRenew').value = '';
  document.getElementById('tldPopular').checked = false;
  openModal('tldModal');
}

function openEditTld(ext, price, renew, popular) {
  editingExt = ext;
  document.getElementById('tldModalTitle').textContent = 'Edit TLD';
  document.getElementById('tldExt').value = ext;
  document.getElementById('tldExt').disabled = true;
  document.getElementById('tldPrice').value = price;
  document.getElementById('tldRenew').value = renew;
  document.getElementById('tldPopular').checked = !!popular;
  openModal('tldModal');
}

async function saveTld() {
  const ext = document.getElementById('tldExt').value.trim();
  const price = parseInt(document.getElementById('tldPrice').value);
  const renewPrice = parseInt(document.getElementById('tldRenew').value);
  const popular = document.getElementById('tldPopular').checked;
  if (!ext || !price) return showToast('Extension and price are required', 'error');
  try {
    if (editingExt) {
      await apiFetch(`/api/domains/tlds/${encodeURIComponent(editingExt)}`, { method: 'PUT', body: JSON.stringify({ price, renewPrice, popular }) });
      showToast('TLD updated!', 'success');
    } else {
      await apiFetch('/api/domains/tlds', { method: 'POST', body: JSON.stringify({ extension: ext, price, renewPrice, popular }) });
      showToast('TLD added!', 'success');
    }
    closeModal('tldModal');
    loadTlds();
  } catch (e) { showToast('Failed to save TLD', 'error'); }
}

async function deleteTld(ext) {
  if (!confirm(`Delete TLD "${ext}"?`)) return;
  try {
    await apiFetch(`/api/domains/tlds/${encodeURIComponent(ext)}`, { method: 'DELETE' });
    showToast('TLD deleted', 'success');
    loadTlds();
  } catch (e) { showToast('Failed to delete TLD', 'error'); }
}

document.addEventListener('DOMContentLoaded', loadTlds);
