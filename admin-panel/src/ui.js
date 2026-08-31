/* =============================================================
   Admin Panel — Shared UI helpers
   ============================================================= */
import { escapeHtml } from './utils.js';

// Map a booking status to a pill class
export function statusClass(status) {
  return {
    pending: 'ad-pill-warn',
    confirmed: 'ad-pill-info',
    completed: 'ad-pill-ok',
    'no-show': 'ad-pill-bad',
    cancelled: 'ad-pill-neutral',
  }[status] || 'ad-pill-neutral';
}

export function shopStatusClass(status) {
  return {
    pending: 'ad-pill-warn',
    active: 'ad-pill-ok',
    suspended: 'ad-pill-bad',
    inactive: 'ad-pill-neutral',
  }[status] || 'ad-pill-neutral';
}

export function statusLabel(status) {
  return (status || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function pill(status, cls) {
  return `<span class="ad-pill ${cls}">${escapeHtml(statusLabel(status))}</span>`;
}

export function emptyState(icon, title, message) {
  return `
    <div class="ad-empty">
      <div class="ad-empty-icon" aria-hidden="true">${icon}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>`;
}
