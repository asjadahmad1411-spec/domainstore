let allOrders = [];
let editingOrderId = null;

async function loadOrders() {
  try {
    allOrders = await apiFetch('/api/orders');
    renderOrders();
  } catch (e) {
    document.getElementById('ordersBody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">Failed to load orders</td></tr>';
  }
}

function renderOrders() {
  const q = (document.getElementById('orderSearch')?.value || '').toLowerCase();
  const statusF = document.getElementById('statusFilter')?.value || '';
  let filtered = allOrders.filter(o => {
    const matchQ = !q || o.id.toLowerCase().includes(q) || (o.customer?.email||'').toLowerCase().includes(q) || (o.customer?.name||'').toLowerCase().includes(q);
    const matchS = !statusF || o.status === statusF;
    return matchQ && matchS;
  });
  filtered = filtered.slice().reverse();
  const tbody = document.getElementById('ordersBody');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">No orders found</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map(o => `
    <tr>
      <td style="font-family:monospace;color:var(--accent);font-weight:700;font-size:0.82rem;">${o.id}</td>
      <td>${o.customer?.name||'-'}<br/><span style="font-size:0.74rem;color:var(--text-muted);">${o.customer?.email||''}</span></td>
      <td style="font-size:0.82rem;">${(o.items||[]).map(i=>`<div>${i.name}</div>`).join('')||'-'}</td>
      <td style="font-weight:700;">₹${(o.total||0).toLocaleString('en-IN')}</td>
      <td style="font-size:0.82rem;color:var(--text-muted);">${o.paymentMethod||'-'}</td>
      <td><span class="status status-${(o.status||'pending').toLowerCase()}">${o.status||'Pending'}</span></td>
      <td style="color:var(--text-muted);font-size:0.78rem;">${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-outline" onclick="openStatusModal('${o.id}','${o.status}')">✏️ Status</button>
          <button class="btn btn-sm btn-danger" onclick="deleteOrder('${o.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openStatusModal(id, currentStatus) {
  editingOrderId = id;
  document.getElementById('modalOrderId').textContent = id;
  document.getElementById('newStatus').value = currentStatus || 'Pending';
  openModal('statusModal');
}

async function updateOrderStatus() {
  const status = document.getElementById('newStatus').value;
  try {
    await apiFetch(`/api/orders/${editingOrderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    showToast('Order status updated!', 'success');
    closeModal('statusModal');
    loadOrders();
  } catch (e) { showToast('Failed to update status', 'error'); }
}

async function deleteOrder(id) {
  if (!confirm('Delete this order? This cannot be undone.')) return;
  try {
    await apiFetch(`/api/orders/${id}`, { method: 'DELETE' });
    showToast('Order deleted', 'success');
    loadOrders();
  } catch (e) { showToast('Failed to delete order', 'error'); }
}

document.addEventListener('DOMContentLoaded', loadOrders);
