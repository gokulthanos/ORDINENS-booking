/* =============================================================
   Owner App — Shared Booking Modal (Dashboard & Bookings)
   Renders booking details + time-allocation/confirm/decline UI.
   ============================================================= */
import {
  getBooking, getShopConfig, getService,
  generateOwnerSlots, allocateAndConfirm, declineBooking,
  formatSlotTime, periodLabel
} from './data.js';
import { escapeHtml, formatINR, formatDateShort, toast } from './utils.js';

export function openBookingModal(id, onChanged) {
  const b = getBooking(id);
  if (!b) return;
  const shop = getShopConfig();
  const service = getService(b.serviceId) || { name: b.serviceName, duration: b.duration || 30, price: b.price };

  const container = document.createElement('div');
  container.className = 'ow-modal-backdrop';
  container.id = 'ow-shared-booking-modal';
  container.setAttribute('data-ow-modal', '');
  container.innerHTML = `
    <div class="ow-modal" role="dialog" aria-modal="true" aria-labelledby="owm-title">
      <div class="ow-modal-header">
        <h2 class="ow-modal-title" id="owm-title">Booking Details</h2>
        <button class="ow-modal-close" type="button" data-ow-close aria-label="Close">✕</button>
      </div>
      <div id="owm-body"></div>
    </div>`;

  container.querySelector('[data-ow-close]').addEventListener('click', () => container.remove());
  container.addEventListener('click', e => { if (e.target === container) container.remove(); });
  document.body.appendChild(container);

  const body = container.querySelector('#owm-body');
  const renderBody = () => {
    const current = getBooking(id);
    if (!current) { container.remove(); return; }
    body.innerHTML = buildBody(current, shop, service);
  };
  renderBody();

  body.addEventListener('click', e => {
    const closeBtn = e.target.closest('[data-ow-close]');
    if (closeBtn) { container.remove(); return; }
    const timeBtn = e.target.closest('[data-pick-time]');
    if (timeBtn) {
      body.querySelectorAll('[data-pick-time]').forEach(btn => btn.classList.remove('selected'));
      timeBtn.classList.add('selected');
      const confirmBtn = body.querySelector('[data-ow-action][data-action="confirm"]');
      if (confirmBtn) confirmBtn.dataset.time = timeBtn.dataset.pickTime;
      return;
    }
    const act = e.target.closest('[data-ow-action]');
    if (!act) return;
    const { action, time } = act.dataset;
    const current = getBooking(id);
    if (action === 'decline') {
      declineBooking(id);
      toast('Booking declined');
    } else if (action === 'confirm') {
      const startMinute = Number(time);
      if (Number.isNaN(startMinute) || startMinute == null) {
        toast('Please select a time to confirm.', 'warn');
        return;
      }
      const res = allocateAndConfirm(id, startMinute);
      if (res.ok) toast('Booking confirmed');
      else if (res.reason === 'unavailable') toast('That time is no longer available — pick another time.', 'warn');
      else toast('Booking can no longer be confirmed.', 'warn');
    }
    renderBody();
    if (onChanged) onChanged();
  });
}

function buildBody(b, shop, service) {
  const allocationUI = b.status === 'pending' ? renderAllocation(b, shop, service) : '';

  return `
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="ow-badge ${statusClass(b.status)}" style="font-size:0.8rem;">${b.status.toUpperCase()}</span>
        <span style="font-size:0.75rem; color:var(--text-muted);">#${escapeHtml(b.id)}</span>
      </div>

      <div class="ow-card ow-card-sm" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div><div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:2px;">REQ PERIOD</div>
          <strong>${periodLabel(b.period)}</strong></div>
        <div><div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:2px;">DATE</div>
          <strong>${formatDateShort(new Date(b.dateISO))}</strong></div>
        <div><div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:2px;">TIME</div>
          <strong>${b.status === 'pending' ? 'Not allocated' : formatSlotTime(b.startMinute)}</strong></div>
        <div><div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:2px;">CUSTOMER ID</div>
          <strong>${escapeHtml(b.customerIdentifier || b.customerPhone || b.customerName)}</strong></div>
        <div><div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:2px;">SERVICE</div>
          <strong>${escapeHtml(b.serviceName)}</strong></div>
        <div><div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:2px;">PRICE</div>
          <strong>${formatINR(b.price)}</strong></div>
      </div>

      ${b.customerName ? `<div class="ow-card ow-card-sm">
        <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:4px;">CUSTOMER</div>
        <p style="font-size:0.85rem;">${escapeHtml(b.customerName)} · ${escapeHtml(b.customerPhone || '')}</p>
      </div>` : ''}

      ${b.customerNote ? `<div class="ow-card ow-card-sm">
        <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:4px;">NOTES</div>
        <p style="font-size:0.85rem;">${escapeHtml(b.customerNote)}</p>
      </div>` : ''}

      ${allocationUI}
    </div>`;
}

function renderAllocation(b, shop, service) {
  const slots = generateOwnerSlots({ shop, service, dateISO: b.dateISO, period: b.period, ignoreBookingId: b.id });

  if (!slots.length) {
    return `
      <div class="ow-card ow-card-sm" style="border-left:3px solid var(--warn);">
        <div style="font-size:0.75rem; font-weight:700; margin-bottom:6px;">NO AVAILABLE TIMES</div>
        <p style="font-size:0.82rem; color:var(--text-muted); margin:0 0 12px;">
          No working time is available for this request in the ${periodLabel(b.period).toLowerCase()} period
          (check hours, breaks and capacity). You can decline this booking.
        </p>
        <button class="ow-btn ow-btn-danger ow-btn-sm ripple" type="button" data-ow-action data-action="decline">Decline Booking</button>
      </div>`;
  }

  return `
    <div class="ow-card ow-card-sm">
      <div style="font-size:0.75rem; font-weight:700; margin-bottom:4px;">ALLOCATE TIME — ${periodLabel(b.period)}</div>
      <p style="font-size:0.78rem; color:var(--text-muted); margin:0 0 10px;">Choose an available slot below, then confirm.</p>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
        ${slots.map(t => `<button class="ow-time-chip" type="button" data-pick-time="${t}">${formatSlotTime(t)}</button>`).join('')}
      </div>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="ow-btn ow-btn-primary ow-btn-sm ripple" type="button" data-ow-action data-action="confirm" data-time="">Confirm & Allocate</button>
        <button class="ow-btn ow-btn-danger ow-btn-sm ripple" type="button" data-ow-action data-action="decline">Decline</button>
      </div>
    </div>`;
}

export function statusClass(s) {
  const map = { confirmed: 'status-confirmed', completed: 'status-completed', cancelled: 'status-cancelled', 'no-show': 'status-no-show', pending: 'status-pending', declined: 'status-declined' };
  return map[s] || 'ow-badge-muted';
}

export function statusIcon(s) {
  return { confirmed: '✓', completed: '✓', cancelled: '✕', 'no-show': '!', pending: '•', declined: '–' }[s] || '';
}
