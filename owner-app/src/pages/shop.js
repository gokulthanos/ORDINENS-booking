/* =============================================================
   Owner App — Shop Settings Page
   ============================================================= */
import { getShopConfig, patchShopConfig } from '../data.js';
import { escapeHtml, toast, getDayName, getDayShort, uid } from '../utils.js';

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function mount(app) {
  render(app);
}

function render(app) {
  const cfg = getShopConfig();
  const days = [0,1,2,3,4,5,6];

  app.innerHTML = `
    <div class="ow-page-header">
      <div>
        <h1 class="ow-page-title">Shop Settings</h1>
        <p class="ow-page-sub">Manage profile, hours and breaks</p>
      </div>
      <button class="ow-btn ow-btn-primary ripple" type="button" id="shop-save-btn">Save Changes</button>
    </div>

    <form id="shop-form" novalidate>
      <div class="ow-settings-section">
        <div class="ow-settings-section-header">Basic Information</div>
        <div class="ow-settings-section-body">
          <div class="ow-form-group">
            <label class="ow-label" for="sh-name">Shop Name</label>
            <input id="sh-name" class="ow-input" type="text" value="${escapeHtml(cfg.name)}" required />
          </div>
          <div class="ow-form-row">
            <div class="ow-form-group">
              <label class="ow-label" for="sh-type">Type</label>
              <select id="sh-type" class="ow-select">
                <option value="barber shop" ${cfg.shopType==='barber shop'?'selected':''}>Barber Shop</option>
                <option value="salon" ${cfg.shopType==='salon'?'selected':''}>Salon</option>
                <option value="unisex salon" ${cfg.shopType==='unisex salon'?'selected':''}>Unisex Salon</option>
                <option value="spa" ${cfg.shopType==='spa'?'selected':''}>Spa & Grooming</option>
              </select>
            </div>
            <div class="ow-form-group">
              <label class="ow-label" for="sh-phone">Phone Number</label>
              <input id="sh-phone" class="ow-input" type="tel" value="${escapeHtml(cfg.phone)}" required />
            </div>
          </div>
          <div class="ow-form-group">
            <label class="ow-label" for="sh-address">Address</label>
            <input id="sh-address" class="ow-input" type="text" value="${escapeHtml(cfg.address)}" />
          </div>
          <div class="ow-form-group">
            <label class="ow-label" for="sh-desc">Description</label>
            <textarea id="sh-desc" class="ow-textarea" rows="3">${escapeHtml(cfg.description)}</textarea>
          </div>
        </div>
      </div>

      <div class="ow-settings-section">
        <div class="ow-settings-section-header">Working Hours</div>
        <div class="ow-settings-section-body" style="padding:0;">
          ${days.map(d => {
            const dayKey = DAY_NAMES[d];
            const dh = cfg.workingHours[dayKey] || { open: false, start: '09:00', end: '21:00' };
            return `
            <div class="ow-hours-row" style="padding:12px 18px;">
              <div class="ow-hours-day">${getDayShort(d)}</div>
              <div class="ow-hours-times">
                <label class="ow-toggle" aria-label="Open on ${getDayName(d)}">
                  <input type="checkbox" data-day="${dayKey}" class="day-open-toggle" ${dh.open ? 'checked' : ''} />
                  <span class="ow-toggle-track"></span>
                </label>
                <span class="day-hours-wrap" id="hw-${dayKey}" style="${!dh.open ? 'opacity:0.35; pointer-events:none;' : ''}">
                  <input type="time" class="ow-time-input" data-day="${dayKey}" data-field="start" value="${dh.start}" />
                  <span style="color:var(--text-muted); font-size:0.82rem;">to</span>
                  <input type="time" class="ow-time-input" data-day="${dayKey}" data-field="end" value="${dh.end}" />
                </span>
              </div>
            </div>`}).join('')}
        </div>
      </div>
    </form>

    <div class="ow-settings-section">
      <div class="ow-settings-section-header ow-flex-between">
        <span>Breaks</span>
        <button class="ow-btn ow-btn-secondary ow-btn-sm" type="button" id="add-brk-btn">+ Add</button>
      </div>
      <div class="ow-settings-section-body" style="padding:0;">
        <div id="brk-list-wrap"></div>
      </div>
    </div>
  `;

  // Breaks handling
  let breaks = [...(cfg.breaks || [])];
  const brkWrap = document.getElementById('brk-list-wrap');
  function renderBreaks() {
    brkWrap.innerHTML = breaks.length ? breaks.map(b => `
      <div class="ow-break-row" style="padding:12px 18px;" id="brk-${b.id}">
        <input class="ow-input" style="flex:1;" type="text" data-brk="${b.id}" data-field="label" value="${escapeHtml(b.label)}" placeholder="Label" />
        <input class="ow-time-input" type="time" data-brk="${b.id}" data-field="start" value="${b.start}" />
        <span style="color:var(--text-muted);">–</span>
        <input class="ow-time-input" type="time" data-brk="${b.id}" data-field="end" value="${b.end}" />
        <button class="ow-btn ow-btn-ghost ow-btn-icon" data-del-brk="${b.id}" type="button">✕</button>
      </div>`).join('') : `
      <div class="ow-empty" style="padding:30px;">
        <div style="color:var(--text-muted); font-size:0.85rem;">No breaks configured.</div>
      </div>`;
  }
  renderBreaks();

  document.getElementById('add-brk-btn').addEventListener('click', () => {
    breaks.push({ id: uid('brk'), label: 'Break', start: '13:00', end: '14:00' });
    renderBreaks();
  });

  brkWrap.addEventListener('click', e => {
    const del = e.target.closest('[data-del-brk]');
    if (del) {
      breaks = breaks.filter(b => b.id !== del.dataset.delBrk);
      renderBreaks();
    }
  });

  // Hours toggle
  app.querySelectorAll('.day-open-toggle').forEach(cb => {
    cb.addEventListener('change', () => {
      const wrap = document.getElementById(`hw-${cb.dataset.day}`);
      wrap.style.opacity = cb.checked ? '1' : '0.35';
      wrap.style.pointerEvents = cb.checked ? '' : 'none';
    });
  });

  // Save changes
  document.getElementById('shop-save-btn').addEventListener('click', () => {
    const name = document.getElementById('sh-name').value.trim();
    if (!name) { toast('Shop name required', 'error'); return; }

    const wh = {};
    for (let d = 0; d <= 6; d++) {
      const dayKey = DAY_NAMES[d];
      const open = app.querySelector(`[data-day="${dayKey}"].day-open-toggle`)?.checked || false;
      const start = app.querySelector(`[data-day="${dayKey}"][data-field="start"]`)?.value || '09:00';
      const end   = app.querySelector(`[data-day="${dayKey}"][data-field="end"]`)?.value || '21:00';
      wh[dayKey] = { open, start, end };
    }

    const updatedBreaks = breaks.map(b => {
      const row = app.querySelector(`#brk-${b.id}`);
      if (!row) return b;
      return {
        ...b,
        label: row.querySelector('[data-field="label"]')?.value.trim() || b.label,
        start: row.querySelector('[data-field="start"]')?.value || b.start,
        end:   row.querySelector('[data-field="end"]')?.value || b.end,
      };
    });

    patchShopConfig({
      name,
      shopType: document.getElementById('sh-type').value,
      phone: document.getElementById('sh-phone').value.trim(),
      address: document.getElementById('sh-address').value.trim(),
      description: document.getElementById('sh-desc').value.trim(),
      workingHours: wh,
      breaks: updatedBreaks
    });

    toast('Shop settings saved successfully');
  });
}
