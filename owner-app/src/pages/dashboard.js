/* =============================================================
   Owner App — Dashboard Page
   ============================================================= */
import { getShopConfig, getOwnerDashboardStats, formatSlotTime, periodLabel } from '../data.js';
import { escapeHtml, formatDateShort, toast } from '../utils.js';
import { openBookingModal, statusClass } from '../booking-modal.js';

export default function mount(app) {
  document.body.classList.remove('login-route');

  const config = getShopConfig();
  if (!config.onboarded) {
    location.hash = '#onboarding';
    return;
  }

  render(app);
}

function render(app) {
  const config = getShopConfig();
  const stats = getOwnerDashboardStats();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const shopName = config.name || 'Your Shop';

  const statusClassShop = config.status || 'open';
  const statusLabel = { open: 'OPEN', closed: 'CLOSED', temporarily_closed: 'TEMPORARILY CLOSED' }[statusClassShop] || 'OPEN';

  app.innerHTML = `
    <div class="ow-flex-between ow-gap-12" style="margin-bottom:20px; flex-wrap:wrap;">
      <div>
        <div style="font-size:0.8rem; color:var(--text-muted); font-weight:500; margin-bottom:2px;">${greeting}</div>
        <h1 class="ow-page-title">${escapeHtml(shopName)}</h1>
      </div>
      <div class="ow-flex-center ow-gap-8">
        <span class="ow-shop-status ${statusClassShop}" id="shop-status-badge">${statusLabel}</span>
        <button class="ow-btn ow-btn-secondary ow-btn-sm ripple" id="toggle-status-btn" type="button">
          ${statusClassShop === 'open' ? 'Close Shop' : 'Open Shop'}
        </button>
      </div>
    </div>

    <div class="ow-stat-grid" style="margin-bottom:20px;">
      <div class="ow-stat-tile">
        <div class="ow-stat-value">${stats.todayTotal}</div>
        <div class="ow-stat-label">Today's Bookings</div>
      </div>
      <div class="ow-stat-tile">
        <div class="ow-stat-value">${stats.pendingAll}</div>
        <div class="ow-stat-label">Pending Requests</div>
      </div>
      <div class="ow-stat-tile">
        <div class="ow-stat-value">${stats.todayUpcoming}</div>
        <div class="ow-stat-label">Upcoming Today</div>
      </div>
      <div class="ow-stat-tile">
        <div class="ow-stat-value">${stats.services}</div>
        <div class="ow-stat-label">Active Services</div>
      </div>
    </div>

    ${stats.nextBooking ? renderNextBooking(stats.nextBooking) : `
    <div class="ow-card" style="margin-bottom:20px; text-align:center; padding:24px;">
      <div style="font-weight:600; margin-bottom:4px;">No upcoming bookings today</div>
      <div style="font-size:0.82rem; color:var(--text-muted);">Your appointments will appear here.</div>
    </div>`}

    <div class="ow-section-title">Pending Requests</div>
    <div class="ow-card" style="padding:0; overflow:hidden; margin-bottom:20px;">
      ${stats.pendingBookings && stats.pendingBookings.length ? renderPendingList(stats.pendingBookings) : `
      <div class="ow-empty">
        <div class="ow-empty-title">No pending requests</div>
        <div class="ow-empty-sub">Customer booking requests needing your approval will appear here.</div>
      </div>`}
    </div>

    <div class="ow-section-title">Today's Bookings</div>
    <div class="ow-card" style="padding:0; overflow:hidden;">
      ${stats.todayBookings.length ? renderBookingList(stats.todayBookings) : `
      <div class="ow-empty">
        <div class="ow-empty-title">No bookings today</div>
      </div>`}
    </div>

    <div class="ow-section-title">Quick Actions</div>
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-bottom:24px;">
      <a href="#bookings" class="ow-card ow-card-link ow-card-sm" style="text-decoration:none;">
        <div style="font-size:0.82rem; font-weight:600;">Bookings</div>
        <div style="font-size:0.72rem; color:var(--text-muted);">Manage →</div>
      </a>
      <a href="#services" class="ow-card ow-card-link ow-card-sm" style="text-decoration:none;">
        <div style="font-size:0.82rem; font-weight:600;">${stats.services} Services</div>
        <div style="font-size:0.72rem; color:var(--text-muted);">Manage →</div>
      </a>
      <a href="#calendar" class="ow-card ow-card-link ow-card-sm" style="text-decoration:none;">
        <div style="font-size:0.82rem; font-weight:600;">Calendar</div>
        <div style="font-size:0.72rem; color:var(--text-muted);">View →</div>
      </a>
      <a href="#shop" class="ow-card ow-card-link ow-card-sm" style="text-decoration:none;">
        <div style="font-size:0.82rem; font-weight:600;">Shop Settings</div>
        <div style="font-size:0.72rem; color:var(--text-muted);">Configure →</div>
      </a>
    </div>`;

  document.getElementById('toggle-status-btn')?.addEventListener('click', () => {
    import('../data.js').then(({ patchShopConfig }) => {
      const current = getShopConfig().status || 'open';
      const next = current === 'open' ? 'closed' : 'open';
      patchShopConfig({ status: next });
      toast(next === 'open' ? 'Shop is now Open' : 'Shop is now Closed');
      render(app);
    });
  });

  app.addEventListener('click', e => {
    const row = e.target.closest('[data-booking-id]');
    if (row) openBookingModal(row.dataset.bookingId, () => render(app));
  });
}

function renderNextBooking(b) {
  const time = formatSlotTime(b.startMinute);
  return `
    <div class="ow-next-card" style="margin-bottom:20px;">
      <div>
        <div class="ow-next-label">Next Booking</div>
        <div class="ow-next-time">${time}</div>
        <div class="ow-next-name">${escapeHtml(b.customerName)}</div>
        <div class="ow-next-meta">${escapeHtml(b.serviceName)}</div>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
        <span class="ow-badge ${statusClass(b.status)}">${b.status}</span>
        <button class="ow-btn ow-btn-secondary ow-btn-sm" data-booking-id="${b.id}">View</button>
      </div>
    </div>`;
}

function renderPendingList(bookings) {
  return bookings.map(b => `
    <div class="ow-booking-row" data-booking-id="${b.id}" tabindex="0" role="button">
      <div class="ow-booking-time">
        ${periodLabel(b.period)}<br>
        <span style="color:var(--text);">${formatDateShort(new Date(b.dateISO))}</span>
      </div>
      <div class="ow-booking-info">
        <strong>${escapeHtml(b.customerName)}</strong>
        <span>${escapeHtml(b.serviceName)}</span>
      </div>
      <span class="ow-badge status-pending">pending</span>
    </div>`).join('');
}

function renderBookingList(bookings) {
  return bookings.map(b => `
    <div class="ow-booking-row" data-booking-id="${b.id}" tabindex="0" role="button">
      <div class="ow-booking-time">
        ${formatSlotTime(b.startMinute)}
      </div>
      <div class="ow-booking-info">
        <strong>${escapeHtml(b.customerName)}</strong>
        <span>${escapeHtml(b.serviceName)} · ${periodLabel(b.period)}</span>
      </div>
      <span class="ow-badge ${statusClass(b.status)}">${b.status}</span>
    </div>`).join('');
}
