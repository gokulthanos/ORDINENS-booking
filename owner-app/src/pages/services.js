/* =============================================================
   Owner App — Services Page
   ============================================================= */
import {
  getServices, saveServices, addService, updateService, deleteService
} from '../data.js';
import { escapeHtml, formatINR, toast } from '../utils.js';

export default function mount(app) {
  render(app);
}

function render(app) {
  const services = getServices();

  app.innerHTML = `
    <div class="ow-page-header">
      <div>
        <h1 class="ow-page-title">Services</h1>
        <p class="ow-page-sub">${services.length} service${services.length !== 1 ? 's' : ''} configured</p>
      </div>
      <button class="ow-btn ow-btn-primary ripple" type="button" id="add-svc-btn">+ Add Service</button>
    </div>

    <div class="ow-table-wrap">
      <table class="ow-table" aria-label="Services list">
        <thead>
          <tr>
            <th>Service</th>
            <th>Duration</th>
            <th>Price</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="svc-tbody">
          ${services.length ? services.map(s => svcRow(s)).join('') : `
          <tr><td colspan="5">
            <div class="ow-empty">
              <div class="ow-empty-icon">✂</div>
              <div class="ow-empty-title">No services yet</div>
              <div class="ow-empty-sub">Add your first service to start accepting bookings.</div>
            </div>
          </td></tr>`}
        </tbody>
      </table>
    </div>

    <!-- Service Modal -->
    <div id="svc-modal" class="ow-modal-backdrop" hidden>
      <div class="ow-modal" role="dialog" aria-modal="true" aria-labelledby="svc-modal-title">
        <div class="ow-modal-header">
          <h2 class="ow-modal-title" id="svc-modal-title">Add Service</h2>
          <button class="ow-modal-close" type="button" id="svc-modal-close" aria-label="Close">✕</button>
        </div>
        <form id="svc-form" novalidate>
          <div class="ow-form-row">
            <div class="ow-form-group" id="fg-sv-name">
              <label class="ow-label" for="sv-name">Service Name *</label>
              <input id="sv-name" class="ow-input" type="text" placeholder="e.g. Classic Haircut" required />
              <span class="ow-field-error">Name is required.</span>
            </div>
            <div class="ow-form-group">
              <label class="ow-label" for="sv-emoji">Emoji</label>
              <input id="sv-emoji" class="ow-input" type="text" placeholder="✂" maxlength="4" />
            </div>
          </div>
          <div class="ow-form-row">
            <div class="ow-form-group" id="fg-sv-dur">
              <label class="ow-label" for="sv-duration">Duration (minutes) *</label>
              <input id="sv-duration" class="ow-input" type="number" min="1" max="360" placeholder="30" required />
              <span class="ow-field-error">Duration is required and must be greater than 0.</span>
            </div>
            <div class="ow-form-group" id="fg-sv-price">
              <label class="ow-label" for="sv-price">Price (₹) *</label>
              <input id="sv-price" class="ow-input" type="number" min="0" placeholder="150" required />
              <span class="ow-field-error">Price is required and must not be negative.</span>
            </div>
          </div>
          <div class="ow-form-group">
            <label class="ow-label" for="sv-desc">Description (optional)</label>
            <textarea id="sv-desc" class="ow-textarea" rows="2" placeholder="Brief description shown to customers"></textarea>
          </div>
          <div class="ow-form-group">
            <div class="ow-toggle-wrap">
              <div>
                <div class="ow-label">Active</div>
                <div class="ow-hint">Inactive services won't be shown to customers.</div>
              </div>
              <label class="ow-toggle">
                <input type="checkbox" id="sv-active" checked />
                <span class="ow-toggle-track"></span>
              </label>
            </div>
          </div>
          <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:8px;">
            <button class="ow-btn ow-btn-ghost" type="button" id="svc-cancel-btn">Cancel</button>
            <button class="ow-btn ow-btn-primary ripple" type="submit" id="svc-submit-btn">Save Service</button>
          </div>
        </form>
      </div>
    </div>`;

  let editingId = null;
  const modal = document.getElementById('svc-modal');
  const form = document.getElementById('svc-form');
  const modalTitle = document.getElementById('svc-modal-title');

  function openModal(service = null) {
    editingId = service?.id || null;
    modalTitle.textContent = service ? 'Edit Service' : 'Add Service';
    document.getElementById('sv-name').value = service?.name || '';
    document.getElementById('sv-emoji').value = service?.emoji || '✂';
    document.getElementById('sv-duration').value = service?.duration || '';
    document.getElementById('sv-price').value = service?.price ?? '';
    document.getElementById('sv-desc').value = service?.description || '';
    document.getElementById('sv-active').checked = service?.active !== false;
    // clear errors
    ['fg-sv-name','fg-sv-dur','fg-sv-price'].forEach(id => document.getElementById(id)?.classList.remove('error'));
    modal.hidden = false;
    document.getElementById('sv-name').focus();
  }

  function closeModal() { modal.hidden = true; }

  document.getElementById('add-svc-btn').addEventListener('click', () => openModal());
  document.getElementById('svc-modal-close').addEventListener('click', closeModal);
  document.getElementById('svc-cancel-btn').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Table actions
  app.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit-svc]');
    if (editBtn) {
      const s = getServices().find(x => x.id === editBtn.dataset.editSvc);
      if (s) openModal(s);
      return;
    }
    const toggleBtn = e.target.closest('[data-toggle-svc]');
    if (toggleBtn) {
      const s = getServices().find(x => x.id === toggleBtn.dataset.toggleSvc);
      if (s) {
        updateService(s.id, { active: !s.active });
        toast(s.active ? 'Service deactivated' : 'Service activated');
        render(app);
      }
      return;
    }
    const delBtn = e.target.closest('[data-del-svc]');
    if (delBtn) {
      if (confirm('Delete this service? This cannot be undone.')) {
        deleteService(delBtn.dataset.delSvc);
        toast('Service deleted');
        render(app);
      }
    }
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name     = document.getElementById('sv-name').value.trim();
    const duration = Number(document.getElementById('sv-duration').value);
    const price    = Number(document.getElementById('sv-price').value);
    const active   = document.getElementById('sv-active').checked;

    let valid = true;
    document.getElementById('fg-sv-name').classList.toggle('error', !name);
    document.getElementById('fg-sv-dur').classList.toggle('error', !duration || duration <= 0);
    document.getElementById('fg-sv-price').classList.toggle('error', isNaN(price) || price < 0);
    if (!name || !duration || duration <= 0 || isNaN(price) || price < 0) valid = false;
    if (!valid) return;

    const data = {
      name,
      emoji: document.getElementById('sv-emoji').value.trim() || '✂',
      duration,
      price,
      description: document.getElementById('sv-desc').value.trim(),
      active,
    };

    if (editingId) {
      updateService(editingId, data);
      toast('Service updated');
    } else {
      addService(data);
      toast('Service added');
    }
    closeModal();
    render(app);
  });
}

function svcRow(s) {
  return `
    <tr>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.2rem;">${s.emoji || '✂'}</span>
          <div>
            <div style="font-weight:600;">${escapeHtml(s.name)}</div>
            ${s.description ? `<div style="font-size:0.72rem; color:var(--text-muted);">${escapeHtml(s.description)}</div>` : ''}
          </div>
        </div>
      </td>
      <td>${s.duration} min</td>
      <td><strong>${formatINR(s.price)}</strong></td>
      <td>
        <span class="ow-badge ${s.active !== false ? 'ow-badge-active' : 'ow-badge-inactive'}">
          ${s.active !== false ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="ow-btn ow-btn-ghost ow-btn-sm" type="button" data-edit-svc="${s.id}">Edit</button>
          <button class="ow-btn ow-btn-ghost ow-btn-sm" type="button" data-toggle-svc="${s.id}">
            ${s.active !== false ? 'Deactivate' : 'Activate'}
          </button>
          <button class="ow-btn ow-btn-danger ow-btn-sm" type="button" data-del-svc="${s.id}">Delete</button>
        </div>
      </td>
    </tr>`;
}
