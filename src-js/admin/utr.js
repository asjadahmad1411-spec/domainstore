let rejectingOrderId = null;
let allUTROrders = [];

async function loadUTROrders() {
  try {
    const orders = await apiFetch('/api/admin/utr-pending');
    allUTROrders = orders;

    const pending = orders.filter(o => o.status === 'UTR Pending');
    const badge = document.getElementById('pendingBadge');
    if (badge) badge.textContent = `${pending.length} Pending`;

    const tbody = document.getElementById('utrBody');
    if (!pending.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px;">🎉 No pending UTR verifications</td></tr>';
    } else {
      tbody.innerHTML = pending.map(o => `
        <tr>
          <td style="font-family:monospace;color:var(--accent);font-weight:700;font-size:.82rem;">${o.id}</td>
          <td>
            <div style="font-weight:600;">${o.customer?.name||'-'}</div>
            <div style="font-size:.75rem;color:var(--text-muted);">${o.customer?.email||''}</div>
            <div style="font-size:.75rem;color:var(--text-muted);">${o.customer?.phone||''}</div>
          </td>
          <td style="font-weight:800;color:var(--green);font-size:1rem;">₹${(o.total||0).toLocaleString('en-IN')}</td>
          <td>
            <div style="font-family:monospace;font-weight:700;color:var(--accent);font-size:.95rem;letter-spacing:1px;">${o.utr||'-'}</div>
            <div style="font-size:.72rem;color:var(--text-muted);margin-top:2px;">Submitted: ${o.utrSubmittedAt ? new Date(o.utrSubmittedAt).toLocaleString('en-IN') : '-'}</div>
          </td>
          <td style="font-size:.8rem;color:var(--text-muted);">${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : '-'}</td>
          <td style="font-size:.8rem;">${(o.items||[]).map(i=>`<div>${i.name}</div>`).join('')||'-'}</td>
          <td>
            <div style="display:flex;gap:6px;flex-direction:column;">
              <button class="btn btn-sm btn-success" onclick="verifyUTR('${o.id}')">✅ Verify & Activate</button>
              <button class="btn btn-sm btn-danger" onclick="openRejectModal('${o.id}')">❌ Reject</button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Verified history
    const verified = allUTROrders.filter(o => o.utrVerified);
    const vbody = document.getElementById('verifiedBody');
    if (!verified.length) {
      vbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">No verified payments yet</td></tr>';
    } else {
      vbody.innerHTML = verified.slice().reverse().slice(0, 10).map(o => `
        <tr>
          <td style="font-family:monospace;color:var(--accent);font-size:.82rem;">${o.id}</td>
          <td>${o.customer?.name||'-'}<br/><span style="font-size:.74rem;color:var(--text-muted);">${o.customer?.email||''}</span></td>
          <td style="font-weight:700;color:var(--green);">₹${(o.total||0).toLocaleString('en-IN')}</td>
          <td style="font-family:monospace;color:var(--accent);letter-spacing:1px;">${o.utr||'-'}</td>
          <td style="font-size:.8rem;color:var(--text-muted);">${o.verifiedAt ? new Date(o.verifiedAt).toLocaleString('en-IN') : '-'}</td>
        </tr>
      `).join('');
    }
  } catch (e) {
    document.getElementById('utrBody').innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red);padding:40px;">Failed to load orders</td></tr>';
  }
}

async function verifyUTR(orderId) {
  try {
    await apiFetch(`/api/admin/utr-verify/${orderId}`, { method: 'POST' });
    showToast('✅ Payment verified! Order activated.', 'success');
    loadUTROrders();
  } catch (e) { showToast('Failed to verify UTR', 'error'); }
}

function openRejectModal(orderId) {
  rejectingOrderId = orderId;
  document.getElementById('rejectOrderId').textContent = orderId;
  openModal('rejectModal');
}

async function confirmReject() {
  const reason = document.getElementById('rejectReason').value;
  try {
    await apiFetch(`/api/admin/utr-reject/${rejectingOrderId}`, { method: 'POST', body: JSON.stringify({ reason }) });
    showToast('Order rejected and cancelled.', 'error');
    closeModal('rejectModal');
    loadUTROrders();
  } catch (e) { showToast('Failed to reject order', 'error'); }
}

document.addEventListener('DOMContentLoaded', () => {
  loadUTROrders();
  // Auto refresh every 30 seconds
  setInterval(loadUTROrders, 30000);
});
