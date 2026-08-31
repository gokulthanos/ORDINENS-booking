/* =============================================================
   Admin Panel — Issues / Support
   Future-ready support workflow structure.
   Uses the real local issue collection (admin_issues).
   If there are no issues, a clean "No issues reported" empty
   state is shown — we never fabricate fake issues.
   ============================================================= */
import { getIssues, addIssue, setIssueStatus, getShops, getBookings } from '../../data.js';
import { escapeHtml, formatDateShort, fromISO, toast } from '../../utils.js';
import { pill, emptyState } from '../../ui.js';

export function mountIssues() {
  const content = document.getElementById('ad-content');
  const shops = getShops();
  const bookings = getBookings();
  const issues = getIssues();

  const render = () => {
    const list = getIssues();
    content.innerHTML = `
      <div class="ad-page-head">
        <div>
          <h1 class="ad-page-title">Issues & Support</h1>
          <p class="ad-page-sub">Platform issues and support requests (future-ready workflow).</p>
        </div>
        <button class="ad-btn ad-btn-primary" id="report-issue-btn" type="button">+ Report issue</button>
      </div>
      <div class="ad-card">
        ${list.length ? renderTable(list) : emptyState('⚠️', 'No issues reported', 'When customers or owners report platform problems, they will appear here.')}
      </div>`;

    document.getElementById('report-issue-btn').addEventListener('click', () => openReport(shops, bookings, render));

    content.addEventListener('click', (e) => {
      const sel = e.target.closest('[data-issue-status-trigger]');
      if (sel) {
        const id = sel.dataset.issueStatusTrigger;
        const issue = getIssues().find((i) => i.id === id);
        if (!issue) return;
        openStatusMenu(id, issue.status, sel, render);
      }
    });
  };

  render();
}

function renderTable(list) {
  return `
    <div class="ad-table-wrap">
      <table class="ad-table">
        <thead>
          <tr>
            <th>Issue ID</th>
            <th>Reported by</th>
            <th>Type</th>
            <th>Related booking</th>
            <th>Shop</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          ${list
            .slice()
            .sort((a, b) => (b.createdDate || '').localeCompare(a.createdDate || ''))
            .map(
              (i) => `
            <tr>
              <td><strong>${escapeHtml(i.id)}</strong></td>
              <td>${escapeHtml(i.reportedBy || '—')}</td>
              <td>${escapeHtml(cap(i.type))}</td>
              <td>${escapeHtml(i.relatedBooking || '—')}</td>
              <td>${escapeHtml(i.shopId || '—')}</td>
              <td>
                <button class="ad-btn ad-btn-ghost ad-btn-sm" data-issue-status-trigger="${escapeHtml(i.id)}" type="button">
                  ${pill(i.status, issueStatusClass(i.status))}
                </button>
              </td>
              <td>${i.createdDate ? formatDateShort(fromISO(i.createdDate)) : '—'}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function issueStatusClass(status) {
  return {
    open: 'ad-pill-bad',
    in_progress: 'ad-pill-warn',
    resolved: 'ad-pill-ok',
  }[status] || 'ad-pill-neutral';
}

function cap(s) {
  return String(s || '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

async function openStatusMenu(id, current, anchor, render) {
  const options = ['open', 'in_progress', 'resolved'].filter((o) => o !== current);
  const choice = await pickOption(
    anchor,
    'Set issue status',
    options.map((o) => ({ value: o, label: cap(o) }))
  );
  if (!choice) return;
  setIssueStatus(id, choice);
  toast('Issue status updated.');
  render();
}

function pickOption(anchor, title, options) {
  return new Promise((resolve) => {
    const dialog = document.createElement('div');
    dialog.className = 'ad-modal';
    dialog.setAttribute('role', 'dialog');
    dialog.innerHTML = `
      <div class="ad-modal-backdrop" data-close></div>
      <div class="ad-modal-panel">
        <h2 class="ad-confirm-title">${title}</h2>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
          ${options
            .map((o) => `<button class="ad-btn ad-btn-ghost" data-opt="${escapeHtml(o.value)}" type="button">${escapeHtml(o.label)}</button>`)
            .join('')}
        </div>
      </div>`;
    document.body.appendChild(dialog);

    const done = (val) => {
      dialog.remove();
      resolve(val);
    };
    dialog.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) done(null);
      const opt = e.target.closest('[data-opt]');
      if (opt) done(opt.dataset.opt);
    });
  });
}

function openReport(shops, bookings, render) {
  const content = document.getElementById('ad-content');
  content.insertAdjacentHTML(
    'beforeend',
    `<div id="report-issue-dialog" class="ad-modal" role="dialog" aria-modal="true" aria-labelledby="report-issue-title">
      <div class="ad-modal-backdrop" data-close-dialog></div>
      <div class="ad-modal-panel">
        <h2 class="ad-confirm-title" id="report-issue-title">Report an issue</h2>
        <form id="report-issue-form">
          <div class="ad-issue-form-grid">
            <div class="ad-field"><label for="ri-by">Reported by</label><input class="ad-input" id="ri-by" /></div>
            <div class="ad-field">
              <label for="ri-type">Type</label>
              <select class="ad-select" id="ri-type">
                <option value="general">General</option>
                <option value="payment">Payment</option>
                <option value="booking">Booking</option>
                <option value="technical">Technical</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div class="ad-issue-form-grid">
            <div class="ad-field">
              <label for="ri-booking">Related booking</label>
              <select class="ad-select" id="ri-booking">
                <option value="">—</option>
                ${bookings.map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.id)}</option>`).join('')}
              </select>
            </div>
            <div class="ad-field">
              <label for="ri-shop">Shop</label>
              <select class="ad-select" id="ri-shop">
                <option value="">—</option>
                ${shops.map((s) => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="ad-field"><label for="ri-notes">Notes</label><textarea class="ad-input" id="ri-notes" rows="3"></textarea></div>
          <div class="ad-confirm-actions">
            <button type="button" class="ad-btn ad-btn-ghost" data-close-dialog>Cancel</button>
            <button type="submit" class="ad-btn ad-btn-primary">Report issue</button>
          </div>
        </form>
      </div>
    </div>`
  );

  const dialog = document.getElementById('report-issue-dialog');
  const close = () => dialog.remove();
  dialog.addEventListener('click', (e) => {
    if (e.target.closest('[data-close-dialog]')) close();
  });

  document.getElementById('report-issue-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const reportedBy = document.getElementById('ri-by').value.trim();
    if (!reportedBy) {
      toast('Reported by is required.', 'warn');
      return;
    }
    addIssue({
      reportedBy,
      type: document.getElementById('ri-type').value,
      relatedBooking: document.getElementById('ri-booking').value,
      shopId: document.getElementById('ri-shop').value,
      notes: document.getElementById('ri-notes').value.trim(),
    });
    toast('Issue reported.');
    close();
    render();
  });
}
