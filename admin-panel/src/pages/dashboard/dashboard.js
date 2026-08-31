/* =============================================================
   Admin Panel — Dashboard
   First screen after admin login. Shows today's platform
   activity, key statistics and recent bookings — all from
   ACTUAL data (0 / empty states when unavailable).
   ============================================================= */
import { getPlatformStats, getRecentBookings } from '../../data.js';
import { greeting, formatDateLong, minutesToLabel, fromISO, escapeHtml } from '../../utils.js';
import { pill, statusClass } from '../../ui.js';

export function mountDashboard() {
  const content = document.getElementById('ad-content');
  const stats = getPlatformStats();
  const recent = getRecentBookings(8);

  content.innerHTML = `
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">${greeting()}, Admin</h1>
        <p class="ad-page-sub">${formatDateLong(new Date())}</p>
      </div>
    </div>

    <div class="ad-stat-grid" id="ad-dash-stats">
      ${statCard('👥', stats.totalCustomers, 'Total Customers')}
      ${statCard('🏪', stats.totalShops, 'Total Shops')}
      ${statCard('✅', stats.activeShops, 'Active Shops')}
      ${statCard('💈', stats.totalBarbers, 'Total Barbers')}
      ${statCard('✂', stats.totalServices, 'Total Services')}
      ${statCard('📋', stats.totalBookings, 'Total Bookings')}
      ${statCard('🕒', stats.todayBookings, "Today's Bookings")}
      ${statCard('⏳', stats.pendingBookings, 'Pending Bookings')}
      ${statCard('✔️', stats.completedBookings, 'Completed Bookings')}
      ${statCard('❌', stats.cancelledBookings, 'Cancelled Bookings')}
    </div>

    <div class="ad-card">
      <h2 class="ad-card-title">Recent Bookings</h2>
      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Customer</th>
              <th>Shop</th>
              <th>Service</th>
              <th>Barber</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${recent.length
              ? recent.map(bookingRow).join('')
              : `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:32px;">No bookings yet.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${recent.length ? cardFallback(recent.map(bookingCard).join('')) : ''}
    </div>`;
}

function statCard(icon, value, label) {
  return `
    <div class="ad-stat-card">
      <span class="ad-stat-icon" aria-hidden="true">${icon}</span>
      <span class="ad-stat-value">${Number(value || 0)}</span>
      <span class="ad-stat-label">${label}</span>
    </div>`;
}

function formatDate(dateISO) {
  try {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(fromISO(dateISO));
  } catch {
    return dateISO || '—';
  }
}

function bookingRow(b) {
  return `
    <tr>
      <td><strong>${escapeHtml(b.id)}</strong></td>
      <td><strong>${escapeHtml(b.customerName || '—')}</strong></td>
      <td>—</td>
      <td>${escapeHtml(b.serviceName || '—')}</td>
      <td>${escapeHtml(b.barberName || '—')}</td>
      <td>${formatDate(b.dateISO)}</td>
      <td>${minutesToLabel(b.startMinute)}</td>
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
        <div class="ad-tc-item"><span>Date</span>${formatDate(b.dateISO)}</div>
        <div class="ad-tc-item"><span>Time</span>${minutesToLabel(b.startMinute)}</div>
      </div>
      <div style="margin-top:10px;"><a class="ad-btn ad-btn-ghost ad-btn-sm" href="#admin/bookings/${escapeHtml(b.id)}">View booking</a></div>
    </div>`;
}

function cardFallback(inner) {
  return `<div class="ad-table-cards hidden-table-cards">${inner}</div>`;
}
