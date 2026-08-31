/* =============================================================
   Owner App — Bookings List Page
   Shop-based: customer requests with requested date & preferred
   period. Pending bookings can be confirmed (with time allocation)
   or declined by the owner.
   ============================================================= */
import { getBookings, getShopConfig, formatSlotTime, periodLabel } from '../data.js';
import { escapeHtml, formatDateShort } from '../utils.js';
import { openBookingModal, statusClass } from '../booking-modal.js';

export default function mount(app) {
  render(app);
}

const TABS = ['all', 'pending', 'confirmed', 'declined', 'past'];

function render(app, filterStatus = 'all') {
  const shop = getShopConfig();
  const allBookings = getBookings()
    .filter(b => b.shopId === shop.id)
    .sort((a, b) => {
      if (a.dateISO !== b.dateISO) return a.dateISO < b.dateISO ? -1 : 1;
      return (a.startMinute ?? 1440) - (b.startMinute ?? 1440);
    });

  const filtered = filterStatus === 'all' ? allBookings
    : filterStatus === 'pending' ? allBookings.filter(b => b.status === 'pending')
    : filterStatus === 'confirmed' ? allBookings.filter(b => b.status === 'confirmed')
    : filterStatus === 'declined' ? allBookings.filter(b => b.status === 'declined')
    : allBookings.filter(b => !['pending', 'confirmed'].includes(b.status));

  const counts = { all: allBookings.length, pending: 0, confirmed: 0, declined: 0, past: 0 };
  for (const b of allBookings) {
    if (b.status === 'pending') counts.pending++;
    else if (b.status === 'confirmed') counts.confirmed++;
    else if (b.status === 'declined') counts.declined++;
    else counts.past++;
  }

  app.innerHTML = `
    <div class="ow-page-header">
      <div>
        <h1 class="ow-page-title">Bookings</h1>
        <p class="ow-page-sub">Review customer requests, allocate times and confirm.</p>
      </div>
    </div>

    <div class="ow-tabs">
      ${TABS.map(s => `
        <button class="ow-tab ${filterStatus === s ? 'active' : ''}" data-filter="${s}">
          ${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s]})
        </button>
      `).join('')}
    </div>

    <div class="ow-card" style="padding:0; overflow:hidden;">
      ${filtered.length ? filtered.map(b => `
        <div class="ow-booking-row" data-booking-id="${b.id}" tabindex="0" role="button">
          <div class="ow-booking-time">
            ${formatDateShort(new Date(b.dateISO))}<br>
            <span style="color:var(--text);">${b.status === 'pending' ? periodLabel(b.period) : formatSlotTime(b.startMinute)}</span>
          </div>
          <div class="ow-booking-info">
            <strong>${escapeHtml(b.customerName)}</strong>
            <span>${escapeHtml(b.serviceName)} · ${periodLabel(b.period)}</span>
          </div>
          <span class="ow-badge ${statusClass(b.status)}">${b.status}</span>
        </div>
      `).join('') : `
        <div class="ow-empty">
          <div class="ow-empty-title">No bookings found</div>
        </div>
      `}
    </div>`;

  app.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => render(app, btn.dataset.filter));
  });

  app.addEventListener('click', e => {
    const row = e.target.closest('.ow-booking-row');
    if (row) {
      openBookingModal(row.dataset.bookingId, () => render(app, filterStatus));
    }
  });
}
