let allCustomers = [];

async function loadCustomers() {
  try {
    allCustomers = await apiFetch('/api/admin/customers');
    renderCustomers();
  } catch (e) {
    document.getElementById('custBody').innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load customers</td></tr>';
  }
}

function renderCustomers() {
  const q = (document.getElementById('custSearch')?.value || '').toLowerCase();
  const filtered = allCustomers.filter(c =>
    !q || (c.name||'').toLowerCase().includes(q) || (c.email||'').toLowerCase().includes(q)
  ).slice().reverse();

  const tbody = document.getElementById('custBody');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No customers found</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td style="font-weight:700;">${c.name}</td>
      <td style="color:var(--accent);">${c.email}</td>
      <td style="color:var(--text-muted);">${c.phone || '-'}</td>
      <td style="text-align:center;font-weight:700;">${c.orders || 0}</td>
      <td style="font-weight:700;color:var(--green);">₹${(c.totalSpent||0).toLocaleString('en-IN')}</td>
      <td style="color:var(--text-muted);font-size:0.8rem;">${c.joinedAt ? new Date(c.joinedAt).toLocaleDateString('en-IN') : '-'}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteCustomer('${c.id}')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

async function deleteCustomer(id) {
  if (!confirm('Delete this customer? Their order history will remain.')) return;
  try {
    await apiFetch(`/api/admin/customers/${id}`, { method: 'DELETE' });
    showToast('Customer deleted', 'success');
    loadCustomers();
  } catch (e) { showToast('Failed to delete customer', 'error'); }
}

document.addEventListener('DOMContentLoaded', loadCustomers);
