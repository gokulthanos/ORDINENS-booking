/* =============================================================
   Admin Panel — Services
   Services across the entire platform. Platform-wide
   visibility/control with filters and activate/deactivate.
   ============================================================= */
import { getServices, getShops } from '../../data.js';
import { escapeHtml, formatINR, toast } from '../../utils.js';
import { pill, emptyState } from '../../ui.js';

export function mountServices(routeParts) {
  if (routeParts && routeParts.length >= 3) {
    renderDetail(routeParts[2]);
    return;
  }
  renderList();
}

function renderList() {
  const content = document.getElementById('ad-content');
  const shops = getShops();

  content.innerHTML = `
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">Services</h1>
        <p class="ad-page-sub">All services across the platform's shops.</p>
      </div>
    </div>

    <div class="ad-card">
      <div class="ad-toolbar">
        <select class="ad-select" id="svc-shop" aria-label="Filter by shop">
          <option value="">All shops</option>
          ${shops.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
        </select>
        <select class="ad-select" id="svc-status" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Shop</th>
              <th>Duration</th>
              <th>Price</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="svc-tbody"></tbody>
        </table>
      </div>
      <div id="svc-cards" class="ad-table-cards"></div>
      <div id="svc-empty" style="display:none;"></div>
    </div>`;

  const apply = () => {
    const statusF = document.getElementById('svc-status').value;
    let rows = getServices();
    if (statusF) rows = rows.filter((s) => (s.active !== false ? 'active' : 'inactive') === statusF);

    document.getElementById('svc-tbody').innerHTML = rows.length
      ? rows.map(svcRow).join('')
      : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No services found.</td></tr>`;
    document.getElementById('svc-cards').innerHTML = rows.length ? rows.map(svcCard).join('') : '';
    document.getElementById('svc-empty').style.display = rows.length ? 'none' : 'block';
    document.getElementById('svc-empty').innerHTML = emptyState(
      '✂',
      'No services yet',
      'Services appear here once a shop adds them.'
    );
  };

  document.getElementById('svc-shop').addEventListener('change', apply);
  document.getElementById('svc-status').addEventListener('change', apply);

  content.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-svc-status]');
    if (btn) toggleService(btn.dataset.svcStatus, btn.dataset.status, apply);
  });

  apply();
}

function svcRow(s) {
  const active = s.active !== false;
  return `
    <tr>
      <td><strong>${s.emoji || '✂'} ${escapeHtml(s.name || '—')}</strong></td>
      <td>Platform shop</td>
      <td>${escapeHtml(s.duration)} min</td>
      <td>${formatINR(s.price)}</td>
      <td>${pill(active ? 'Active' : 'Inactive', active ? 'ad-pill-ok' : 'ad-pill-neutral')}</td>
      <td class="ad-cell-actions">
        <a class="ad-btn ad-btn-ghost ad-btn-sm" href="#admin/services/${escapeHtml(s.id)}">View</a>
        ${active
          ? `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-svc-status="${escapeHtml(s.id)}" data-status="inactive" type="button">Deactivate</button>`
          : `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-svc-status="${escapeHtml(s.id)}" data-status="active" type="button">Activate</button>`}
      </td>
    </tr>`;
}

function svcCard(s) {
  const active = s.active !== false;
  return `
    <div class="ad-table-card">
      <div class="ad-tc-title">
        <span>${s.emoji || '✂'} ${escapeHtml(s.name || '—')}</span>
        ${pill(active ? 'Active' : 'Inactive', active ? 'ad-pill-ok' : 'ad-pill-neutral')}
      </div>
      <div class="ad-tc-grid">
        <div class="ad-tc-item"><span>Duration</span>${escapeHtml(s.duration)} min</div>
        <div class="ad-tc-item"><span>Price</span>${formatINR(s.price)}</div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;">
        <a class="ad-btn ad-btn-ghost ad-btn-sm" href="#admin/services/${escapeHtml(s.id)}">View</a>
        ${active
          ? `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-svc-status="${escapeHtml(s.id)}" data-status="inactive" type="button">Deactivate</button>`
          : `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-svc-status="${escapeHtml(s.id)}" data-status="active" type="button">Activate</button>`}
      </div>
    </div>`;
}

async function toggleService(id, newStatus, apply) {
  const svc = getServices().find((s) => s.id === id);
  if (!svc) return;
  const ok = await window.adConfirm({
    title: newStatus === 'active' ? 'Activate service?' : 'Deactivate service?',
    message:
      newStatus === 'active'
        ? `Activate "${svc.name || 'this service'}"?`
        : `Deactivate "${svc.name || 'this service'}"?`,
    okText: newStatus === 'active' ? 'Activate' : 'Deactivate',
  });
  if (!ok) return;
  const services = getServices().map((s) =>
    s.id === id ? { ...s, active: newStatus === 'active' } : s
  );
  localStorage.setItem('pt_services', JSON.stringify(services));
  toast(newStatus === 'active' ? 'Service activated.' : 'Service deactivated.', 'info');
  apply();
}

function renderDetail(id) {
  const content = document.getElementById('ad-content');
  const svc = getServices().find((s) => s.id === id);
  if (!svc) {
    content.innerHTML = `
      <a class="ad-back" href="#admin/services">← Back to services</a>
      ${emptyState('✂', 'Service not found', 'This service does not exist or has been removed.')}`;
    return;
  }
  const active = svc.active !== false;

  content.innerHTML = `
    <a class="ad-back" href="#admin/services">← Back to services</a>
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">${svc.emoji || '✂'} ${escapeHtml(svc.name || 'Service')}</h1>
        <p class="ad-page-sub">Service details</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        ${pill(active ? 'Active' : 'Inactive', active ? 'ad-pill-ok' : 'ad-pill-neutral')}
        ${active
          ? `<button class="ad-btn ad-btn-danger ad-btn-sm" data-svc-toggle="inactive" type="button">Deactivate</button>`
          : `<button class="ad-btn ad-btn-primary ad-btn-sm" data-svc-toggle="active" type="button">Activate</button>`}
      </div>
    </div>
    <div class="ad-card">
      <h2 class="ad-card-title">Service information</h2>
      <dl class="ad-dl">
        <dt>Name</dt><dd>${escapeHtml(svc.name || '—')}</dd>
        <dt>Shop</dt><dd>Platform shop</dd>
        <dt>Duration</dt><dd>${escapeHtml(svc.duration)} min</dd>
        <dt>Price</dt><dd>${formatINR(svc.price)}</dd>
        <dt>Description</dt><dd>${escapeHtml(svc.description || '—')}</dd>
      </dl>
    </div>`;

  content.querySelector('[data-svc-toggle]')?.addEventListener('click', async (e) => {
    const newStatus = e.target.dataset.svcToggle;
    const ok = await window.adConfirm({
      title: newStatus === 'active' ? 'Activate service?' : 'Deactivate service?',
      message: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} "${svc.name || 'this service'}"?`,
      okText: newStatus === 'active' ? 'Activate' : 'Deactivate',
    });
    if (!ok) return;
    const services = getServices().map((s) =>
      s.id === svc.id ? { ...s, active: newStatus === 'active' } : s
    );
    localStorage.setItem('pt_services', JSON.stringify(services));
    toast(newStatus === 'active' ? 'Service activated.' : 'Service deactivated.', 'info');
    renderDetail(svc.id);
  });
}
