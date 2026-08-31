import { formatINR, formatDateLong, fromISO } from '../utils.js';
import { formatSlotTime } from '../data.js';

export default function mountConfirmation() {
  const raw = sessionStorage.getItem('pt_last_booking');
  if (!raw) {
    location.hash = '#home';
    return;
  }
  let booking;
  try {
    booking = JSON.parse(raw);
  } catch {
    location.hash = '#home';
    return;
  }
  if (!booking) {
    location.hash = '#home';
    return;
  }

  const confirmed = booking.status === 'confirmed' || booking.status === 'completed';

  const title = document.getElementById('confirm-title');
  const subtitle = document.getElementById('confirm-subtitle');
  if (title) title.textContent = confirmed ? 'Booking Confirmed' : 'Request sent';
  if (subtitle) {
    subtitle.textContent = confirmed
      ? 'Your appointment is confirmed.'
      : 'Your booking is pending the shop\u2019s confirmation.';
  }

  const icon = document.querySelector('.status-icon');
  if (icon) icon.className = `status-icon ${confirmed ? 'ok' : 'pending'}`;

  const details = document.getElementById('confirm-details');
  details.innerHTML = `
    <div class="detail-row"><span>Shop</span><strong>${booking.shopName || 'Shop'}</strong></div>
    ${booking.shopAddress ? `<div class="detail-row"><span>Address</span><strong>${booking.shopAddress}</strong></div>` : ''}
    <div class="detail-row"><span>Service</span><strong>${booking.serviceName}</strong></div>
    <div class="detail-row"><span>Date</span><strong>${formatDateLong(fromISO(booking.dateISO))}</strong></div>
    <div class="detail-row"><span>Preferred</span><strong>${capitalize(booking.period || '—')}</strong></div>
    <div class="detail-row"><span>Time</span><strong>${formatSlotTime(booking.startMinute)}</strong></div>
    <div class="detail-row"><span>Status</span><strong class="st-${booking.status}">${capitalize(booking.status)}</strong></div>
    <div class="detail-row totals"><span>Total</span><strong>${formatINR(booking.price)}</strong></div>
    ${
      confirmed
        ? '<p class="confirm-note">Please arrive at your allocated time.</p>'
        : '<p class="confirm-note">Please arrive at the time the shop confirms for you.</p>'
    }`;
}

function capitalize(s) {
  return String(s || '')
    .split(/[-_ ]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
