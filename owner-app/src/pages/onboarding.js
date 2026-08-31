/* =============================================================
   Owner App — Onboarding Wizard (7 Steps)
   1 Shop Details | 2 Working Hours | 3 Breaks | 4 Number of Barbers
   5 Services | 6 Booking Rules | 7 Go Live
   ============================================================= */
import {
  getShopConfig, patchShopConfig,
  getServices, addService, deleteService
} from '../data.js';
import { escapeHtml, formatINR, toast, getDayName, getDayShort, uid } from '../utils.js';

const TOTAL_STEPS = 7;
let state = {};

function loadState() {
  try { state = JSON.parse(sessionStorage.getItem('ow_onboarding') || '{}'); } catch { state = {}; }
  state.step = state.step || 1;
}

function saveState() {
  sessionStorage.setItem('ow_onboarding', JSON.stringify(state));
}

export default function mount(app) {
  document.body.classList.remove('login-route');
  loadState();
  renderStep(app);
}

function renderStep(app) {
  saveState();
  const steps = {
    1: stepShopDetails,
    2: stepWorkingHours,
    3: stepBreaks,
    4: stepCapacity,
    5: stepServices,
    6: stepBookingRules,
    7: stepGoLive,
  };

  const fn = steps[state.step] || steps[1];
  app.innerHTML = `
    <div class="ow-wizard">
      <div class="ow-wizard-progress" role="progressbar"
           aria-valuenow="${state.step}" aria-valuemin="1" aria-valuemax="${TOTAL_STEPS}"
           aria-label="Step ${state.step} of ${TOTAL_STEPS}">
        ${Array.from({length: TOTAL_STEPS}, (_, i) => `
          <div class="ow-wizard-step ${i+1 < state.step ? 'done' : i+1 === state.step ? 'active' : ''}"></div>
        `).join('')}
      </div>
      <div id="ow-step-content"></div>
    </div>`;

  fn(document.getElementById('ow-step-content'), app);
}

/* ─── Navigation helpers ─────────────────────────────────────── */
function next(app) { state.step = Math.min(state.step + 1, TOTAL_STEPS); renderStep(app); }
function prev(app) { state.step = Math.max(state.step - 1, 1); renderStep(app); }

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function navButtons(app, { canNext = true, nextLabel = 'Continue →', skipFn = null } = {}) {
  return `
    <div class="ow-wizard-actions">
      ${state.step > 1
        ? `<button class="ow-btn ow-btn-ghost" type="button" id="wiz-back">← Back</button>`
        : `<span></span>`}
      <div style="display:flex; gap:8px; align-items:center;">
        ${skipFn ? `<button class="ow-btn ow-btn-ghost ow-btn-sm" type="button" id="wiz-skip">Skip for now</button>` : ''}
        ${canNext ? `<button class="ow-btn ow-btn-primary ripple" type="button" id="wiz-next">${nextLabel}</button>` : ''}
      </div>
    </div>`;
}

function bindNav(app, onNext) {
  document.getElementById('wiz-back')?.addEventListener('click', () => prev(app));
  document.getElementById('wiz-skip')?.addEventListener('click', () => next(app));
  document.getElementById('wiz-next')?.addEventListener('click', () => {
    if (onNext) onNext();
    else next(app);
  });
}

/* ─── Step 1: Shop Details ────────────────────────────────────── */
function stepShopDetails(el, app) {
  const cfg = getShopConfig();
  el.innerHTML = `
    <div class="ow-wizard-header">
      <div class="ow-wizard-step-num">Step 1 of ${TOTAL_STEPS}</div>
      <h2 class="ow-wizard-title">Tell us about your shop</h2>
      <p class="ow-wizard-sub">Basic information customers will see.</p>
    </div>

    <div class="ow-form-group" id="fg-name">
      <label class="ow-label" for="sd-name">Shop Name *</label>
      <input id="sd-name" class="ow-input" type="text" value="${escapeHtml(cfg.name)}"
             placeholder="e.g. Kings Barber Studio" maxlength="80" required />
      <span class="ow-field-error">Shop name is required.</span>
    </div>

    <div class="ow-form-group">
      <label class="ow-label" for="sd-type">Shop Type</label>
      <select id="sd-type" class="ow-select">
        <option value="barber shop" ${cfg.shopType==='barber shop'?'selected':''}>Barber Shop</option>
        <option value="salon" ${cfg.shopType==='salon'?'selected':''}>Salon</option>
        <option value="unisex salon" ${cfg.shopType==='unisex salon'?'selected':''}>Unisex Salon</option>
        <option value="spa" ${cfg.shopType==='spa'?'selected':''}>Spa & Grooming</option>
      </select>
    </div>

    <div class="ow-form-group" id="fg-phone">
      <label class="ow-label" for="sd-phone">Phone Number *</label>
      <input id="sd-phone" class="ow-input" type="tel" value="${escapeHtml(cfg.phone)}"
             placeholder="+91 98765 43210" required />
      <span class="ow-field-error">A valid phone number is required.</span>
    </div>

    <div class="ow-form-group">
      <label class="ow-label" for="sd-address">Address</label>
      <input id="sd-address" class="ow-input" type="text" value="${escapeHtml(cfg.address)}"
             placeholder="Shop address or area" />
    </div>

    <div class="ow-form-group">
      <label class="ow-label" for="sd-phone-add">Phone (WhatsApp / Contact) <span style="font-weight:400;">(optional)</span></label>
      <input id="sd-phone-add" class="ow-input" type="text" value="${escapeHtml(cfg.contactPhone || '')}"
             placeholder="For customers to reach you" />
    </div>

    <div class="ow-form-group">
      <label class="ow-label" for="sd-desc">Description <span style="font-weight:400;">(optional)</span></label>
      <textarea id="sd-desc" class="ow-textarea" placeholder="Tell customers what makes your shop special…" rows="3">${escapeHtml(cfg.description)}</textarea>
    </div>

    ${navButtons(app)}`;

  bindNav(app, () => {
    const name = document.getElementById('sd-name').value.trim();
    const phone = document.getElementById('sd-phone').value.trim();
    let valid = true;
    document.getElementById('fg-name').classList.toggle('error', !name);
    document.getElementById('fg-phone').classList.toggle('error', !phone);
    if (!name || !phone) valid = false;
    if (!valid) return;

    patchShopConfig({
      name,
      shopType: document.getElementById('sd-type').value,
      phone,
      contactPhone: document.getElementById('sd-phone-add').value.trim(),
      address: document.getElementById('sd-address').value.trim(),
      description: document.getElementById('sd-desc').value.trim(),
    });
    next(app);
  });
}

/* ─── Step 2: Working Hours ────────────────────────────────────── */
function stepWorkingHours(el, app) {
  const cfg = getShopConfig();

  el.innerHTML = `
    <div class="ow-wizard-header">
      <div class="ow-wizard-step-num">Step 2 of ${TOTAL_STEPS}</div>
      <h2 class="ow-wizard-title">Working Hours</h2>
      <p class="ow-wizard-sub">Set when your shop is open each day.</p>
    </div>

    <div style="margin-bottom:12px;">
      <button class="ow-btn ow-btn-secondary ow-btn-sm" type="button" id="apply-weekdays">
        Apply Mon–Sat hours to all weekdays
      </button>
    </div>

    <div class="ow-card" style="padding:0; overflow:hidden; margin-bottom:4px;">
      ${DAY_NAMES.map((d, idx) => {
        const dh = cfg.workingHours[d] || { open: idx !== 0, start: '09:00', end: '21:00' };
        return `
        <div class="ow-hours-row">
          <div class="ow-hours-day">${getDayShort(idx)}</div>
          <div class="ow-hours-times">
            <label class="ow-toggle" aria-label="Open on ${getDayName(idx)}">
              <input type="checkbox" data-day="${d}" class="day-open-toggle" ${dh.open ? 'checked' : ''} />
              <span class="ow-toggle-track"></span>
            </label>
            <span class="day-hours-wrap" id="hw-${d}" style="${!dh.open ? 'opacity:0.35; pointer-events:none;' : ''}">
              <input type="time" class="ow-time-input" data-day="${d}" data-field="start"
                     value="${dh.start}" aria-label="${getDayName(idx)} open time" />
              <span style="color:var(--text-muted); font-size:0.82rem;">to</span>
              <input type="time" class="ow-time-input" data-day="${d}" data-field="end"
                     value="${dh.end}" aria-label="${getDayName(idx)} close time" />
            </span>
          </div>
        </div>`}).join('')}
    </div>

    ${navButtons(app)}`;

  el.querySelectorAll('.day-open-toggle').forEach(cb => {
    cb.addEventListener('change', () => {
      const wrap = document.getElementById(`hw-${cb.dataset.day}`);
      wrap.style.opacity = cb.checked ? '1' : '0.35';
      wrap.style.pointerEvents = cb.checked ? '' : 'none';
    });
  });

  document.getElementById('apply-weekdays')?.addEventListener('click', () => {
    const monStart = el.querySelector('[data-day="mon"][data-field="start"]')?.value || '09:00';
    const monEnd   = el.querySelector('[data-day="mon"][data-field="end"]')?.value || '21:00';
    ['tue','wed','thu','fri','sat'].forEach(d => {
      const s = el.querySelector(`[data-day="${d}"][data-field="start"]`);
      const e = el.querySelector(`[data-day="${d}"][data-field="end"]`);
      if (s) s.value = monStart;
      if (e) e.value = monEnd;
    });
    toast('Applied to weekdays');
  });

  bindNav(app, () => {
    const wh = {};
    let valid = true;
    DAY_NAMES.forEach((d, i) => {
      const open = el.querySelector(`[data-day="${d}"].day-open-toggle`)?.checked || false;
      const start = el.querySelector(`[data-day="${d}"][data-field="start"]`)?.value || '09:00';
      const end   = el.querySelector(`[data-day="${d}"][data-field="end"]`)?.value || '21:00';
      if (open && start >= end) {
        toast(`Closing time must be after opening time for ${getDayName(i)}`, 'warn');
        valid = false; return;
      }
      wh[d] = { open, start, end };
    });
    if (!valid) return;
    patchShopConfig({ workingHours: wh });
    next(app);
  });
}

/* ─── Step 3: Breaks ───────────────────────────────────────────── */
function stepBreaks(el, app) {
  const cfg = getShopConfig();
  let breaks = [...(cfg.breaks || [])];
  if (!breaks.length) breaks = [{ id: uid('brk'), label: 'Lunch Break', start: '13:00', end: '14:00' }];

  function render() {
    el.innerHTML = `
      <div class="ow-wizard-header">
        <div class="ow-wizard-step-num">Step 3 of ${TOTAL_STEPS}</div>
        <h2 class="ow-wizard-title">Break Times</h2>
        <p class="ow-wizard-sub">Slots won't be offered during break periods. Customers can't book these times.</p>
      </div>

      <div class="ow-card" style="padding:0; overflow:hidden; margin-bottom:12px;">
        ${breaks.length ? breaks.map(b => `
          <div class="ow-break-row" id="brk-${b.id}">
            <input class="ow-input" style="flex:1;" type="text" data-brk="${b.id}" data-field="label"
                   value="${escapeHtml(b.label)}" placeholder="Break label" />
            <input class="ow-time-input" type="time" data-brk="${b.id}" data-field="start" value="${b.start}" />
            <span style="color:var(--text-muted);">–</span>
            <input class="ow-time-input" type="time" data-brk="${b.id}" data-field="end" value="${b.end}" />
            <button class="ow-btn ow-btn-ghost ow-btn-icon" type="button" data-del-brk="${b.id}"
                    aria-label="Remove break">✕</button>
          </div>`).join('') : `<div class="ow-empty" style="padding:20px;">
            <div style="color:var(--text-muted); font-size:0.85rem;">No breaks configured. Slots will be available all day.</div>
          </div>`}
      </div>

      <button class="ow-btn ow-btn-secondary ow-btn-sm" type="button" id="add-break-btn">
        + Add Break
      </button>

      ${navButtons(app, { skipFn: true, nextLabel: 'Continue →' })}`;

    el.querySelectorAll('[data-del-brk]').forEach(btn => {
      btn.addEventListener('click', () => {
        breaks = breaks.filter(b => b.id !== btn.dataset.delBrk);
        render();
      });
    });

    document.getElementById('add-break-btn')?.addEventListener('click', () => {
      breaks.push({ id: uid('brk'), label: 'Break', start: '13:00', end: '14:00' });
      render();
    });
  }

  render();

  bindNav(app, () => {
    const updatedBreaks = breaks.map(b => {
      const row = el.querySelector(`#brk-${b.id}`);
      if (!row) return b;
      return {
        ...b,
        label: row.querySelector('[data-field="label"]')?.value.trim() || b.label,
        start: row.querySelector('[data-field="start"]')?.value || b.start,
        end:   row.querySelector('[data-field="end"]')?.value || b.end,
      };
    });

    for (const brk of updatedBreaks) {
      if (brk.start >= brk.end) {
        toast(`Break end must be after start (${brk.label})`, 'warn');
        return;
      }
    }

    patchShopConfig({ breaks: updatedBreaks });
    next(app);
  });
}

/* ─── Step 4: Number of Barbers / Capacity ─────────────────────── */
function stepCapacity(el, app) {
  const cfg = getShopConfig();
  el.innerHTML = `
    <div class="ow-wizard-header">
      <div class="ow-wizard-step-num">Step 4 of ${TOTAL_STEPS}</div>
      <h2 class="ow-wizard-title">How many barbers/chairs?</h2>
      <p class="ow-wizard-sub">This sets how many customers can be booked at the same time.</p>
    </div>

    <div class="ow-card" style="margin-bottom:16px;">
      <div class="ow-form-group" id="fg-cap" style="margin-bottom:0;">
        <label class="ow-label" for="cap-num">Number of active barbers / chairs</label>
        <input id="cap-num" class="ow-input" type="number" min="1" max="50"
               value="${cfg.capacity || 3}" placeholder="e.g. 3" />
        <span class="ow-field-error">Enter a valid number (1–50).</span>
        <p class="ow-hint">Example: if you have 3 barbers, 3 customers can be booked at the same time slot.</p>
      </div>
    </div>

    ${navButtons(app)}`;

  bindNav(app, () => {
    const val = Number(document.getElementById('cap-num').value);
    const fg = document.getElementById('fg-cap');
    if (!val || val < 1 || val > 50) {
      fg.classList.add('error');
      return;
    }
    fg.classList.remove('error');
    patchShopConfig({ capacity: val });
    next(app);
  });
}

/* ─── Step 5: Services ────────────────────────────────────────── */
function stepServices(el, app) {
  let services = getServices();

  function renderList() {
    const list = document.getElementById('svc-list');
    if (!list) return;
    list.innerHTML = services.length ? services.map(s => `
      <div class="ow-flex-between ow-gap-8" style="padding:12px 0; border-bottom:1px solid var(--border);">
        <div style="flex:1; min-width:0;">
          <div style="font-weight:600; font-size:0.9rem;">${escapeHtml(s.name)}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${s.duration} min · ${formatINR(s.price)}</div>
        </div>
        <span class="ow-badge ${s.active !== false ? 'ow-badge-active' : 'ow-badge-inactive'}">
          ${s.active !== false ? 'Active' : 'Inactive'}
        </span>
        <button class="ow-btn ow-btn-ghost ow-btn-sm" data-del-svc="${s.id}" type="button">✕</button>
      </div>`).join('') : `<div style="padding:16px; color:var(--text-muted); text-align:center; font-size:0.85rem;">
        Add at least one service to continue.</div>`;
  }

  el.innerHTML = `
    <div class="ow-wizard-header">
      <div class="ow-wizard-step-num">Step 5 of ${TOTAL_STEPS}</div>
      <h2 class="ow-wizard-title">Your Services</h2>
      <p class="ow-wizard-sub">Add the services your shop offers.</p>
    </div>

    <div class="ow-card" style="padding:12px 16px; margin-bottom:12px;">
      <div id="svc-list"></div>
    </div>

    <div class="ow-card" style="margin-bottom:16px;">
      <div style="font-size:0.82rem; font-weight:700; margin-bottom:12px;">+ Add Service</div>
      <div class="ow-form-row">
        <div class="ow-form-group" id="fg-svc-name">
          <label class="ow-label" for="svc-name">Service Name *</label>
          <input id="svc-name" class="ow-input" type="text" placeholder="e.g. Classic Haircut" />
          <span class="ow-field-error">Name required.</span>
        </div>
        <div class="ow-form-group" id="fg-svc-dur">
          <label class="ow-label" for="svc-dur">Duration (min) *</label>
          <input id="svc-dur" class="ow-input" type="number" min="5" max="360" placeholder="30" />
          <span class="ow-field-error">Enter valid duration.</span>
        </div>
      </div>
      <div class="ow-form-row">
        <div class="ow-form-group" id="fg-svc-price">
          <label class="ow-label" for="svc-price">Price (₹) *</label>
          <input id="svc-price" class="ow-input" type="number" min="0" placeholder="150" />
          <span class="ow-field-error">Enter valid price.</span>
        </div>
      </div>
      <button class="ow-btn ow-btn-secondary ripple" type="button" id="add-svc-btn">+ Add Service</button>
    </div>

    ${navButtons(app, { skipFn: services.length > 0, nextLabel: 'Continue →' })}`;

  renderList();

  document.getElementById('add-svc-btn')?.addEventListener('click', () => {
    const name  = document.getElementById('svc-name').value.trim();
    const dur   = Number(document.getElementById('svc-dur').value);
    const price = Number(document.getElementById('svc-price').value);
    let valid = true;
    document.getElementById('fg-svc-name').classList.toggle('error', !name);
    document.getElementById('fg-svc-dur').classList.toggle('error', !dur || dur < 5);
    document.getElementById('fg-svc-price').classList.toggle('error', price < 0 || isNaN(price));
    if (!name || !dur || dur < 5 || price < 0 || isNaN(price)) valid = false;
    if (!valid) return;
    addService({ name, duration: dur, price, active: true, description: '' });
    services = getServices();
    renderList();
    document.getElementById('svc-name').value = '';
    document.getElementById('svc-dur').value = '';
    document.getElementById('svc-price').value = '';
    toast('Service added');
  });

  el.addEventListener('click', e => {
    const del = e.target.closest('[data-del-svc]');
    if (del) {
      deleteService(del.dataset.delSvc);
      services = getServices();
      renderList();
    }
  });

  bindNav(app, () => {
    if (!services.length) { toast('Add at least one service to continue.', 'warn'); return; }
    next(app);
  });
}

/* ─── Step 6: Booking Rules ───────────────────────────────────── */
function stepBookingRules(el, app) {
  const cfg = getShopConfig();
  el.innerHTML = `
    <div class="ow-wizard-header">
      <div class="ow-wizard-step-num">Step 6 of ${TOTAL_STEPS}</div>
      <h2 class="ow-wizard-title">Booking Rules</h2>
      <p class="ow-wizard-sub">How far ahead can customers book, and when can they cancel?</p>
    </div>

    <div class="ow-card" style="margin-bottom:16px;">
      <div class="ow-form-group" id="fg-bw">
        <label class="ow-label" for="booking-window">Advance booking window</label>
        <select id="booking-window" class="ow-select">
          ${[7,14,21,30,60,90].map(v => `<option value="${v}" ${v === (cfg.bookingWindow||30) ? 'selected' : ''}>${v} days ahead</option>`).join('')}
        </select>
        <p class="ow-hint">Customers can book appointments up to this many days in advance.</p>
      </div>

      <div class="ow-divider"></div>

      <div class="ow-form-group">
        <label class="ow-label" for="cancel-hours">Free cancellation window</label>
        <select id="cancel-hours" class="ow-select">
          ${[1,2,4,6,12,24].map(v => `<option value="${v}" ${v === (cfg.cancellationHours||2) ? 'selected' : ''}>${v} hour${v>1?'s':''} before appointment</option>`).join('')}
        </select>
        <p class="ow-hint">Customers can cancel free of charge up to this time before their appointment.</p>
      </div>
    </div>

    ${navButtons(app)}`;

  bindNav(app, () => {
    patchShopConfig({
      bookingWindow: Number(document.getElementById('booking-window').value),
      cancellationHours: Number(document.getElementById('cancel-hours').value),
    });
    next(app);
  });
}

/* ─── Step 7: Go Live ─────────────────────────────────────────── */
function stepGoLive(el, app) {
  const cfg = getShopConfig();
  const services = getServices();

  const wh = cfg.workingHours || {};
  const openDays = DAY_NAMES.filter(d => wh[d] && wh[d].open)
    .map(d => getDayShort(DAY_NAMES.indexOf(d))).join(', ');

  el.innerHTML = `
    <div class="ow-wizard-header">
      <div class="ow-wizard-step-num">Step 7 of ${TOTAL_STEPS}</div>
      <h2 class="ow-wizard-title">Ready to Go Live?</h2>
      <p class="ow-wizard-sub">Here's a summary of your shop setup. You can change everything later.</p>
    </div>

    <div class="ow-card" style="margin-bottom:16px;">
      <div style="display:grid; gap:14px;">
        <div class="ow-flex-between">
          <div>
            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600; margin-bottom:2px;">SHOP</div>
            <div style="font-weight:700;">${escapeHtml(cfg.name || '—')}</div>
            <div style="font-size:0.78rem; color:var(--text-muted);">${escapeHtml(cfg.address || 'Address not set')}</div>
          </div>
          <a href="#" id="edit-step-1" class="ow-btn ow-btn-ghost ow-btn-sm">Edit</a>
        </div>

        <div class="ow-divider" style="margin:0;"></div>

        <div class="ow-flex-between">
          <div>
            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600; margin-bottom:2px;">WORKING HOURS</div>
            <div style="font-weight:600; font-size:0.875rem;">${openDays || 'Not configured'}</div>
            ${wh['mon']?.open ? `<div style="font-size:0.78rem; color:var(--text-muted);">${wh['mon'].start} – ${wh['mon'].end}</div>` : ''}
          </div>
          <a href="#" id="edit-step-2" class="ow-btn ow-btn-ghost ow-btn-sm">Edit</a>
        </div>

        <div class="ow-divider" style="margin:0;"></div>

        <div class="ow-flex-between">
          <div>
            <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600; margin-bottom:2px;">SERVICES</div>
            <div style="font-weight:600; font-size:0.875rem;">${services.length} service${services.length !== 1 ? 's' : ''}</div>
            <div style="font-size:0.78rem; color:var(--text-muted);">${services.map(s => s.name).join(', ')}</div>
          </div>
          <a href="#" id="edit-step-5" class="ow-btn ow-btn-ghost ow-btn-sm">Edit</a>
        </div>

        <div class="ow-divider" style="margin:0;"></div>

        <div>
          <div style="font-size:0.7rem; color:var(--text-muted); font-weight:600; margin-bottom:2px;">CAPACITY</div>
          <div style="font-weight:600; font-size:0.875rem;">${cfg.capacity} barber${cfg.capacity !== 1 ? 's' : ''} / chairs</div>
        </div>
      </div>
    </div>

    <div class="ow-wizard-actions">
      <button class="ow-btn ow-btn-ghost" type="button" id="wiz-back">← Back</button>
      <button class="ow-btn ow-btn-primary ripple" type="button" id="go-live-btn" style="font-size:1rem; padding:12px 28px;">
        Go Live
      </button>
    </div>`;

  document.getElementById('wiz-back')?.addEventListener('click', () => prev(app));
  [{id:1,key:'edit-step-1'},{id:2,key:'edit-step-2'},{id:5,key:'edit-step-5'}].forEach(({id,key}) => {
    document.getElementById(key)?.addEventListener('click', e => {
      e.preventDefault();
      state.step = id;
      renderStep(app);
    });
  });

  document.getElementById('go-live-btn')?.addEventListener('click', () => {
    patchShopConfig({ onboarded: true, status: 'open' });
    sessionStorage.removeItem('ow_onboarding');
    app.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:50vh; text-align:center; gap:16px;">
        <h2 style="font-size:1.5rem; font-weight:800;">Your shop is ready!</h2>
        <p style="color:var(--text-muted); max-width:300px;">Slots are now generated based on your configuration. Customer booking requests will appear in the Dashboard and Bookings pages.</p>
        <a href="#dashboard" class="ow-btn ow-btn-primary ripple" style="margin-top:8px;">Go to Dashboard →</a>
      </div>`;
  });
}
