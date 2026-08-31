/* =============================================================
   Admin Panel — Customers
   View registered customers with search, filter, sort, and a
   detail view (profile, contact, booking history, account status).
   ============================================================= */
import { getCustomers, getBookings } from '../../data.js';
import { escapeHtml, formatDateShort, debounce } from '../../utils.js';
import { emptyState, pill, statusClass } from '../../ui.js';

export function mountCustomers(routeParts) {
  // Detail route: #admin/customers/:id
  if (routeParts && routeParts.length >= 3) {
    const id = decodeURIComponent(routeParts[2]);
    const customer = getCustomers().find(
      (c) => c.id === id || String(c.identifier).toLowerCase() === String(id).toLowerCase()
    );
    renderDetail(customer);
    return;
  }
  renderList();
}

/* ------------------------------ List -------------------------------- */
function renderList() {
  const content = document.getElementById('ad-content');
  content.innerHTML = `
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">Customers</h1>
        <p class="ad-page-sub">Registered users on the Ordinens Tech platform.</p>
      </div>
    </div>

    <div class="ad-card">
      <div class="ad-toolbar">
        <input class="ad-input ad-search" id="cust-search" type="search" placeholder="Search name, phone or email" aria-label="Search customers" />
        <select class="ad-select" id="cust-status" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select class="ad-select" id="cust-sort" aria-label="Sort customers">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="bookings">Most bookings</option>
        </select>
      </div>

      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Registered</th>
              <th>Bookings</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="cust-tbody"></tbody>
        </table>
      </div>
      <div id="cust-cards" class="ad-table-cards"></div>
      <div id="cust-empty" style="display:none;"></div>
    </div>`;

  const apply = () => {
    const q = (document.getElementById('cust-search').value || '').toLowerCase();
    const statusF = document.getElementById('cust-status').value;
    const sort = document.getElementById('cust-sort').value;

    let rows = getCustomers().map(withBookingCount);
    if (q) {
      rows = rows.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.identifier || '').toLowerCase().includes(q)
      );
    }
    if (statusF) rows = rows.filter((c) => c.status === statusF);
    rows.sort((a, b) => {
      if (sort === 'oldest') return (a.createdAt || '') < (b.createdAt || '') ? -1 : 1;
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'bookings') return b.bookingCount - a.bookingCount;
      return (a.createdAt || '') > (b.createdAt || '') ? -1 : 1;
    });

    document.getElementById('cust-tbody').innerHTML = rows.length
      ? rows.map(rowHtml).join('')
      : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No customers found.</td></tr>`;
    document.getElementById('cust-cards').innerHTML = rows.length ? rows.map(cardHtml).join('') : '';
    document.getElementById('cust-empty').style.display = rows.length ? 'none' : 'block';
    document.getElementById('cust-empty').innerHTML = emptyState(
      '👤',
      'No customers yet',
      'Customers appear here once they register and book on the platform.'
    );
  };

  document.getElementById('cust-search').addEventListener('input', debounce(apply, 200));
  document.getElementById('cust-status').addEventListener('change', apply);
  document.getElementById('cust-sort').addEventListener('change', apply);
  apply();
}

function withBookingCount(customer) {
  const key = String(customer.identifier || '').toLowerCase();
  const bookings = getBookings();
  const count = bookings.filter((b) => {
    const phone = String(b.customerPhone || '').replace(/[^0-9]/g, '');
    const cPhone = String(customer.identifier || '').replace(/[^0-9]/g, '');
    return phone && cPhone && phone === cPhone;
  }).length;
  return { ...customer, bookingCount: count, status: count || customer.createdAt ? 'active' : 'inactive' };
}

function rowHtml(c) {
  return `
    <tr>
      <td><strong>${escapeHtml(c.name || '—')}</strong></td>
      <td>
        <div>${escapeHtml(c.identifier || '—')}</div>
        ${c.email ? `<div class="ad-sub">${escapeHtml(c.email)}</div>` : ''}
      </td>
      <td>${formatDateShort(new Date(c.createdAt))}</td>
      <td>${c.bookingCount}</td>
      <td>${pill(c.status, c.status === 'active' ? 'ad-pill-ok' : 'ad-pill-neutral')}</td>
      <td class="ad-cell-actions"><a class="ad-btn ad-btn-ghost ad-btn-sm" href="#admin/customers/${encodeURIComponent(c.id || c.identifier)}">View</a></td>
    </tr>`;
}

function cardHtml(c) {
  return `
    <div class="ad-table-card">
      <div class="ad-tc-title">
        <span>${escapeHtml(c.name || '—')}</span>
        ${pill(c.status, c.status === 'active' ? 'ad-pill-ok' : 'ad-pill-neutral')}
      </div>
      <div class="ad-tc-grid">
        <div class="ad-tc-item"><span>Contact</span>${escapeHtml(c.identifier || '—')}</div>
        <div class="ad-tc-item"><span>Registered</span>${formatDateShort(new Date(c.createdAt))}</div>
        <div class="ad-tc-item"><span>Bookings</span>${c.bookingCount}</div>
      </div>
      <div style="margin-top:10px;"><a class="ad-btn ad-btn-ghost ad-btn-sm" href="#admin/customers/${encodeURIComponent(c.id || c.identifier)}">View</a></div>
    </div>`;
}

/* ------------------------------ Detail ------------------------------ */
function renderDetail(customer) {
  const content = document.getElementById('ad-content');
  if (!customer) {
    content.innerHTML = `
      <a class="ad-back" href="#admin/customers">← Back to customers</a>
      ${emptyState('👤', 'Customer not found', 'This customer does not exist or has been removed.')}`;
    return;
  }

  const bookings = getBookings().filter((b) => {
    const phone = String(b.customerPhone || '').replace(/[^0-9]/g, '');
    const cPhone = String(customer.identifier || '').replace(/[^0-9]/g, '');
    return phone && cPhone && phone === cPhone;
  });
  const status = bookings.length || customer.createdAt ? 'active' : 'inactive';

  content.innerHTML = `
    <a class="ad-back" href="#admin/customers">← Back to customers</a>
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">${escapeHtml(customer.name || 'Customer')}</h1>
        <p class="ad-page-sub">Customer profile</p>
      </div>
      ${pill(status, status === 'active' ? 'ad-pill-ok' : 'ad-pill-neutral')}
    </div>

    <div class="ad-detail-grid">
      <div class="ad-card">
        <h2 class="ad-card-title">Profile & Contact</h2>
        <dl class="ad-dl">
          <dt>Name</dt><dd>${escapeHtml(customer.name || '—')}</dd>
          <dt>Contact</dt><dd>${escapeHtml(customer.identifier || '—')}</dd>
          <dt>Registered</dt><dd>${formatDateShort(new Date(customer.createdAt))}</dd>
          <dt>Account status</dt><dd>${status}</dd>
        </dl>
      </div>
      <div class="ad-card">
        <h2 class="ad-card-title">Activity</h2>
        <dl class="ad-dl">
          <dt>Total bookings</dt><dd>${bookings.length}</dd>
          <dt>Last booking</dt><dd>${bookings.length ? formatDateShort(new Date(bookings[bookings.length - 1]?.dateISO)) : '—'}</dd>
        </dl>
      </div>
    </div>

    <div class="ad-card">
      <h2 class="ad-card-title">Booking history</h2>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead>
            <tr>
              <th>Booking ID</th><th>Service</th><th>Barber</th><th>Date</th><th>Time</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${bookings.length
              ? bookings
                  .slice()
                  .sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || ''))
                  .map(
                    (b) => `
                  <tr>
                    <td><strong>${escapeHtml(b.id)}</strong></td>
                    <td>${escapeHtml(b.serviceName || '—')}</td>
                    <td>${escapeHtml(b.barberName || '—')}</td>
                    <td>${formatDateShort(new Date(b.dateISO))}</td>
                    <td>${new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(0, 0, 0, Math.floor(b.startMinute / 60), b.startMinute % 60))}</td>
                    <td>${pill(b.status, statusClass(b.status))}</td>
                  </tr>`
                  )
                  .join('')
              : `<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No bookings for this customer.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}
