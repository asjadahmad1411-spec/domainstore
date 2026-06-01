let rejectingOrderId = null;
let allUTROrders = [];

// ── Indian time formatter (IST, AM/PM) ──────────────────────────
function fmtIST(isoStr) {
  if (!isoStr) return '-';
  return new Date(isoStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: true
  });
}

// ── Live "time ago" label ───────────────────────────────────────
function timeAgo(isoStr) {
  if (!isoStr) return '';
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000);
  if (diff < 60)   return `<span style="color:#10b981;font-weight:700;">${diff}s ago 🔴 LIVE</span>`;
  if (diff < 3600) return `<span style="color:#f59e0b;">${Math.floor(diff/60)}m ago</span>`;
  if (diff < 86400)return `<span style="color:var(--text-muted);">${Math.floor(diff/3600)}h ago</span>`;
  return `<span style="color:var(--text-muted);">${Math.floor(diff/86400)}d ago</span>`;
}

async function loadUTROrders() {
  try {
    // Fetch ALL orders (not just UTR pending) so Pending ones also show
    const orders = await apiFetch('/api/admin/orders-all');
    allUTROrders = orders;

    // Show Pending + UTR Pending orders
    const pending = orders.filter(o => o.status === 'Pending' || o.status === 'UTR Pending');
    // Sort newest first
    pending.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const badge = document.getElementById('pendingBadge');
    if (badge) {
      badge.textContent = `${pending.length} Pending`;
      badge.style.background = pending.length > 0 ? 'rgba(239,68,68,.2)' : 'rgba(34,197,94,.2)';
      badge.style.borderColor = pending.length > 0 ? 'rgba(239,68,68,.4)' : 'rgba(34,197,94,.4)';
      badge.style.color = pending.length > 0 ? '#ef4444' : '#22c55e';
    }

    const tbody = document.getElementById('utrBody');
    if (!pending.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px;">🎉 No pending payments</td></tr>';
    } else {
      tbody.innerHTML = pending.map(o => {
        const isNew = (Date.now() - new Date(o.createdAt)) < 300000; // < 5 min
        const rowHighlight = isNew ? 'background:rgba(239,68,68,.06);border-left:3px solid #ef4444;' : 'border-left:3px solid #f59e0b;';
        const statusBadge = o.status === 'UTR Pending'
          ? `<span style="background:rgba(245,158,11,.15);color:#f59e0b;padding:2px 8px;border-radius:20px;font-size:.72rem;font-weight:700;">🕐 UTR Pending</span>`
          : `<span style="background:rgba(239,68,68,.15);color:#ef4444;padding:2px 8px;border-radius:20px;font-size:.72rem;font-weight:700;">🔴 Pending</span>`;
        return `
        <tr style="${rowHighlight}">
          <td>
            <div style="font-family:monospace;color:var(--accent);font-weight:700;font-size:.82rem;">${o.id}</div>
            <div style="margin-top:4px;">${statusBadge}</div>
          </td>
          <td>
            <div style="font-weight:600;">${o.customer?.name || '-'}</div>
            <div style="font-size:.75rem;color:var(--text-muted);">${o.customer?.email || ''}</div>
            <div style="font-size:.75rem;color:var(--text-muted);">${o.customer?.phone || ''}</div>
          </td>
          <td style="font-weight:800;color:var(--green);font-size:1.05rem;">₹${(o.total||0).toLocaleString('en-IN')}</td>
          <td>
            <div style="font-size:.75rem;color:var(--text-muted);">Ordered:</div>
            <div style="font-size:.82rem;font-weight:600;">${fmtIST(o.createdAt)}</div>
            <div style="font-size:.75rem;margin-top:3px;">${timeAgo(o.createdAt)}</div>
            ${o.utrSubmittedAt ? `<div style="font-size:.72rem;color:var(--text-muted);margin-top:4px;">I Paid: ${fmtIST(o.utrSubmittedAt)}</div>` : ''}
          </td>
          <td style="font-size:.82rem;">${(o.items||[]).map(i => `<div style="margin-bottom:2px;">${i.type==='domain'?'🌐':'⚡'} ${i.name}</div>`).join('') || '-'}</td>
          <td style="font-size:.78rem;color:var(--text-muted);">${o.paymentMethod || 'upi'}</td>
          <td>
            <div style="display:flex;gap:6px;flex-direction:column;">
              <button class="btn btn-sm btn-success" onclick="verifyUTR('${o.id}')">✅ Verify &amp; Activate</button>
              <button class="btn btn-sm btn-danger" onclick="openRejectModal('${o.id}')">❌ Reject</button>
            </div>
          </td>
        </tr>`;
      }).join('');
    }

    // Verified history (last 10)
    const verified = orders.filter(o => o.status === 'Active' && o.utrVerified);
    verified.sort((a, b) => new Date(b.verifiedAt || b.activatedAt) - new Date(a.verifiedAt || a.activatedAt));
    const vbody = document.getElementById('verifiedBody');
    if (!verified.length) {
      vbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:20px;">No verified payments yet</td></tr>';
    } else {
      vbody.innerHTML = verified.slice(0, 10).map(o => `
        <tr>
          <td style="font-family:monospace;color:var(--accent);font-size:.82rem;">${o.id}</td>
          <td>${o.customer?.name||'-'}<br/><span style="font-size:.74rem;color:var(--text-muted);">${o.customer?.email||''}</span></td>
          <td style="font-weight:700;color:var(--green);">₹${(o.total||0).toLocaleString('en-IN')}</td>
          <td style="font-size:.82rem;">${(o.items||[]).map(i=>`<div>${i.type==='domain'?'🌐':'⚡'} ${i.name}</div>`).join('') || '-'}</td>
          <td style="font-size:.8rem;color:var(--text-muted);">${fmtIST(o.verifiedAt || o.activatedAt)}</td>
        </tr>`).join('');
    }

    // Update last-refresh time
    const lr = document.getElementById('lastRefresh');
    if (lr) lr.textContent = 'Last updated: ' + fmtIST(new Date().toISOString());

  } catch (e) {
    document.getElementById('utrBody').innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--red);padding:40px;">Failed to load orders</td></tr>';
  }
}

async function verifyUTR(orderId) {
  if (!confirm('✅ Confirm payment received?\n\nClick OK to ACTIVATE this order and notify the customer.')) return;
  try {
    await apiFetch(`/api/admin/activate/${orderId}`, { method: 'POST', body: JSON.stringify({}) });
    showToast('✅ Payment verified! Order is now Active.', 'success');
    loadUTROrders();
  } catch (e) { showToast('Failed to verify payment', 'error'); }
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
  // Auto refresh every 10 seconds for live feel
  setInterval(loadUTROrders, 10000);
});
