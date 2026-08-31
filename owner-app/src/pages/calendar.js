/* =============================================================
   Owner App — Calendar Page (single-column daily schedule)
   Shop-based timeline: shows confirmed/pending bookings by time.
   ============================================================= */
import { getBookings, getShopConfig, isHoliday, formatSlotTime, periodLabel } from '../data.js';
import { escapeHtml, toISO, formatDateLong, minutesTo24, formatINR } from '../utils.js';
import { openBookingModal, statusClass } from '../booking-modal.js';

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function mount(app) {
  let currentDate = new Date();
  render(app, currentDate);

  app.addEventListener('click', e => {
    const nav = e.target.closest('#cal-prev, #cal-next, #cal-today');
    if (nav) {
      if (nav.id === 'cal-prev') currentDate.setDate(currentDate.getDate() - 1);
      else if (nav.id === 'cal-next') currentDate.setDate(currentDate.getDate() + 1);
      else currentDate = new Date();
      render(app, currentDate);
    }
  });
}

function render(app, date) {
  const dateISO = toISO(date);
  const shop = getShopConfig();
  const dayKey = DAY_NAMES[date.getDay()];
  const dayCfg = (shop.workingHours || {})[dayKey] || { open: false, start: '09:00', end: '21:00' };

  const bookings = getBookings()
    .filter(b => b.shopId === shop.id && b.dateISO === dateISO && b.status !== 'cancelled' && b.status !== 'declined')
    .sort((a, b) => (a.startMinute ?? 1440) - (b.startMinute ?? 1440));

  const closed = !dayCfg.open || isHoliday(dateISO);

  // Build hour guide from shop hours (or default 8AM–10PM)
  let minTime = 8 * 60, maxTime = 22 * 60;
  if (dayCfg.open && dayCfg.start && dayCfg.end) {
    const [h1, m1] = dayCfg.start.split(':').map(Number);
    const [h2, m2] = dayCfg.end.split(':').map(Number);
    minTime = Math.min(minTime, h1 * 60 + m1);
    maxTime = Math.max(maxTime, h2 * 60 + m2);
  }
  minTime = Math.floor(minTime / 60) * 60;
  maxTime = Math.ceil(maxTime / 60) * 60;
  const hours = [];
  for (let t = minTime; t <= maxTime; t += 60) hours.push(t);

  const pxPerMin = 52 / 60;
  const hh = maxTime - minTime;

  app.innerHTML = `
    <div class="ow-page-header">
      <div>
        <h1 class="ow-page-title">Calendar</h1>
        <p class="ow-page-sub">Daily schedule overview</p>
      </div>
      <div class="ow-flex-center ow-gap-8">
        <button class="ow-btn ow-btn-secondary ow-btn-sm ripple" id="cal-today">Today</button>
        <div class="ow-flex-center">
          <button class="ow-btn ow-btn-secondary ow-btn-icon" style="border-radius:var(--radius-sm) 0 0 var(--radius-sm);" id="cal-prev">‹</button>
          <div style="padding:0 16px; min-height:44px; display:flex; align-items:center; font-size:0.875rem; font-weight:600;">${formatDateLong(date)}</div>
          <button class="ow-btn ow-btn-secondary ow-btn-icon" style="border-radius:0 var(--radius-sm) var(--radius-sm) 0;" id="cal-next">›</button>
        </div>
      </div>
    </div>

    ${closed ? `
    <div class="ow-card" style="text-align:center; padding:40px 20px; color:var(--danger); font-weight:600;">
      Shop is closed on this day according to your working hours.
    </div>` : `
    <div class="ow-card" style="padding:0; overflow-x:auto; position:relative; display:flex; flex-direction:column;">
      <div style="display:flex; height:${hh * pxPerMin}px;">
        <div class="ow-cal-times" style="width:56px; border-right:1px solid var(--border); position:relative;">
          ${hours.slice(0,-1).map(h => `<div class="ow-cal-slot" style="position:absolute; top:${(h-minTime)*pxPerMin}px; right:6px;">${minutesTo24(h)}</div>`).join('')}
        </div>
        <div style="flex:1; position:relative;">
          ${hours.slice(0,-1).map(h => `<div style="position:absolute; left:0; right:0; top:${(h-minTime)*pxPerMin}px; height:${pxPerMin*60}px; border-top:1px solid var(--border);"></div>`).join('')}
          ${bookings.map(b => renderEvent(b, minTime)).join('')}
        </div>
      </div>
    </div>`}
  `;

  app.addEventListener('click', e => {
    const ev = e.target.closest('.ow-cal-event');
    if (ev) openBookingModal(ev.dataset.bookingId);
  });
}

function renderEvent(b, minTime) {
  const pxPerMin = 52 / 60;
  const top = ((b.startMinute ?? minTime) - minTime) * pxPerMin;
  const height = Math.max(24, (b.duration || 30) * pxPerMin);

  let bgCol = 'rgba(255,122,89,0.15)', borderCol = '#ff7a59', textCol = '#2a2a2a';
  if (b.status === 'confirmed') { bgCol = 'rgba(56,182,255,0.15)'; borderCol = '#38b6ff'; textCol = '#2a2a2a'; }
  if (b.status === 'pending')  { bgCol = 'rgba(255,122,89,0.15)'; borderCol = '#ff7a59'; textCol = '#2a2a2a'; }
  if (b.status === 'completed'){ bgCol = 'rgba(90,210,154,0.15)'; borderCol = '#0f9d74'; textCol = '#0f9d74'; }
  if (b.status === 'no-show')  { bgCol = 'rgba(245,178,1,0.15)'; borderCol = '#f5b201'; textCol = '#8a6a00'; }

  return `
    <div class="ow-cal-event" data-booking-id="${b.id}" tabindex="0" role="button"
         style="position:absolute; left:4px; right:4px; top:${top}px; height:${height}px; background:${bgCol}; border-left:3px solid ${borderCol}; color:${textCol}; padding:4px 8px; overflow:hidden;">
      <strong style="display:block; font-size:0.8rem;">${formatSlotTime(b.startMinute)} · ${escapeHtml(b.customerName)}</strong>
      <span style="font-size:0.72rem; opacity:0.85;">${escapeHtml(b.serviceName)}</span>
    </div>
  `;
}
