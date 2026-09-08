/* =============================================================
   Owner App — Holidays Page
   ============================================================= */
import {
  getHolidays, addHoliday, updateHoliday, removeHoliday
} from '../data.js';
import { escapeHtml, toast, formatDateLong } from '../utils.js';

export default function mount(app) {
  render(app);
}

function render(app) {
  const holidays = getHolidays();
  const today = new Date().toISOString().split('T')[0];
  const upcoming = holidays.filter(h => h.dateISO >= today);
  const past = holidays.filter(h => h.dateISO < today);

  app.innerHTML = `
    <div class="ow-page-header">
      <div>
        <h1 class="ow-page-title">Holidays</h1>
        <p class="ow-page-sub">${holidays.length} holiday${holidays.length !== 1 ? 's' : ''} configured</p>
      </div>
      <button class="ow-btn ow-btn-primary ripple" type="button" id="add-hol-btn">+ Add Holiday</button>
    </div>

    ${upcoming.length ? `
    <div class="ow-section-title">Upcoming Holidays</div>
    <div class="ow-card" style="padding:0; overflow:hidden; margin-bottom:${past.length ? '16px' : '0'};">
      ${upcoming.map(h => holidayRow(h)).join('')}
    </div>` : ''}

    ${past.length ? `
    <div class="ow-section-title">Past Holidays</div>
    <div class="ow-card" style="padding:0; overflow:hidden;">
      ${past.map(h => holidayRow(h)).join('')}
    </div>` : ''}

    ${!holidays.length ? `
    <div class="ow-card" style="margin-bottom:16px;">
      <div class="ow-empty" style="padding:30px;">
        <div class="ow-empty-icon">📅</div>
        <div class="ow-empty-title">No holidays added yet</div>
        <div class="ow-empty-sub">Add holidays to block customer bookings on those dates.</div>
      </div>
    </div>` : ''}

    <!-- Holiday Modal -->
    <div id="hol-modal" class="ow-modal-backdrop" hidden>
      <div class="ow-modal" role="dialog" aria-modal="true" aria-labelledby="hol-modal-title" style="max-width:440px;">
        <div class="ow-modal-header">
          <h2 class="ow-modal-title" id="hol-modal-title">Add Holiday</h2>
          <button class="ow-modal-close" type="button" id="hol-modal-close" aria-label="Close">✕</button>
        </div>
        <form id="hol-form" novalidate>
          <div class="ow-form-group" id="fg-hol-date">
            <label class="ow-label" for="hol-date">Holiday Date *</label>
            <input id="hol-date" class="ow-input" type="date" required />
            <span class="ow-field-error">Please select a valid date.</span>
          </div>
          <div class="ow-form-group" id="fg-hol-label">
            <label class="ow-label" for="hol-label">Reason / Name *</label>
            <input id="hol-label" class="ow-input" type="text" placeholder="e.g. Vinayagar Chaturthi" required />
            <span class="ow-field-error">Reason is required.</span>
          </div>
          <p class="ow-field-error" id="hol-dup-err" style="margin-top:-8px; margin-bottom:12px; display:none;">A holiday already exists for this date.</p>
          <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px;">
            <button class="ow-btn ow-btn-ghost" type="button" id="hol-cancel-btn">Cancel</button>
            <button class="ow-btn ow-btn-primary ripple" type="submit" id="hol-submit-btn">Save Holiday</button>
          </div>
        </form>
      </div>
    </div>`;

  let editingId = null;
  const modal = document.getElementById('hol-modal');
  const form = document.getElementById('hol-form');
  const modalTitle = document.getElementById('hol-modal-title');
  const submitBtn = document.getElementById('hol-submit-btn');
  const dupErr = document.getElementById('hol-dup-err');

  function openModal(holiday = null) {
    editingId = holiday?.id || null;
    modalTitle.textContent = holiday ? 'Edit Holiday' : 'Add Holiday';
    submitBtn.textContent = holiday ? 'Update Holiday' : 'Add Holiday';
    document.getElementById('hol-date').value = holiday?.dateISO || '';
    document.getElementById('hol-label').value = holiday?.label || '';
    ['fg-hol-date', 'fg-hol-label'].forEach(id => document.getElementById(id)?.classList.remove('error'));
    dupErr.style.display = 'none';
    modal.hidden = false;
    document.getElementById('hol-date').focus();
  }

  function closeModal() { modal.hidden = true; }

  document.getElementById('add-hol-btn').addEventListener('click', () => openModal());
  document.getElementById('hol-modal-close').addEventListener('click', closeModal);
  document.getElementById('hol-cancel-btn').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Edit / Delete actions
  app.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit-hol]');
    if (editBtn) {
      const h = getHolidays().find(x => x.id === editBtn.dataset.editHol);
      if (h) openModal(h);
      return;
    }
    const delBtn = e.target.closest('[data-del-hol]');
    if (delBtn) {
      const h = getHolidays().find(x => x.id === delBtn.dataset.delHol);
      if (h && confirm(`Are you sure you want to remove "${h.label}" (${formatDateLong(new Date(h.dateISO))})?`)) {
        removeHoliday(delBtn.dataset.delHol);
        toast('Holiday removed');
        render(app);
      }
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const date = document.getElementById('hol-date').value;
    const label = document.getElementById('hol-label').value.trim();

    let valid = true;
    document.getElementById('fg-hol-date').classList.toggle('error', !date);
    document.getElementById('fg-hol-label').classList.toggle('error', !label);
    if (!date || !label) valid = false;

    // Duplicate check (only for new or changed date)
    const holidaysList = getHolidays();
    const isDuplicate = holidaysList.some(h => h.dateISO === date && h.id !== editingId);
    dupErr.style.display = isDuplicate ? 'block' : 'none';
    if (isDuplicate) valid = false;

    if (!valid) return;

    if (editingId) {
      updateHoliday(editingId, { dateISO: date, label });
      toast('Holiday updated');
    } else {
      addHoliday(date, label);
      toast('Holiday added');
    }
    closeModal();
    render(app);
  });
}

function holidayRow(h) {
  const date = new Date(h.dateISO);
  const formatted = date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `
    <div class="ow-break-row" style="padding:14px 18px;">
      <div style="flex:1; min-width:0;">
        <div style="font-weight:600; font-size:0.9rem;">${escapeHtml(h.label)}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${formatted}</div>
      </div>
      <div style="display:flex; gap:6px; flex-wrap:wrap;">
        <button class="ow-btn ow-btn-ghost ow-btn-sm" type="button" data-edit-hol="${h.id}">Edit</button>
        <button class="ow-btn ow-btn-danger ow-btn-sm" type="button" data-del-hol="${h.id}">Delete</button>
      </div>
    </div>`;
}
