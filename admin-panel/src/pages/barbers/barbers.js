/* =============================================================
   Admin Panel — Barbers
   View barbers across the platform, filter by shop/status,
   activate / deactivate with confirmation.
   ============================================================= */
import { getBarbers, getShops, getServices } from '../../data.js';
import { escapeHtml, toast } from '../../utils.js';
import { pill, emptyState } from '../../ui.js';

export function mountBarbers(routeParts) {
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
        <h1 class="ad-page-title">Barbers</h1>
        <p class="ad-page-sub">Barbers across all platform shops.</p>
      </div>
    </div>

    <div class="ad-card">
      <div class="ad-toolbar">
        <select class="ad-select" id="barber-shop" aria-label="Filter by shop">
          <option value="">All shops</option>
          ${shops.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
        </select>
        <select class="ad-select" id="barber-status" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead>
            <tr>
              <th>Barber</th>
              <th>Shop</th>
              <th>Role</th>
              <th>Specialty</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="barber-tbody"></tbody>
        </table>
      </div>
      <div id="barber-cards" class="ad-table-cards"></div>
      <div id="barber-empty" style="display:none;"></div>
    </div>`;

  const apply = () => {
    const statusF = document.getElementById('barber-status').value;
    let rows = getBarbers();
    if (statusF) rows = rows.filter((b) => (b.active !== false ? 'active' : 'inactive') === statusF);

    document.getElementById('barber-tbody').innerHTML = rows.length
      ? rows.map(barberRow).join('')
      : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No barbers found.</td></tr>`;
    document.getElementById('barber-cards').innerHTML = rows.length ? rows.map((b) => barberCard(b)).join('') : '';
    document.getElementById('barber-empty').style.display = rows.length ? 'none' : 'block';
    document.getElementById('barber-empty').innerHTML = emptyState(
      '💈',
      'No barbers yet',
      'Barbers appear here once a shop registers them.'
    );
  };

  document.getElementById('barber-shop').addEventListener('change', apply);
  document.getElementById('barber-status').addEventListener('change', apply);

  content.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-barber-status]');
    if (btn) toggleBarber(btn.dataset.barberStatus, btn.dataset.status, apply);
  });

  apply();
}

function barberRow(b) {
  const active = b.active !== false;
  return `
    <tr>
      <td><strong>${escapeHtml(b.name || '—')}</strong><br /><span class="ad-sub">${escapeHtml(b.role || '')}</span></td>
      <td>${shopName()}</td>
      <td>${escapeHtml(b.role || '—')}</td>
      <td>${escapeHtml(b.specialty || '—')}</td>
      <td>${pill(active ? 'Active' : 'Inactive', active ? 'ad-pill-ok' : 'ad-pill-neutral')}</td>
      <td class="ad-cell-actions">
        <a class="ad-btn ad-btn-ghost ad-btn-sm" href="#admin/barbers/${escapeHtml(b.id)}">View</a>
        ${active
          ? `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-barber-status="${escapeHtml(b.id)}" data-status="inactive" type="button">Deactivate</button>`
          : `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-barber-status="${escapeHtml(b.id)}" data-status="active" type="button">Activate</button>`}
      </td>
    </tr>`;
}

function shopName() {
  // Prototype: single shared shop dataset — show platform default
  return escapeHtml('Platform shop');
}

function barberCard(b) {
  const active = b.active !== false;
  return `
    <div class="ad-table-card">
      <div class="ad-tc-title">
        <span>${escapeHtml(b.name || '—')}</span>
        ${pill(active ? 'Active' : 'Inactive', active ? 'ad-pill-ok' : 'ad-pill-neutral')}
      </div>
      <div class="ad-tc-grid">
        <div class="ad-tc-item"><span>Role</span>${escapeHtml(b.role || '—')}</div>
        <div class="ad-tc-item"><span>Specialty</span>${escapeHtml(b.specialty || '—')}</div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;">
        <a class="ad-btn ad-btn-ghost ad-btn-sm" href="#admin/barbers/${escapeHtml(b.id)}">View</a>
        ${active
          ? `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-barber-status="${escapeHtml(b.id)}" data-status="inactive" type="button">Deactivate</button>`
          : `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-barber-status="${escapeHtml(b.id)}" data-status="active" type="button">Activate</button>`}
      </div>
    </div>`;
}

async function toggleBarber(id, newStatus, apply) {
  const barber = getBarbers().find((b) => b.id === id);
  if (!barber) return;
  const ok = await window.adConfirm({
    title: newStatus === 'active' ? 'Activate barber?' : 'Deactivate barber?',
    message:
      newStatus === 'active'
        ? `Activate ${barber.name || 'this barber'}?`
        : `Deactivate ${barber.name || 'this barber'}?`,
    okText: newStatus === 'active' ? 'Activate' : 'Deactivate',
  });
  if (!ok) return;
  const barbers = getBarbers().map((b) => (b.id === id ? { ...b, active: newStatus === 'active' } : b));
  localStorage.setItem('pt_staff', JSON.stringify(barbers));
  toast(newStatus === 'active' ? 'Barber activated.' : 'Barber deactivated.', 'info');
  apply();
}

function renderDetail(id) {
  const content = document.getElementById('ad-content');
  const barber = getBarbers().find((b) => b.id === id);
  if (!barber) {
    content.innerHTML = `
      <a class="ad-back" href="#admin/barbers">← Back to barbers</a>
      ${emptyState('💈', 'Barber not found', 'This barber does not exist or has been removed.')}`;
    return;
  }
  const active = barber.active !== false;
  const serviceCount = getServices().filter((s) => s.active !== false).length;

  content.innerHTML = `
    <a class="ad-back" href="#admin/barbers">← Back to barbers</a>
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">${escapeHtml(barber.name || 'Barber')}</h1>
        <p class="ad-page-sub">Barber details</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        ${pill(active ? 'Active' : 'Inactive', active ? 'ad-pill-ok' : 'ad-pill-neutral')}
        ${active
          ? `<button class="ad-btn ad-btn-danger ad-btn-sm" data-barber-toggle="inactive" type="button">Deactivate</button>`
          : `<button class="ad-btn ad-btn-primary ad-btn-sm" data-barber-toggle="active" type="button">Activate</button>`}
      </div>
    </div>
    <div class="ad-card">
      <h2 class="ad-card-title">Profile</h2>
      <dl class="ad-dl">
        <dt>Name</dt><dd>${escapeHtml(barber.name || '—')}</dd>
        <dt>Role</dt><dd>${escapeHtml(barber.role || '—')}</dd>
        <dt>Specialty</dt><dd>${escapeHtml(barber.specialty || '—')}</dd>
        <dt>Years experience</dt><dd>${escapeHtml(String(barber.years ?? '—'))}</dd>
        <dt>Shop</dt><dd>Platform shop</dd>
        <dt>Platform services</dt><dd>${serviceCount}</dd>
      </dl>
    </div>`;

  content.querySelector('[data-barber-toggle]')?.addEventListener('click', async (e) => {
    const newStatus = e.target.dataset.barberToggle;
    const ok = await window.adConfirm({
      title: newStatus === 'active' ? 'Activate barber?' : 'Deactivate barber?',
      message: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} ${barber.name || 'this barber'}?`,
      okText: newStatus === 'active' ? 'Activate' : 'Deactivate',
    });
    if (!ok) return;
    const barbers = getBarbers().map((b) =>
      b.id === barber.id ? { ...b, active: newStatus === 'active' } : b
    );
    localStorage.setItem('pt_staff', JSON.stringify(barbers));
    toast(newStatus === 'active' ? 'Barber activated.' : 'Barber deactivated.', 'info');
    renderDetail(barber.id);
  });
}
