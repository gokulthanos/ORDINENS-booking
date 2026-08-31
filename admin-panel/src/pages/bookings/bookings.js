/* =============================================================
   Admin Panel — Bookings
   Platform-wide booking management.
   Search + date/shop/barber/status filters + details view +
   valid status transitions only (no invalid transitions).
   ============================================================= */
import {
  getBookings,
  getBooking,
  setBookingStatus,
  getValidTransitions,
  getBarbers,
  getShops,
  getServices,
} from '../../data.js';
import {
  escapeHtml,
  formatDateShort,
  formatINR,
  formatDateTime,
  minutesToLabel,
  fromISO,
  debounce,
  toast,
} from '../../utils.js';
import { pill, statusClass, statusLabel, emptyState } from '../../ui.js';

export function mountBookings(routeParts) {
  if (routeParts && routeParts.length >= 3) {
    renderDetail(routeParts[2]);
    return;
  }
  renderList();
}

function renderList() {
  const content = document.getElementById('ad-content');
  const barbers = getBarbers();
  const shops = getShops();

  content.innerHTML = `
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">Bookings</h1>
        <p class="ad-page-sub">All bookings across the platform.</p>
      </div>
    </div>

    <div class="ad-card">
      <div class="ad-toolbar">
        <input class="ad-input ad-search" id="booking-search" type="search" placeholder="Search booking ID or customer" aria-label="Search bookings" />
        <input class="ad-input" id="booking-date" type="date" aria-label="Filter by date" />
        <select class="ad-select" id="booking-shop" aria-label="Filter by shop">
          <option value="">All shops</option>
          ${shops.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
        </select>
        <select class="ad-select" id="booking-barber" aria-label="Filter by barber">
          <option value="">All barbers</option>
          ${barbers.map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`).join('')}
        </select>
        <select class="ad-select" id="booking-status" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="no-show">No-show</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Customer</th>
              <th>Shop</th>
              <th>Barber</th>
              <th>Service</th>
              <th>Date</th>
              <th>Time</th>
              <th>Duration</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="booking-tbody"></tbody>
        </table>
      </div>
      <div id="booking-cards" class="ad-table-cards"></div>
      <div id="booking-empty" style="display:none;"></div>
    </div>`;

  const apply = () => {
    const q = (document.getElementById('booking-search').value || '').toLowerCase();
    const date = document.getElementById('booking-date').value;
    const barber = document.getElementById('booking-barber').value;
    const status = document.getElementById('booking-status').value;

    let rows = getBookings();
    if (q) {
      rows = rows.filter(
        (b) =>
          (b.id || '').toLowerCase().includes(q) ||
          (b.customerName || '').toLowerCase().includes(q)
      );
    }
    if (date) rows = rows.filter((b) => b.dateISO === date);
    if (barber) rows = rows.filter((b) => b.barberId === barber);
    if (status) rows = rows.filter((b) => b.status === status);
    rows.sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || ''));

    document.getElementById('booking-tbody').innerHTML = rows.length
      ? rows.map(bookingRow).join('')
      : `<tr><td colspan="10" style="text-align:center;color:var(--text-muted);padding:32px;">No bookings found.</td></tr>`;
    document.getElementById('booking-cards').innerHTML = rows.length
      ? rows.map(bookingCard).join('')
      : '';
    document.getElementById('booking-empty').style.display = rows.length ? 'none' : 'block';
    document.getElementById('booking-empty').innerHTML = emptyState(
      '📋',
      'No bookings found',
      'There are no bookings matching the current filters.'
    );
  };

  document.getElementById('booking-search').addEventListener('input', debounce(apply, 200));
  document.getElementById('booking-date').addEventListener('change', apply);
  document.getElementById('booking-shop').addEventListener('change', apply);
  document.getElementById('booking-barber').addEventListener('change', apply);
  document.getElementById('booking-status').addEventListener('change', apply);

  apply();
}

function bookingRow(b) {
  return `
    <tr>
      <td><strong>${escapeHtml(b.id)}</strong></td>
      <td><strong>${escapeHtml(b.customerName || '—')}</strong><br /><span class="ad-sub">${escapeHtml(b.customerPhone || '')}</span></td>
      <td>Platform shop</td>
      <td>${escapeHtml(b.barberName || '—')}</td>
      <td>${escapeHtml(b.serviceName || '—')}</td>
      <td>${formatDateShort(fromISO(b.dateISO))}</td>
      <td>${minutesToLabel(b.startMinute)}</td>
      <td>${escapeHtml(b.duration)} min</td>
      <td>${pill(b.status, statusClass(b.status))}</td>
      <td class="ad-cell-actions"><a class="ad-btn ad-btn-ghost ad-btn-sm" href="#admin/bookings/${escapeHtml(b.id)}">View</a></td>
    </tr>`;
}

function bookingCard(b) {
  return `
    <div class="ad-table-card">
      <div class="ad-tc-title">
        <span>${escapeHtml(b.id)} · ${escapeHtml(b.customerName || '—')}</span>
        ${pill(b.status, statusClass(b.status))}
      </div>
      <div class="ad-tc-grid">
        <div class="ad-tc-item"><span>Service</span>${escapeHtml(b.serviceName || '—')}</div>
        <div class="ad-tc-item"><span>Barber</span>${escapeHtml(b.barberName || '—')}</div>
        <div class="ad-tc-item"><span>Date</span>${formatDateShort(fromISO(b.dateISO))}</div>
        <div class="ad-tc-item"><span>Time</span>${minutesToLabel(b.startMinute)}</div>
        <div class="ad-tc-item"><span>Duration</span>${escapeHtml(b.duration)} min</div>
      </div>
      <div style="margin-top:10px;"><a class="ad-btn ad-btn-ghost ad-btn-sm" href="#admin/bookings/${escapeHtml(b.id)}">View booking</a></div>
    </div>`;
}

/* ------------------------------ Detail ------------------------------ */
function renderDetail(id) {
  const content = document.getElementById('ad-content');
  const booking = getBooking(id);
  const services = getServices();

  if (!booking) {
    content.innerHTML = `
      <a class="ad-back" href="#admin/bookings">← Back to bookings</a>
      ${emptyState('📋', 'Booking not found', 'This booking does not exist or has been removed.')}`;
    return;
  }

  const service = services.find((s) => s.id === booking.serviceId) || null;
  const duration = booking.duration || (service ? service.duration : '—');
  const endMinute = (Number(booking.startMinute) || 0) + (Number(duration) || 0);
  const transitions = getValidTransitions(booking.status);

  content.innerHTML = `
    <a class="ad-back" href="#admin/bookings">← Back to bookings</a>
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">${escapeHtml(booking.id)}</h1>
        <p class="ad-page-sub">Booking details</p>
      </div>
      ${pill(booking.status, statusClass(booking.status))}
    </div>

    <div class="ad-detail-grid">
      <div class="ad-card">
        <h2 class="ad-card-title">Customer</h2>
        <dl class="ad-dl">
          <dt>Name</dt><dd>${escapeHtml(booking.customerName || '—')}</dd>
          <dt>Phone</dt><dd>${escapeHtml(booking.customerPhone || '—')}</dd>
          <dt>Note</dt><dd>${escapeHtml(booking.customerNote || '—')}</dd>
        </dl>
      </div>
      <div class="ad-card">
        <h2 class="ad-card-title">Schedule</h2>
        <dl class="ad-dl">
          <dt>Shop</dt><dd>Platform shop</dd>
          <dt>Service</dt><dd>${escapeHtml(booking.serviceName || '—')}</dd>
          <dt>Barber</dt><dd>${escapeHtml(booking.barberName || '—')}</dd>
          <dt>Date</dt><dd>${formatDateShort(fromISO(booking.dateISO))}</dd>
          <dt>Start</dt><dd>${minutesToLabel(booking.startMinute)}</dd>
          <dt>End</dt><dd>${minutesToLabel(endMinute)}</dd>
          <dt>Duration</dt><dd>${escapeHtml(String(duration))} min</dd>
        </dl>
      </div>
    </div>

    <div class="ad-detail-grid">
      <div class="ad-card">
        <h2 class="ad-card-title">Summary</h2>
        <dl class="ad-dl">
          <dt>Booking status</dt><dd>${statusLabel(booking.status)}</dd>
          <dt>Payment status</dt><dd>${paymentStatusLabel(booking)}</dd>
          <dt>Service amount</dt><dd>${formatINR(booking.price)}</dd>
          <dt>Created</dt><dd>${formatDateTime(booking.createdAt)}</dd>
        </dl>
      </div>
      <div class="ad-card">
        <h2 class="ad-card-title">Advance & fee</h2>
        <p style="color:var(--text-muted);font-size:13px;margin-top:-4px;">Platform prototype rule per the PRD. Settlement is not yet implemented.</p>
        <dl class="ad-dl">
          <dt>Advance</dt><dd>${formatINR(10)}</dd>
          <dt>Platform fee</dt><dd>${formatINR(2)}</dd>
          <dt>Owner share</dt><dd>${formatINR(8)}</dd>
        </dl>
      </div>
    </div>

    <div class="ad-card">
      <h2 class="ad-card-title">Manage status</h2>
      ${transitions.length
        ? `<p style="color:var(--text-muted);font-size:14px;margin-bottom:14px;">Valid transitions from <strong>${statusLabel(booking.status)}</strong>:</p>
           <div style="display:flex;gap:10px;flex-wrap:wrap;">${transitions
             .map(
               (t) =>
                 `<button class="ad-btn ad-btn-ghost ad-btn-sm" data-transition="${escapeHtml(t)}" type="button">Mark ${statusLabel(t)}</button>`
             )
             .join('')}</div>`
        : `<p style="color:var(--text-muted);font-size:14px;">This booking is in a final state (<strong>${statusLabel(booking.status)}</strong>) and cannot be changed.</p>`}
    </div>`;

  content.querySelectorAll('[data-transition]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const target = btn.dataset.transition;
      const ok = await window.adConfirm({
        title: `Mark as ${statusLabel(target)}?`,
        message: `Move booking ${booking.id} to "${statusLabel(target)}"?`,
        okText: 'Confirm',
      });
      if (!ok) return;
      const result = setBookingStatus(booking.id, target);
      if (result.ok) {
        toast(`Booking marked ${target}.`);
        renderDetail(booking.id);
      } else {
        toast(result.error || 'Invalid transition.', 'warn');
      }
    });
  });
}

function paymentStatusLabel(booking) {
  // Current prototype data model has no persisted payment-status field;
  // show a neutral label rather than fabricated state.
  const s = booking.paymentStatus;
  return s ? statusLabel(s) : 'Advance due (settlement stub)';
}
