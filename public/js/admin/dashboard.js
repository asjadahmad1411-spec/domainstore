async function loadDashboard() {
  try {
    const stats = await apiFetch('/api/admin/stats');
    document.getElementById('sRevenue').textContent = '₹' + (stats.totalRevenue||0).toLocaleString('en-IN');
    document.getElementById('sOrders').textContent = stats.totalOrders || 0;
    document.getElementById('sPending').textContent = stats.pendingOrders || 0;
    const utrEl = document.getElementById('sUtr');
    if (utrEl) utrEl.textContent = stats.utrPending || 0;
    document.getElementById('sCustomers').textContent = stats.totalCustomers || 0;
    document.getElementById('sDomains').textContent = stats.domainsSold || 0;
    document.getElementById('sHosting').textContent = stats.hostingActive || 0;

    const tbody = document.getElementById('recentOrdersBody');
    const recent = stats.recentOrders || [];
    if (!recent.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No orders yet</td></tr>';
    } else {
      tbody.innerHTML = recent.map(o => `
        <tr>
          <td style="font-family:monospace;color:var(--accent);font-weight:700;">${o.id}</td>
          <td>${o.customer?.name || '-'}<br/><span style="font-size:0.75rem;color:var(--text-muted);">${o.customer?.email||''}</span></td>
          <td>${(o.items||[]).length} item${(o.items||[]).length!==1?'s':''}</td>
          <td style="font-weight:700;">₹${(o.total||0).toLocaleString('en-IN')}</td>
          <td><span class="status status-${(o.status||'pending').toLowerCase()}">${o.status}</span></td>
          <td style="color:var(--text-muted);font-size:0.82rem;">${new Date(o.createdAt).toLocaleDateString('en-IN')}</td>
        </tr>
      `).join('');
    }
  } catch (e) { console.error(e); }

  try {
    const data = await apiFetch('/api/domains/check?name=example');
    const tlds = (data.results || []).slice(0, 5);
    document.getElementById('tldMiniList').innerHTML = tlds.map(t => `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.875rem;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="font-weight:700;color:var(--accent);">${t.extension}</span>
        <span>₹${t.price}/yr</span>
      </div>
    `).join('');
  } catch (e) {}

  try {
    const plans = await apiFetch('/api/hosting');
    document.getElementById('planMiniList').innerHTML = plans.slice(0, 5).map(p => `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.875rem;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <span style="font-weight:700;">${p.name}</span>
        <span style="color:var(--accent);">₹${p.price}/mo</span>
      </div>
    `).join('');
  } catch (e) {}
}

document.addEventListener('DOMContentLoaded', loadDashboard);
