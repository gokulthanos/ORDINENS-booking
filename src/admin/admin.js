import {
  getServices,
  saveServices,
  getStaff,
  saveStaff,
  getBookings,
  updateBookingStatus,
  getDashboardStats,
  formatSlotTime,
} from '../data.js';
import { formatINR, formatDateLong, fromISO, escapeHtml, toast } from '../utils.js';

export default function mountAdmin() {
  const route = location.hash.replace(/^#\/?/, '').toLowerCase();
  if (route === 'admin') renderDashboard();
  else if (route === 'admin/services') renderServices();
  else if (route === 'admin/staff') renderStaff();
  else if (route === 'admin/bookings') renderBookings();
}

/* ----------------------------- Dashboard ----------------------------- */
function renderDashboard() {
  const stats = getDashboardStats();

  const cards = [
    { label: 'Services', value: stats.services, icon: '&#9986;' },
    { label: 'Barbers', value: stats.staff, icon: '&#128104;' },
    { label: 'Total bookings', value: stats.totalBookings, icon: '&#128197;' },
    { label: "Today's bookings", value: stats.todayBookings, icon: '&#9200;' },
    {
      label: 'Booked value',
      value: formatINR(stats.revenue),
      icon: '&#8377;',
    },
  ];

  const grid = document.getElementById('stat-grid');
  grid.innerHTML = cards
    .map(
      (c) => `
    <div class="card glass stat-card">
      <span class="stat-icon" aria-hidden="true">${c.icon}</span>
      <strong>${c.value}</strong>
      <span>${c.label}</span>
    </div>`
    )
    .join('');

  const statusEl = document.getElementById('status-cards');
  const statuses = [
    { key: 'confirmed', label: 'Confirmed', cls: 'ok' },
    { key: 'completed', label: 'Completed', cls: 'info' },
    { key: 'cancelled', label: 'Cancelled', cls: 'warn' },
    { key: 'no-show', label: 'No-show', cls: 'bad' },
  ];
  statusEl.innerHTML = statuses
    .map(
      (s) => `
    <div class="status-card">
      <strong class="status-${s.cls}">${stats[s.key] || 0}</strong>
      <span>${s.label}</span>
    </div>`
    )
    .join('');
}

/* ---------------------------- Services CRUD --------------------------- */
function renderServices() {
  const tbody = document.getElementById('services-tbody');
  const modal = document.getElementById('service-modal');
  const form = document.getElementById('service-form');
  let editingId = null;

  const renderRows = () => {
    tbody.innerHTML = getServices()
      .map(
        (s) => `
      <tr>
        <td><strong>${s.emoji || '&#9995;'} ${escapeHtml(s.name)}</strong></td>
        <td>${s.duration} min</td>
        <td>${formatINR(s.price)}</td>
        <td><span class="pill active-pill">Active</span></td>
        <td>
          <div class="row-actions">
            <button class="btn btn-ghost btn-sm ripple" type="button" data-edit-service="${s.id}">Edit</button>
            <button class="btn btn-ghost btn-sm danger ripple" type="button" data-del-service="${s.id}">Delete</button>
          </div>
        </td>
      </tr>`
      )
      .join('');
  };

  renderRows();

  const fillForm = (s) => {
    document.getElementById('sv-name').value = s.name;
    document.getElementById('sv-emoji').value = s.emoji || '';
    document.getElementById('sv-duration').value = s.duration;
    document.getElementById('sv-price').value = s.price;
    document.getElementById('sv-desc').value = s.description || '';
  };

  document.getElementById('add-service-btn').addEventListener('click', () => {
    editingId = null;
    form.reset();
    document.getElementById('sv-emoji').value = '&#9995;';
    openModal(modal);
  });

  tbody.addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit-service]');
    if (edit) {
      const s = getServices().find((x) => x.id === edit.dataset.editService);
      if (!s) return;
      editingId = s.id;
      fillForm(s);
      openModal(modal);
      return;
    }
    const del = e.target.closest('[data-del-service]');
    if (del) {
      const id = del.dataset.delService;
      if (confirm('Delete this service?')) {
        saveServices(getServices().filter((s) => s.id !== id));
        toast('Service removed.');
        renderServices();
      }
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById('sv-name').value.trim(),
      emoji: document.getElementById('sv-emoji').value.trim() || '&#9995;',
      duration: Number(document.getElementById('sv-duration').value),
      price: Number(document.getElementById('sv-price').value),
      description: document.getElementById('sv-desc').value.trim(),
    };
    if (!data.name || !data.duration || data.price == null) return;

    const services = getServices();
    if (editingId) {
      const idx = services.findIndex((s) => s.id === editingId);
      if (idx > -1) services[idx] = { ...services[idx], ...data };
    } else {
      services.push({ id: 'svc-' + Date.now().toString(36), ...data });
    }
    saveServices(services);
    closeModal(modal);
    toast(editingId ? 'Service updated.' : 'Service added.');
    renderServices();
  });
}

/* ------------------------------ Staff CRUD ---------------------------- */
function renderStaff() {
  const grid = document.getElementById('staff-grid');
  let staff = getStaff();

  grid.innerHTML = staff
    .map(
      (b) => `
      <article class="card glass lift staff-card" tabindex="0" aria-label="${b.name}, ${b.role}">
        <div class="staff-avatar" style="--accent:${b.color}" aria-hidden="true">
          <span class="avatar-emoji">${b.emoji || '&#128104;'}</span>
        </div>
        <h3>${b.name}</h3>
        <p class="staff-role">${b.role}</p>
        <div class="staff-tags">
          <span class="pill">${b.years}+ yrs</span>
          <span class="pill">${b.workingDays.length} days</span>
        </div>
        <p class="staff-specialty">&#10024; ${b.specialty}</p>
        <div class="row-actions">
          <button class="btn btn-ghost btn-sm ripple" type="button" data-edit-barber="${b.id}">Edit</button>
          <button class="btn btn-ghost btn-sm danger ripple" type="button" data-del-barber="${b.id}">Delete</button>
        </div>
      </article>`
    )
    .join('');

  const modal = document.getElementById('barber-modal');
  const form = document.getElementById('barber-form');
  let editingId = null;

  const fillForm = (b) => {
    document.getElementById('bb-name').value = b.name;
    document.getElementById('bb-role').value = b.role;
    document.getElementById('bb-years').value = b.years;
    document.getElementById('bb-emoji').value = b.emoji || '';
    document.getElementById('bb-color').value = b.color || '#7c5cff';
    document.getElementById('bb-specialty').value = b.specialty || '';
    document.getElementById('bb-start').value = minutesToTime(b.startMinute);
    document.getElementById('bb-end').value = minutesToTime(b.endMinute);
    document.querySelectorAll('#bb-days input').forEach((cb) => {
      cb.checked = b.workingDays.includes(Number(cb.value));
    });
  };

  document.getElementById('add-barber-btn').addEventListener('click', () => {
    editingId = null;
    form.reset();
    document.getElementById('bb-start').value = '09:30';
    document.getElementById('bb-end').value = '20:30';
    document.getElementById('bb-color').value = '#7c5cff';
    document.querySelectorAll('#bb-days input').forEach((cb) => (cb.checked = true));
    document.querySelector('#bb-days input[value="0"]').checked = false;
    openModal(modal);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const workingDays = [...document.querySelectorAll('#bb-days input:checked')].map((cb) => Number(cb.value));
    if (!workingDays.length) {
      toast('Pick at least one working day.', 'warn');
      return;
    }
    const startMinute = timeToMinutes(document.getElementById('bb-start').value);
    const endMinute = timeToMinutes(document.getElementById('bb-end').value);
    if (startMinute >= endMinute) {
      toast('Close time must be after open time.', 'warn');
      return;
    }
    const data = {
      name: document.getElementById('bb-name').value.trim(),
      role: document.getElementById('bb-role').value.trim() || 'Barber',
      years: Number(document.getElementById('bb-years').value) || 0,
      emoji: document.getElementById('bb-emoji').value.trim() || '&#128104;',
      color: document.getElementById('bb-color').value,
      specialty: document.getElementById('bb-specialty').value.trim(),
      startMinute,
      endMinute,
      workingDays,
    };
    if (!data.name) return;

    staff = getStaff();
    if (editingId) {
      const idx = staff.findIndex((b) => b.id === editingId);
      if (idx > -1) staff[idx] = { ...staff[idx], ...data };
    } else {
      staff.push({ id: 'barber-' + Date.now().toString(36), ...data });
    }
    saveStaff(staff);
    closeModal(modal);
    toast(editingId ? 'Barber updated.' : 'Barber added.');
    renderStaff();
  });

  grid.addEventListener('click', (e) => {
    const edit = e.target.closest('[data-edit-barber]');
    if (edit) {
      editingId = edit.dataset.editBarber;
      const b = getStaff().find((x) => x.id === editingId);
      if (b) {
        fillForm(b);
        openModal(modal);
      }
      return;
    }
    const del = e.target.closest('[data-del-barber]');
    if (del) {
      const id = del.dataset.delBarber;
      if (confirm('Delete this barber?')) {
        saveStaff(getStaff().filter((b) => b.id !== id));
        toast('Barber removed.');
        renderStaff();
      }
    }
  });
}

/* ----------------------------- Bookings view --------------------------- */
function renderBookings() {
  const barberSel = document.getElementById('filter-barber');
  barberSel.innerHTML =
    '<option value="">All barbers</option>' +
    getStaff()
      .map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`)
      .join('');

  const apply = () => {
    const barberId = document.getElementById('filter-barber').value;
    const date = document.getElementById('filter-date').value;
    const status = document.getElementById('filter-status').value;

    let rows = getBookings();
    if (barberId) rows = rows.filter((b) => b.barberId === barberId);
    if (date) rows = rows.filter((b) => b.dateISO === date);
    if (status) rows = rows.filter((b) => b.status === status);
    rows.sort((a, b) => (a.dateISO < b.dateISO ? -1 : 1));

    const tbody = document.getElementById('bookings-tbody');
    const empty = document.getElementById('bookings-empty');
    tbody.innerHTML = rows
      .map(
        (b) => `
      <tr>
        <td><strong>${b.id}</strong><br /><span class="muted">${formatDateLong(fromISO(b.dateISO))}</span></td>
        <td><strong>${escapeHtml(b.customerName)}</strong><br /><span class="muted">${escapeHtml(b.customerPhone)}</span></td>
        <td>${escapeHtml(b.serviceName)}</td>
        <td>${escapeHtml(b.barberName)}</td>
        <td>${formatSlotTime(b.startMinute)}</td>
        <td>${formatINR(b.price)}</td>
        <td>${statusBadge(b, updateStatus)}</td>
      </tr>`
      )
      .join('');
    empty.hidden = rows.length > 0;
  };

  function updateStatus(id, status) {
    updateBookingStatus(id, status);
    toast('Booking marked ' + status + '.');
    apply();
  }

  barberSel.addEventListener('change', apply);
  document.getElementById('filter-date').addEventListener('change', apply);
  document.getElementById('filter-status').addEventListener('change', apply);

  document.getElementById('bookings-tbody').addEventListener('click', (e) => {
    const sel = e.target.closest('select[data-status]');
    if (sel) updateStatus(sel.dataset.status, sel.value);
  });

  apply();
}

function statusBadge(booking, updateStatus) {
  const current = booking.status || 'confirmed';
  const options = ['confirmed', 'completed', 'cancelled', 'no-show']
    .map((o) => `<option value="${o}"${o === current ? ' selected' : ''}>${o}</option>`)
    .join('');
  return `
    <select class="status-select status-${current}" data-status="${booking.id}" aria-label="Change status for ${booking.id}">
      ${options}
    </select>`;
}

/* ------------------------------ Helpers ------------------------------- */
function openModal(modal) {
  modal.hidden = false;
  document.body.classList.add('no-scroll');
  modal.querySelector('input, select, textarea')?.focus();
}

function closeModal(modal) {
  modal.hidden = true;
  document.body.classList.remove('no-scroll');
}

function timeToMinutes(v) {
  const [h, m] = String(v || '09:30').split(':').map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(min) {
  const h = Math.floor((min || 0) / 60);
  const m = (min || 0) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function initModalBackdrops() {
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) {
      const modal = document.getElementById(closeBtn.dataset.close);
      if (modal) closeModal(modal);
      return;
    }
    if (e.target.classList.contains('modal-backdrop')) closeModal(e.target);
  });
}

initModalBackdrops();