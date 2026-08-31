/* =============================================================
   Admin Panel — Shops
   Admin manages ALL shops platform-wide.
   View, activate, deactivate with confirmation.
   ============================================================= */
import { getShops, getShop, setShopStatus, addShop, getServices, getBarbers, getBookings, getCustomers } from '../../data.js';
import { escapeHtml, formatDateShort, formatDateTime, toast } from '../../utils.js';
import { pill, shopStatusClass, emptyState } from '../../ui.js';

export function mountShops(routeParts) {
  if (routeParts && routeParts.length >= 3) {
    renderDetail(routeParts[2]);
    return;
  }
  renderList();
}

/* ------------------------------ List -------------------------------- */
function renderList() {
  const content = document.getElementById('ad-content');
  const shops = getShops();

  content.innerHTML = `
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">Shops</h1>
        <p class="ad-page-sub">All registered shops across the platform.</p>
      </div>
      <button class="ad-btn ad-btn-primary" id="add-shop-btn" type="button">+ Add shop</button>
    </div>

    <div class="ad-card">
      <div class="ad-toolbar">
        <input class="ad-input ad-search" id="shop-search" type="search" placeholder="Search shop or owner" aria-label="Search shops" />
        <select class="ad-select" id="shop-status" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead>
            <tr>
              <th>Shop</th>
              <th>Owner</th>
              <th>Location</th>
              <th>Status</th>
              <th>Barbers</th>
              <th>Services</th>
              <th>Bookings</th>
              <th>Registered</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="shop-tbody"></tbody>
        </table>
      </div>
      <div id="shop-cards" class="ad-table-cards"></div>
      <div id="shop-empty" style="display:none;"></div>
    </div>`;

  const apply = () => {
    const q = (document.getElementById('shop-search').value || '').toLowerCase();
    const statusF = document.getElementById('shop-status').value;
    let rows = getShops();
    if (q) {
      rows = rows.filter(
        (s) =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.ownerName || '').toLowerCase().includes(q) ||
          (s.location || '').toLowerCase().includes(q)
      );
    }
    if (statusF) rows = rows.filter((s) => s.status === statusF);

    document.getElementById('shop-tbody').innerHTML = rows.length
      ? rows.map(shopRowHtml).join('')
      : `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:32px;">No shops found.</td></tr>`;
    document.getElementById('shop-cards').innerHTML = rows.length ? rows.map(shopCardHtml).join('') : '';
    document.getElementById('shop-empty').style.display = rows.length ? 'none' : 'block';
    document.getElementById('shop-empty').innerHTML = emptyState(
      '🏪',
      'No shops registered',
      'Shops will appear here once owners register them, or you can add one manually.'
    );
  };

  document.getElementById('shop-search').addEventListener('input', apply);
  document.getElementById('shop-status').addEventListener('change', apply);
  document.getElementById('add-shop-btn').addEventListener('click', () => openAddShop(apply));

  // Action buttons (activate/deactivate)
  content.addEventListener('click', (e) => {
    if (e.target.closest('[data-shop-status]')) {
      const btn = e.target.closest('[data-shop-status]');
      toggleShopStatus(btn.dataset.shopStatus, btn.dataset.status, apply);
    }
  });

  apply();
}

function shopRowHtml(s) {
  return `
    <tr>
      <td><strong>${escapeHtml(s.name || '—')}</strong></td>
      <td>${escapeHtml(s.ownerName || '—')}</td>
      <td>${escapeHtml(s.location || '—')}</td>
      <td>${pill(s.status, shopStatusClass(s.status))}</td>
      <td>${s.barberCount}</td>
      <td>${s.serviceCount}</td>
      <td>${s.bookingCount}</td>
      <td>${s.createdAt ? formatDateShort(new Date(s.createdAt)) : '—'}</td>
      <td class="ad-cell-actions">
        <a class="ad-btn ad-btn-ghost ad-btn-sm" href="#admin/shops/${escapeHtml(s.id)}">View</a>
        ${s.status === 'active'
          ? `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-shop-status="${escapeHtml(s.id)}" data-status="inactive" type="button">Deactivate</button>`
          : `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-shop-status="${escapeHtml(s.id)}" data-status="active" type="button">Activate</button>`}
      </td>
    </tr>`;
}

function shopCardHtml(s) {
  return `
    <div class="ad-table-card">
      <div class="ad-tc-title">
        <span>${escapeHtml(s.name || '—')}</span>
        ${pill(s.status, shopStatusClass(s.status))}
      </div>
      <div class="ad-tc-grid">
        <div class="ad-tc-item"><span>Owner</span>${escapeHtml(s.ownerName || '—')}</div>
        <div class="ad-tc-item"><span>Location</span>${escapeHtml(s.location || '—')}</div>
        <div class="ad-tc-item"><span>Barbers</span>${s.barberCount}</div>
        <div class="ad-tc-item"><span>Services</span>${s.serviceCount}</div>
        <div class="ad-tc-item"><span>Bookings</span>${s.bookingCount}</div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
        <a class="ad-btn ad-btn-ghost ad-btn-sm" href="#admin/shops/${escapeHtml(s.id)}">View</a>
        ${s.status === 'active'
          ? `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-shop-status="${escapeHtml(s.id)}" data-status="inactive" type="button">Deactivate</button>`
          : `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-shop-status="${escapeHtml(s.id)}" data-status="active" type="button">Activate</button>`}
      </div>
    </div>`;
}

async function toggleShopStatus(id, newStatus, apply) {
  const shop = getShop(id);
  if (!shop) return;
  const ok = await window.adConfirm({
    title: newStatus === 'active' ? 'Activate shop?' : 'Deactivate shop?',
    message:
      newStatus === 'active'
        ? `Are you sure you want to activate "${shop.name}"?`
        : `Are you sure you want to deactivate "${shop.name}"? This will remove the shop from active operation.`,
    okText: newStatus === 'active' ? 'Activate' : 'Deactivate',
  });
  if (!ok) return;
  setShopStatus(id, newStatus);
  toast(newStatus === 'active' ? 'Shop activated.' : 'Shop deactivated.', 'info');
  apply();
}

/* ------------------------------ Detail ------------------------------ */
function renderDetail(id) {
  const content = document.getElementById('ad-content');
  const shop = getShop(id);
  if (!shop) {
    content.innerHTML = `
      <a class="ad-back" href="#admin/shops">← Back to shops</a>
      ${emptyState('🏪', 'Shop not found', 'This shop does not exist or has been removed.')}`;
    return;
  }

  content.innerHTML = `
    <a class="ad-back" href="#admin/shops">← Back to shops</a>
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">${escapeHtml(shop.name || 'Shop')}</h1>
        <p class="ad-page-sub">Platform-wide shop details</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        ${pill(shop.status, shopStatusClass(shop.status))}
        ${shop.status === 'active'
          ? `<button class="ad-btn ad-btn-danger ad-btn-sm" data-detail-status="inactive" type="button">Deactivate</button>`
          : `<button class="ad-btn ad-btn-primary ad-btn-sm" data-detail-status="active" type="button">Activate</button>`}
      </div>
    </div>

    <div class="ad-detail-grid">
      <div class="ad-card">
        <h2 class="ad-card-title">Shop information</h2>
        <dl class="ad-dl">
          <dt>Name</dt><dd>${escapeHtml(shop.name || '—')}</dd>
          <dt>Type</dt><dd>${escapeHtml(shop.type || 'barber')}</dd>
          <dt>Location</dt><dd>${escapeHtml(shop.location || '—')}</dd>
          <dt>Address</dt><dd>${escapeHtml(shop.address || '—')}</dd>
          <dt>Description</dt><dd>${escapeHtml(shop.description || '—')}</dd>
          <dt>Registered</dt><dd>${shop.createdAt ? formatDateTime(shop.createdAt) : '—'}</dd>
        </dl>
      </div>
      <div class="ad-card">
        <h2 class="ad-card-title">Owner information</h2>
        <dl class="ad-dl">
          <dt>Owner</dt><dd>${escapeHtml(shop.ownerName || '—')}</dd>
          <dt>Owner contact</dt><dd>${escapeHtml(shop.ownerPhone || '—')}</dd>
        </dl>
        <h2 class="ad-card-title" style="margin-top:20px;">Operating status</h2>
        <p style="color:var(--text-muted);font-size:14px;">Status: <strong>${escapeHtml(shop.status || '—')}</strong></p>
      </div>
    </div>

    <div class="ad-card ad-section">
      <h2 class="ad-card-title">Platform aggregate preview</h2>
      <p style="color:var(--text-muted);font-size:13px;margin-top:-8px;">Prototype data is currently sourced from the shared local dataset. Per-shop segregation will be provided by the common backend.</p>
      <dl class="ad-dl">
        <dt>Barbers</dt><dd>${escapeHtml(String(shop.barberCount))}</dd>
        <dt>Services</dt><dd>${escapeHtml(String(shop.serviceCount))}</dd>
        <dt>Bookings</dt><dd>${escapeHtml(String(shop.bookingCount))}</dd>
      </dl>
    </div>

    <div class="ad-card">
      <h2 class="ad-card-title">Platform services</h2>
      <p style="color:var(--text-muted);font-size:13px;">Services available across the platform (${getServices().length})</p>
    </div>

    <div class="ad-card">
      <h2 class="ad-card-title">Platform barbers</h2>
      <p style="color:var(--text-muted);font-size:13px;">Active barbers across the platform (${getBarbers().filter((b) => b.active !== false).length})</p>
    </div>`;

  content.querySelector('[data-detail-status]')?.addEventListener('click', async (e) => {
    const newStatus = e.target.dataset.detailStatus;
    const ok = await window.adConfirm({
      title: newStatus === 'active' ? 'Activate shop?' : 'Deactivate shop?',
      message:
        newStatus === 'active'
          ? `Activate "${shop.name}"?`
          : `Deactivate "${shop.name}"?`,
      okText: newStatus === 'active' ? 'Activate' : 'Deactivate',
    });
    if (!ok) return;
    setShopStatus(shop.id, newStatus);
    toast(newStatus === 'active' ? 'Shop activated.' : 'Shop deactivated.', 'info');
    renderDetail(shop.id);
  });
}

/* ------------------------------ Add shop ---------------------------- */
function openAddShop(refresh) {
  const content = document.getElementById('ad-content');
  content.insertAdjacentHTML(
    'beforeend',
    `<div id="add-shop-dialog" class="ad-modal" role="dialog" aria-modal="true" aria-labelledby="add-shop-title">
      <div class="ad-modal-backdrop" data-close-dialog></div>
      <div class="ad-modal-panel">
        <h2 class="ad-confirm-title" id="add-shop-title">Register a shop</h2>
        <form id="add-shop-form">
          <div class="ad-field"><label for="as-name">Shop name</label><input class="ad-input" id="as-name" required /></div>
          <div class="ad-field"><label for="as-owner">Owner name</label><input class="ad-input" id="as-owner" /></div>
          <div class="ad-field"><label for="as-owner-phone">Owner phone</label><input class="ad-input" id="as-owner-phone" /></div>
          <div class="ad-field"><label for="as-location">Location</label><input class="ad-input" id="as-location" /></div>
          <div class="ad-field"><label for="as-address">Address</label><input class="ad-input" id="as-address" /></div>
          <div class="ad-issue-form-grid">
            <div class="ad-field">
              <label for="as-type">Type</label>
              <select class="ad-select" id="as-type">
                <option value="barber">Barber</option>
                <option value="salon">Salon</option>
                <option value="barber-salon">Barber & Salon</option>
              </select>
            </div>
            <div class="ad-field">
              <label for="as-status">Status</label>
              <select class="ad-select" id="as-status">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          <div class="ad-confirm-actions">
            <button type="button" class="ad-btn ad-btn-ghost" data-close-dialog>Cancel</button>
            <button type="submit" class="ad-btn ad-btn-primary">Save shop</button>
          </div>
        </form>
      </div>
    </div>`
  );

  const dialog = document.getElementById('add-shop-dialog');
  const close = () => dialog.remove();

  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-dialog]')) close();
  });

  document.getElementById('add-shop-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('as-name').value.trim();
    if (!name) {
      toast('Shop name is required.', 'warn');
      return;
    }
    addShop({
      name,
      ownerName: document.getElementById('as-owner').value.trim(),
      ownerPhone: document.getElementById('as-owner-phone').value.trim(),
      location: document.getElementById('as-location').value.trim(),
      address: document.getElementById('as-address').value.trim(),
      type: document.getElementById('as-type').value,
      status: document.getElementById('as-status').value,
    });
    toast('Shop registered.');
    close();
    if (refresh) refresh();
    // Navigate to the new shop detail
    // (detail lookup requires fresh getShops; re-render list for simplicity)
  });
}
