/* =============================================================
   Admin Panel — Payments
   Platform payment visibility only.
   PRD rule: advance ₹10 · platform fee ₹2 · owner share ₹8.
   The payment gateway and settlement remain STUBBED in this
   phase — we do NOT claim real settlement is implemented.
   ============================================================= */
import { getBookings, getShops } from '../../data.js';
import { escapeHtml, formatINR, formatDateShort, fromISO, debounce } from '../../utils.js';
import { pill, emptyState } from '../../ui.js';

export const ADVANCE = 10;
export const PLATFORM_FEE = 2;
export const OWNER_SHARE = 8;

export function mountPayments() {
  const content = document.getElementById('ad-content');
  const shops = getShops();
  const bookings = getBookings();

  content.innerHTML = `
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">Payments</h1>
        <p class="ad-page-sub">Platform payment visibility. Gateway & settlement are stubbed in this phase.</p>
      </div>
    </div>

    <div class="ad-stat-grid" style="margin-bottom:20px;">
      ${statCard('💵', formatINR(bookings.length * ADVANCE), 'Total advance (expected)')}
      ${statCard('🏢', formatINR(bookings.length * PLATFORM_FEE), 'Platform fee (expected)')}
      ${statCard('🏪', formatINR(bookings.length * OWNER_SHARE), 'Owner share (expected)')}
      ${statCard('🔒', 'Stubbed', 'Payment gateway')}
    </div>

    <div class="ad-card">
      <p style="color:var(--text-muted);font-size:13px;margin:0 0 12px;">
        Per the Ordinens Tech PRD: the customer pays a ₹10 advance, the platform fee is ₹2 and the owner receives ₹8. The final balance is settled in cash at the shop. No real gateway or settlement is implemented in this prototype.
      </p>
      <div class="ad-toolbar">
        <input class="ad-input ad-search" id="pay-search" type="search" placeholder="Search booking ID or customer" aria-label="Search payments" />
        <input class="ad-input" id="pay-date" type="date" aria-label="Filter by date" />
        <select class="ad-select" id="pay-shop" aria-label="Filter by shop">
          <option value="">All shops</option>
          ${shops.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
        </select>
        <select class="ad-select" id="pay-status" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="paid">Advance paid</option>
          <option value="unpaid">Advance due</option>
        </select>
      </div>

      <div class="ad-table-wrap">
        <table class="ad-table">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Customer</th>
              <th>Shop</th>
              <th>Amount (advance)</th>
              <th>Platform fee</th>
              <th>Owner share</th>
              <th>Payment type</th>
              <th>Payment status</th>
            </tr>
          </thead>
          <tbody id="pay-tbody"></tbody>
        </table>
      </div>
      <div id="pay-cards" class="ad-table-cards"></div>
      <div id="pay-empty" style="display:none;"></div>
    </div>`;

  const apply = () => {
    const q = (document.getElementById('pay-search').value || '').toLowerCase();
    const date = document.getElementById('pay-date').value;
    const status = document.getElementById('pay-status').value;

    let rows = getBookings();
    if (q) {
      rows = rows.filter(
        (b) =>
          (b.id || '').toLowerCase().includes(q) ||
          (b.customerName || '').toLowerCase().includes(q)
      );
    }
    if (date) rows = rows.filter((b) => b.dateISO === date);
    if (status) {
      rows = rows.filter((b) => {
        const isPaid = b.advancePaid === true || b.paymentStatus === 'paid';
        return status === 'paid' ? isPaid : !isPaid;
      });
    }
    rows.sort((a, b) => (b.dateISO || '').localeCompare(a.dateISO || ''));

    document.getElementById('pay-tbody').innerHTML = rows.length
      ? rows.map(payRow).join('')
      : `<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px;">No payments found.</td></tr>`;
    document.getElementById('pay-cards').innerHTML = rows.length ? rows.map(payCard).join('') : '';
    document.getElementById('pay-empty').style.display = rows.length ? 'none' : 'block';
    document.getElementById('pay-empty').innerHTML = emptyState(
      '💳',
      'No payments available',
      'Payment records will appear here once bookings exist.'
    );
  };

  document.getElementById('pay-search').addEventListener('input', debounce(apply, 200));
  document.getElementById('pay-date').addEventListener('change', apply);
  document.getElementById('pay-shop').addEventListener('change', apply);
  document.getElementById('pay-status').addEventListener('change', apply);

  apply();
}

function payRow(b) {
  const isPaid = b.advancePaid === true || b.paymentStatus === 'paid';
  return `
    <tr>
      <td><strong>${escapeHtml(b.id)}</strong></td>
      <td><strong>${escapeHtml(b.customerName || '—')}</strong></td>
      <td>Platform shop</td>
      <td>${formatINR(ADVANCE)}</td>
      <td>${formatINR(PLATFORM_FEE)}</td>
      <td>${formatINR(OWNER_SHARE)}</td>
      <td>Advance</td>
      <td>${pill(isPaid ? 'Paid' : 'Due', isPaid ? 'ad-pill-ok' : 'ad-pill-warn')}</td>
    </tr>`;
}

function payCard(b) {
  const isPaid = b.advancePaid === true || b.paymentStatus === 'paid';
  return `
    <div class="ad-table-card">
      <div class="ad-tc-title">
        <span>${escapeHtml(b.id)} · ${escapeHtml(b.customerName || '—')}</span>
        ${pill(isPaid ? 'Paid' : 'Due', isPaid ? 'ad-pill-ok' : 'ad-pill-warn')}
      </div>
      <div class="ad-tc-grid">
        <div class="ad-tc-item"><span>Advance</span>${formatINR(ADVANCE)}</div>
        <div class="ad-tc-item"><span>Platform fee</span>${formatINR(PLATFORM_FEE)}</div>
        <div class="ad-tc-item"><span>Owner share</span>${formatINR(OWNER_SHARE)}</div>
        <div class="ad-tc-item"><span>Type</span>Advance</div>
        <div class="ad-tc-item"><span>Date</span>${formatDateShort(fromISO(b.dateISO))}</div>
      </div>
    </div>`;
}

function statCard(icon, value, label) {
  return `
    <div class="ad-stat-card">
      <span class="ad-stat-icon" aria-hidden="true">${icon}</span>
      <span class="ad-stat-value">${value}</span>
      <span class="ad-stat-label">${label}</span>
    </div>`;
}
