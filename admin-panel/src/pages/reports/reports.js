/* =============================================================
   Admin Panel — Reports
   BASIC prototype reports driven by actual data only.
   No fake charts. Empty collections show empty-state counters.
   ============================================================= */
import {
  getPlatformStats,
  getBookings,
  getShops,
} from '../../data.js';
import { escapeHtml, formatDateShort, fromISO } from '../../utils.js';
import { emptyState } from '../../ui.js';

export function mountReports() {
  const content = document.getElementById('ad-content');
  const stats = getPlatformStats();
  const bookings = getBookings();
  const shops = getShops();

  const bookingsByDate = aggregate(bookings, 'dateISO');
  const bookingsByStatus = aggregate(bookings, 'status');
  const shopsByStatus = aggregate(shops, 'status');

  content.innerHTML = `
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">Reports</h1>
        <p class="ad-page-sub">Basic platform reports derived from actual data.</p>
      </div>
    </div>

    <div class="ad-report-row">
      ${counter('Customers', stats.totalCustomers)}
      ${counter('Active shops', stats.activeShops)}
      ${counter('Active barbers', stats.activeBarbers)}
      ${counter('Active services', stats.activeServices)}
      ${counter('Total bookings', stats.totalBookings)}
    </div>

    <div class="ad-detail-grid">
      <div class="ad-card">
        <h2 class="ad-card-title">Bookings by status</h2>
        ${barList(bookingsByStatus, statusColor)}
      </div>
      <div class="ad-card">
        <h2 class="ad-card-title">Shops by status</h2>
        ${barList(shopsByStatus, shopStatusColor)}
      </div>
    </div>

    <div class="ad-card">
      <h2 class="ad-card-title">Bookings by date</h2>
      ${bookings.length ? barList(fromObj(bookingsByDate, (d) => formatDateShort(fromISO(d))), () => '') : emptyState('📈', 'No booking data yet', 'Bookings-by-date trends will appear once bookings exist.')}
    </div>`;
}

function counter(label, value) {
  return `
    <div class="ad-stat-card">
      <span class="ad-stat-value">${Number(value || 0)}</span>
      <span class="ad-stat-label">${escapeHtml(label)}</span>
    </div>`;
}

function aggregate(list, key) {
  const map = {};
  for (const item of list) {
    const k = item[key] || '(unknown)';
    map[k] = (map[k] || 0) + 1;
  }
  return map;
}

function fromObj(obj, labelFn) {
  const entries = Object.entries(obj).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return entries.map(([k, v]) => ({
    label: labelFn ? labelFn(k) : cap(k),
    value: v,
    pct: Math.round((v / max) * 100),
  }));
}

function barList(mapOrArr, colorFn) {
  const arr = Array.isArray(mapOrArr) ? mapOrArr : Object.entries(mapOrArr).map(([k, v]) => ({ label: cap(k), value: v }));
  const max = Math.max(1, ...arr.map((a) => a.value));
  const items = arr.map((a) => ({
    ...a,
    pct: Math.round((a.value / max) * 100),
  }));
  if (!items.length) {
    return emptyState('📊', 'No data', 'There is no data for this report yet.');
  }
  return `
    <div class="ad-bar-list">
      ${items
        .map(
          (it) => `
        <div class="ad-bar-row">
          <span class="ad-bar-label">${escapeHtml(it.label)}</span>
          <div class="ad-bar-track"><div class="ad-bar-fill" style="width:${it.pct}%;${colorFn ? `background:${colorFn(it.label)};` : ''}"></div></div>
          <span class="ad-bar-value">${it.value}</span>
        </div>`
        )
        .join('')}
    </div>`;
}

function cap(s) {
  return String(s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(label) {
  const map = {
    Pending: '#f5b201',
    Confirmed: '#38b6ff',
    Completed: '#22c55e',
    'No Show': '#ef4444',
    Cancelled: '#6a6f93',
  };
  return map[label] || '#7c5cff';
}

function shopStatusColor(label) {
  const map = {
    Pending: '#f5b201',
    Active: '#22c55e',
    Suspended: '#ef4444',
    Inactive: '#6a6f93',
  };
  return map[label] || '#7c5cff';
}
