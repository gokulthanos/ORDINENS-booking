/* =============================================================
   Ordinens Tech — Admin Panel Utilities
   Separate application. All storage keys prefixed "admin_"
   to prevent collisions with customer (pt_) and owner (ow_) apps.
   ============================================================= */

export const AD_KEYS = {
  session: 'admin_session',
  users: 'admin_users',
  settings: 'admin_settings',
  theme: 'admin_theme',
  shops: 'admin_shops',
  customers: 'admin_customers',
  issues: 'admin_issues',
  dataVersion: 'admin_data_version',
  // Read-only references to platform data written by the other apps
  bookings: 'pt_bookings',
  services: 'pt_services',
  staff: 'pt_staff',
};

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatINR(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

export function minutesToLabel(minutes) {
  const m = Number(minutes) || 0;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${period}`;
}

export function toISO(date) {
  return date.toISOString().split('T')[0];
}

export function fromISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDateLong(date) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateShort(date) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function toast(message, type = 'success') {
  const wrap = document.getElementById('ad-toast-wrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = `ad-toast ad-toast-${type}`;
  el.setAttribute('role', 'status');
  el.textContent = message;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
