import { currentUser } from '../auth.js';
import {
  getShop,
  getShops,
  getService,
  addBooking,
  formatSlotTime,
  periodAvailability,
  shopOpenOn,
  PERIODS,
} from '../data.js';
import { formatINR, formatDateLong, toISO, escapeHtml, fromISO } from '../utils.js';

const state = {
  shopId: null,
  serviceId: null,
  dateISO: null,
  period: null,
  step: 1,
};

const KEY = 'pt_booking_state';

const PERIOD_LABEL = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

function persist() {
  sessionStorage.setItem(KEY, JSON.stringify(state));
}

function load() {
  try {
    Object.assign(state, JSON.parse(sessionStorage.getItem(KEY) || '{}'));
  } catch {
    /* ignore */
  }
}

function clearBooking() {
  sessionStorage.removeItem(KEY);
}

function setStep(n) {
  state.step = n;
  persist();
  renderStage();
  renderSummary();
}

export default function mountBooking(stage) {
  Object.assign(state, { shopId: null, serviceId: null, dateISO: null, period: null, step: 1 });
  load();

  try {
    const pick = JSON.parse(sessionStorage.getItem('pt_booking') || 'null');
    if (pick) {
      if (getShop(pick.shopId)) state.shopId = pick.shopId;
      state.serviceId = pick.serviceId || null;
      if (state.shopId) {
        state.step = state.serviceId ? 2 : 1;
      }
      sessionStorage.removeItem('pt_booking');
    }
  } catch {
    /* ignore */
  }

  const shopLabel = document.getElementById('booking-shop-label');
  if (shopLabel) {
    const shop = state.shopId ? getShop(state.shopId) : null;
    shopLabel.textContent = shop ? `Booking at ${shop.name}` : 'Choose a shop to start.';
  }

  renderStage();
  renderSummary();

  stage.addEventListener('click', onStageClick);
  document.getElementById('booking-summary').addEventListener('click', onSummaryClick);
}

function activeServices(shop) {
  return (shop?.services || []).filter((s) => s.active !== false);
}

function renderStage() {
  const stage = document.getElementById('booking-stage');
  const user = currentUser();
  let html = '';
  if (state.step === 1) html = stepShopService(user);
  else if (state.step === 2) html = stepDate();
  else if (state.step === 3) html = stepPeriod();
  else if (state.step === 4) html = stepDetails(user);
  stage.innerHTML = html;

  document.querySelectorAll('.booking-steps .step').forEach((t) => {
    const n = Number(t.dataset.stepTab);
    t.classList.toggle('active', n === state.step);
    t.classList.toggle('done', n < state.step);
    t.setAttribute('aria-selected', String(n === state.step));
  });

  if (state.step === 4) bindDetailsForm();
}

function stepShopService() {
  const shop = state.shopId ? getShop(state.shopId) : null;
  const shops = getShops().filter((s) => s.onboarded !== false && s.status !== 'closed');
  const services = shop ? activeServices(shop) : [];

  const shopSelect = `
    <h2 class="stage-title">Choose a shop</h2>
    <div class="select-list">
      ${shops
        .map(
          (s) => `
        <button type="button" class="select-item${s.id === state.shopId ? ' selected' : ''}" data-shop="${s.id}">
          <span class="select-main">
            <strong>${escapeHtml(s.name)}</strong>
            <span class="select-sub">${escapeHtml(s.area || s.location || '')}</span>
          </span>
          <span class="select-meta">&#10095;</span>
        </button>`
        )
        .join('')}
    </div>`;

  const serviceSelect = `
    <h2 class="stage-title">Choose a service</h2>
    <div class="select-list">
      ${services
        .map(
          (s) => `
        <button type="button" class="select-item${s.id === state.serviceId ? ' selected' : ''}" data-service="${s.id}">
          <span class="select-main">
            <strong>${escapeHtml(s.name)}</strong>
          </span>
          <span class="select-meta">
            <strong>${formatINR(s.price)}</strong>
          </span>
        </button>`
        )
        .join('')}
    </div>`;

  return shopSelect + (shop ? serviceSelect : '<p class="stage-sub">Select a shop to see its services.</p>');
}

function stepDate() {
  const shop = getShop(state.shopId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = '<h2 class="stage-title">Choose a date</h2>';
  html += '<p class="stage-sub">You can book for today, tomorrow or day after tomorrow.</p>';

  const dayCards = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = toISO(d);
    const open = shopOpenOn(shop, iso);
    const label =
      i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : 'Day after tomorrow';
    const weekday = d.toLocaleDateString('en-IN', { weekday: 'short' });
    const disabled = !open;

    dayCards.push(`
      <button type="button" class="date-card${iso === state.dateISO ? ' selected' : ''}${disabled ? ' disabled' : ''}"
        data-date="${iso}" ${disabled ? 'disabled' : ''}>
        <span class="date-label">${label}</span>
        <strong>${d.getDate()} ${d.toLocaleDateString('en-IN', { month: 'short' })}</strong>
        <span class="date-weekday">${weekday}</span>
        <span class="date-status">${disabled ? 'Closed' : 'Available'}</span>
      </button>`);
  }
  html += `<div class="date-grid">${dayCards.join('')}</div>`;
  return html;
}

function stepPeriod() {
  const shop = getShop(state.shopId);
  const service = getService(state.serviceId) || activeServices(shop).find((s) => s.id === state.serviceId);
  const avail = periodAvailability({ shop, service, dateISO: state.dateISO });

  let html = '<h2 class="stage-title">Choose a preferred period</h2>';
  html += '<p class="stage-sub">Pick morning, afternoon or evening. Your exact appointment time is confirmed by the shop.</p>';

  const statusText = { available: 'Available', limited: 'Limited', full: 'Full' };

  html += `<div class="period-grid">`;
  for (const period of PERIODS) {
    const st = avail[period];
    const disabled = st === 'full';
    html += `
      <button type="button" class="period-card${period === state.period ? ' selected' : ''}${disabled ? ' disabled' : ''}"
        data-period="${period}" ${disabled ? 'disabled' : ''}>
        <span class="period-name">${PERIOD_LABEL[period]}</span>
        <span class="period-status st-${st}">${statusText[st]}</span>
      </button>`;
  }
  html += '</div>';
  return html;
}

function stepDetails(user) {
  const shop = getShop(state.shopId);
  const shopServices = activeServices(shop);
  const service = shopServices.find((s) => s.id === state.serviceId) || getService(state.serviceId);
  return `
    <h2 class="stage-title">Your details</h2>
    <form id="details-form" novalidate>
      <div class="field">
        <label for="bk-name">Full name</label>
        <input id="bk-name" type="text" value="${escapeHtml(user?.name || '')}" required />
      </div>
      <div class="field">
        <label for="bk-phone">Phone number</label>
        <input id="bk-phone" type="tel" inputmode="tel" value="${escapeHtml(user?.identifier || '')}" placeholder="+91 98765 43210" required />
      </div>
      <div class="field">
        <label for="bk-notes">Notes (optional)</label>
        <textarea id="bk-notes" rows="3" placeholder="Hair preferences, allergies to products..."></textarea>
      </div>
      <p class="stage-sub">Your booking will be sent to ${escapeHtml(shop?.name || 'the shop')}. It stays pending until the shop confirms your appointment time.</p>
      <button class="btn btn-primary btn-block" type="submit">Request booking</button>
    </form>`;
}

function bindDetailsForm() {
  const form = document.getElementById('details-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('bk-name').value.trim();
    const phone = document.getElementById('bk-phone').value.trim();
    if (!name || !phone) return;

    const shop = getShop(state.shopId);
    const shopServices = activeServices(shop);
    const service = shopServices.find((s) => s.id === state.serviceId) || getService(state.serviceId);
    if (!shop || !service) return;

    const booking = addBooking({
      customerName: name,
      customerPhone: phone,
      customerNote: document.getElementById('bk-notes').value.trim(),
      customerIdentifier: currentUser()?.identifier || phone,
      shopId: shop.id,
      shopName: shop.name,
      shopAddress: shop.address,
      serviceId: service.id,
      serviceName: service.name,
      duration: service.duration,
      price: service.price,
      dateISO: state.dateISO,
      period: state.period,
      startMinute: null,
    });

    sessionStorage.setItem('pt_last_booking', JSON.stringify(booking));
    clearBooking();
    location.hash = '#confirmation';
  });
}

function onStageClick(e) {
  const shopBtn = e.target.closest('[data-shop]');
  if (shopBtn) {
    state.shopId = shopBtn.dataset.shop;
    state.serviceId = null;
    state.dateISO = null;
    state.period = null;
    const label = document.getElementById('booking-shop-label');
    const shop = getShop(state.shopId);
    if (label && shop) label.textContent = `Booking at ${shop.name}`;
    renderStage();
    renderSummary();
    return;
  }
  const serviceBtn = e.target.closest('[data-service]');
  if (serviceBtn) {
    state.serviceId = serviceBtn.dataset.service;
    state.dateISO = null;
    state.period = null;
    setStep(2);
    return;
  }
  const dateBtn = e.target.closest('[data-date]');
  if (dateBtn) {
    state.dateISO = dateBtn.dataset.date;
    state.period = null;
    setStep(3);
    return;
  }
  const periodBtn = e.target.closest('[data-period]');
  if (periodBtn) {
    state.period = periodBtn.dataset.period;
    setStep(4);
    return;
  }
  const nextBtn = e.target.closest('[data-step-next]');
  if (nextBtn && state.step === 4) {
    const form = document.getElementById('details-form');
    if (form) form.requestSubmit();
  }
}

function onSummaryClick(e) {
  const back = e.target.closest('[data-step-back]');
  if (back && state.step > 1) {
    setStep(state.step - 1);
    return;
  }
}

function renderSummary() {
  const summary = document.getElementById('booking-summary');
  if (!summary) return;

  if (state.step === 4) {
    summary.hidden = true;
    return;
  }
  summary.hidden = false;

  const shop = state.shopId ? getShop(state.shopId) : null;
  const service =
    (shop && activeServices(shop).find((s) => s.id === state.serviceId)) ||
    (state.serviceId ? getService(state.serviceId) : null);

  const parts = [];
  if (shop) parts.push(`<span class="sum-item">${escapeHtml(shop.name)}</span>`);
  if (service) parts.push(`<span class="sum-item">${escapeHtml(service.name)}</span>`);
  if (state.dateISO)
    parts.push(`<span class="sum-item">${formatDateLong(fromISO(state.dateISO))}</span>`);
  if (state.period)
    parts.push(`<span class="sum-item">${PERIOD_LABEL[state.period]}</span>`);

  const canNext = state.step === 1 && state.shopId && state.serviceId;

  const nextLabel = 'Choose date';

  summary.innerHTML = `
    <div class="sum-head">
      <span class="sum-title">Booking request</span>
      ${service ? `<span class="sum-price">${formatINR(service.price)}</span>` : ''}
    </div>
    <div class="sum-body">${parts.length ? `<div class="sum-parts">${parts.join('')}</div>` : '<p class="sum-empty">Nothing selected yet.</p>'}</div>
    <div class="sum-actions">
      ${state.step > 1 ? `<button class="btn btn-ghost btn-sm" type="button" data-step-back>Back</button>` : ''}
      ${canNext ? `<button class="btn btn-primary btn-sm" type="button" data-step-next>${nextLabel}</button>` : ''}
    </div>`;
}

export { state, clearBooking };
