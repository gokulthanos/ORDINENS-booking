import { formatINR, formatDateLong, fromISO, escapeHtml } from '../utils.js';
import { getBookings, formatSlotTime } from '../data.js';
import { currentUser } from '../auth.js';

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined',
};

export default function mountBookings(root) {
  const list = document.getElementById('bookings-list');
  const tabs = document.getElementById('bookings-tabs');
  if (!list) return;

  const user = currentUser();
  const identifier = user?.identifier?.toLowerCase();

  let filter = 'all';

  function myBookings() {
    let rows = getBookings();
    if (identifier) {
      const mine = rows.filter(
        (b) =>
          (b.customerIdentifier && String(b.customerIdentifier).toLowerCase() === identifier) ||
          (b.customerPhone && String(b.customerPhone).toLowerCase() === identifier)
      );
      if (mine.length) rows = mine;
    }
    return rows.sort((a, b) => (a.dateISO < b.dateISO ? 1 : -1));
  }

  function render() {
    let rows = myBookings();
    if (filter === 'pending') rows = rows.filter((b) => b.status === 'pending');
    else if (filter === 'confirmed') rows = rows.filter((b) => b.status === 'confirmed' || b.status === 'completed');
    else if (filter === 'past') rows = rows.filter((b) => b.status === 'cancelled' || b.status === 'declined' || b.status === 'completed');

    if (!rows.length) {
      list.innerHTML = `
        <div class="empty-state">
          <h3>No bookings here</h3>
          <p>You don't have any bookings in this view yet.</p>
        </div>`;
      return;
    }

    list.innerHTML = rows
      .map((b) => {
        const time = b.startMinute != null ? formatSlotTime(b.startMinute) : 'Time TBD';
        return `
        <article class="booking-card">
          <div class="booking-card-head">
            <h3>${escapeHtml(b.serviceName)}</h3>
            <span class="status-badge st-${b.status}">${STATUS_LABEL[b.status] || b.status}</span>
          </div>
          <p class="booking-shop">${escapeHtml(b.shopName || 'Shop')}</p>
          <p class="booking-meta">${formatDateLong(fromISO(b.dateISO))}</p>
          <p class="booking-meta">Preferred: ${capitalize(b.period || '—')} &middot; Time: ${time}</p>
          <div class="booking-card-foot">
            <strong>${formatINR(b.price)}</strong>
            ${b.status === 'confirmed' ? '<span class="confirm-note">Please arrive at your allocated time.</span>' : ''}
          </div>
        </article>`;
      })
      .join('');
  }

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    filter = btn.dataset.tab;
    tabs.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === btn));
    render();
  });

  render();
}

function capitalize(s) {
  return String(s || '')
    .split(/[-_ ]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
