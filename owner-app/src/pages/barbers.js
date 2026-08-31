/* =============================================================
   Owner App — Barbers Page
   ============================================================= */
import {
  getStaff, getShopConfig, addBarber, updateBarber, deleteBarber
} from '../data.js';
import { escapeHtml, minutesTo24, timeToMinutes, getDayName, toast } from '../utils.js';

export default function mount(app) {
  render(app);
}

function render(app) {
  const staff = getStaff();
  const config = getShopConfig();
  const capacity = config.capacity || 3;

  app.innerHTML = `
    <div class="ow-page-header">
      <div>
        <h1 class="ow-page-title">Barbers</h1>
        <p class="ow-page-sub">${staff.length} barber${staff.length !== 1 ? 's' : ''} (Shop Capacity: ${capacity})</p>
      </div>
      <button class="ow-btn ow-btn-primary ripple" type="button" id="add-bb-btn">+ Add Barber</button>
    </div>

    ${staff.length ? `
    <div class="ow-staff-grid">
      ${staff.map(b => bbCard(b)).join('')}
    </div>` : `
    <div class="ow-empty">
      <div class="ow-empty-icon">👨</div>
      <div class="ow-empty-title">No barbers yet</div>
      <div class="ow-empty-sub">Add barbers so customers can book specific staff members.</div>
    </div>`}

    <!-- Barber Modal -->
    <div id="bb-modal" class="ow-modal-backdrop" hidden>
      <div class="ow-modal" role="dialog" aria-modal="true" aria-labelledby="bb-modal-title">
        <div class="ow-modal-header">
          <h2 class="ow-modal-title" id="bb-modal-title">Add Barber</h2>
          <button class="ow-modal-close" type="button" id="bb-modal-close" aria-label="Close">✕</button>
        </div>
        <form id="bb-form" novalidate>
          <div class="ow-form-row">
            <div class="ow-form-group" id="fg-bb-name">
              <label class="ow-label" for="bb-name">Name *</label>
              <input id="bb-name" class="ow-input" type="text" placeholder="e.g. Arjun" required />
              <span class="ow-field-error">Name is required.</span>
            </div>
            <div class="ow-form-group">
              <label class="ow-label" for="bb-role">Role</label>
              <input id="bb-role" class="ow-input" type="text" placeholder="e.g. Master Barber" />
            </div>
          </div>
          <div class="ow-form-row">
            <div class="ow-form-group">
              <label class="ow-label" for="bb-years">Experience (years)</label>
              <input id="bb-years" class="ow-input" type="number" min="0" placeholder="5" />
            </div>
            <div class="ow-form-group">
              <label class="ow-label" for="bb-specialty">Specialty</label>
              <input id="bb-specialty" class="ow-input" type="text" placeholder="e.g. Fades, Beards" />
            </div>
          </div>
          <div class="ow-form-row">
            <div class="ow-form-group">
              <label class="ow-label" for="bb-emoji">Emoji</label>
              <input id="bb-emoji" class="ow-input" type="text" placeholder="👨" maxlength="4" />
            </div>
            <div class="ow-form-group">
              <label class="ow-label" for="bb-color">Accent Color</label>
              <input id="bb-color" class="ow-input" type="color" value="#7c5cff" style="padding:4px; height:44px;" />
            </div>
          </div>

          <div class="ow-divider"></div>
          <div style="font-size:0.8rem; font-weight:700; color:var(--text-muted); margin-bottom:12px; text-transform:uppercase;">Availability</div>

          <div class="ow-form-group">
            <label class="ow-label">Working Days</label>
            <div class="ow-day-chips" id="bb-days">
              ${[1,2,3,4,5,6,0].map(d => `<button type="button" class="ow-day-chip" data-day="${d}" aria-label="Toggle ${getDayName(d)}">${getDayName(d).slice(0,1)}</button>`).join('')}
            </div>
          </div>

          <div class="ow-form-row">
            <div class="ow-form-group" id="fg-bb-start">
              <label class="ow-label" for="bb-start">Start Time *</label>
              <input id="bb-start" class="ow-input" type="time" required />
            </div>
            <div class="ow-form-group" id="fg-bb-end">
              <label class="ow-label" for="bb-end">End Time *</label>
              <input id="bb-end" class="ow-input" type="time" required />
            </div>
          </div>
          <p class="ow-field-error" id="bb-time-err" style="margin-top:-8px; margin-bottom:12px;">End time must be after start time.</p>

          <div class="ow-form-group">
            <div class="ow-toggle-wrap">
              <div>
                <div class="ow-label">Active Status</div>
                <div class="ow-hint">Inactive barbers cannot receive new bookings.</div>
              </div>
              <label class="ow-toggle">
                <input type="checkbox" id="bb-active" checked />
                <span class="ow-toggle-track"></span>
              </label>
            </div>
          </div>

          <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:16px;">
            <button class="ow-btn ow-btn-ghost" type="button" id="bb-cancel-btn">Cancel</button>
            <button class="ow-btn ow-btn-primary ripple" type="submit">Save Barber</button>
          </div>
        </form>
      </div>
    </div>`;

  let editingId = null;
  const modal = document.getElementById('bb-modal');
  const form = document.getElementById('bb-form');
  const daysWrap = document.getElementById('bb-days');
  const timeErr = document.getElementById('bb-time-err');

  function openModal(b = null) {
    editingId = b?.id || null;
    document.getElementById('bb-modal-title').textContent = b ? 'Edit Barber' : 'Add Barber';
    document.getElementById('bb-name').value = b?.name || '';
    document.getElementById('bb-role').value = b?.role || '';
    document.getElementById('bb-years').value = b?.years ?? '';
    document.getElementById('bb-specialty').value = b?.specialty || '';
    document.getElementById('bb-emoji').value = b?.emoji || '👨';
    document.getElementById('bb-color').value = b?.color || '#7c5cff';
    document.getElementById('bb-active').checked = b?.active !== false;

    // Default times from shop config if new
    let start = '09:00', end = '21:00', workingDays = [1,2,3,4,5,6];
    if (b) {
      start = minutesTo24(b.startMinute);
      end = minutesTo24(b.endMinute);
      workingDays = b.workingDays;
    } else {
      const wh = config.workingHours;
      workingDays = Object.keys(wh).filter(d => wh[d].open).map(Number);
      start = wh['1']?.start || '09:00';
      end = wh['1']?.end || '21:00';
    }
    document.getElementById('bb-start').value = start;
    document.getElementById('bb-end').value = end;

    daysWrap.querySelectorAll('.ow-day-chip').forEach(btn => {
      btn.classList.toggle('selected', workingDays.includes(Number(btn.dataset.day)));
    });

    document.getElementById('fg-bb-name').classList.remove('error');
    timeErr.style.display = 'none';
    modal.hidden = false;
    document.getElementById('bb-name').focus();
  }

  function closeModal() { modal.hidden = true; }

  // Day toggle
  daysWrap.addEventListener('click', e => {
    if (e.target.classList.contains('ow-day-chip')) {
      e.target.classList.toggle('selected');
    }
  });

  document.getElementById('add-bb-btn').addEventListener('click', () => openModal());
  document.getElementById('bb-modal-close').addEventListener('click', closeModal);
  document.getElementById('bb-cancel-btn').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  app.addEventListener('click', e => {
    const edit = e.target.closest('[data-edit-bb]');
    if (edit) {
      const b = getStaff().find(x => x.id === edit.dataset.editBb);
      if (b) openModal(b);
      return;
    }
    const toggle = e.target.closest('[data-toggle-bb]');
    if (toggle) {
      const b = getStaff().find(x => x.id === toggle.dataset.toggleBb);
      if (b) {
        updateBarber(b.id, { active: !b.active });
        toast(b.active ? 'Barber deactivated' : 'Barber activated');
        render(app);
      }
      return;
    }
    const del = e.target.closest('[data-del-bb]');
    if (del) {
      if (confirm('Delete this barber?')) {
        deleteBarber(del.dataset.delBb);
        toast('Barber deleted');
        render(app);
      }
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('bb-name').value.trim();
    const startVal = document.getElementById('bb-start').value;
    const endVal = document.getElementById('bb-end').value;

    let valid = true;
    document.getElementById('fg-bb-name').classList.toggle('error', !name);
    if (!name) valid = false;

    const startMinute = timeToMinutes(startVal);
    const endMinute = timeToMinutes(endVal);
    if (startMinute >= endMinute) {
      timeErr.style.display = 'block';
      valid = false;
    } else {
      timeErr.style.display = 'none';
    }

    if (!valid) return;

    const workingDays = [...daysWrap.querySelectorAll('.ow-day-chip.selected')].map(b => Number(b.dataset.day));
    if (!workingDays.length) {
      toast('Select at least one working day.', 'warn');
      return;
    }

    const data = {
      name,
      role: document.getElementById('bb-role').value.trim(),
      years: Number(document.getElementById('bb-years').value) || 0,
      specialty: document.getElementById('bb-specialty').value.trim(),
      emoji: document.getElementById('bb-emoji').value.trim() || '👨',
      color: document.getElementById('bb-color').value,
      active: document.getElementById('bb-active').checked,
      workingDays,
      startMinute,
      endMinute
    };

    if (editingId) {
      updateBarber(editingId, data);
      toast('Barber updated');
    } else {
      addBarber(data);
      toast('Barber added');
    }
    closeModal();
    render(app);
  });
}

function bbCard(b) {
  return `
    <article class="ow-staff-card" style="--accent-color:${b.color}">
      <span class="ow-status-dot ${b.active !== false ? 'active' : 'inactive'}" aria-label="Status"></span>
      <div class="ow-staff-avatar">${b.emoji || '👨'}</div>
      <h3 class="ow-staff-name">${escapeHtml(b.name)}</h3>
      <div class="ow-staff-role">${escapeHtml(b.role || 'Barber')}</div>
      ${b.specialty ? `<div class="ow-staff-spec">${escapeHtml(b.specialty)}</div>` : ''}
      <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:12px;">
        ${b.workingDays.length} days · ${minutesTo24(b.startMinute)}–${minutesTo24(b.endMinute)}
      </div>
      <div class="ow-staff-actions">
        <button class="ow-btn ow-btn-secondary ow-btn-sm" type="button" data-edit-bb="${b.id}">Edit</button>
        <button class="ow-btn ow-btn-secondary ow-btn-sm" type="button" data-toggle-bb="${b.id}">
          ${b.active !== false ? 'Deactivate' : 'Activate'}
        </button>
        <button class="ow-btn ow-btn-ghost ow-btn-sm" type="button" style="color:var(--danger);" data-del-bb="${b.id}">✕</button>
      </div>
    </article>`;
}
