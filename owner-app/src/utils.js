/* =============================================================
   Ordinens Tech — Owner App Utilities
   Separate from customer-app. Keys prefixed ow_ to avoid
   collision if both apps run on same domain in future.
   ============================================================= */

export const OW_KEYS = {
  session:    'ow_session',      // owner login session
  shopConfig: 'ow_shop_config',  // shop configuration
  holidays:   'ow_holidays',     // array of holiday ISO dates
  seed:       'ow_seed',         // internal
};

// We read customer-app bookings & shops too (read-only from owner perspective)
export const CUSTOMER_KEYS = {
  bookings: 'pt_bookings',
  services: 'pt_services',
  staff:    'pt_staff',
  shops:    'pt_shops',
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
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function minutesTo24(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function timeToMinutes(v) {
  const [h, m] = String(v || '09:00').split(':').map(Number);
  return h * 60 + (m || 0);
}

export function toISO(date) {
  return date.toISOString().split('T')[0];
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
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

export function toast(message, type = 'success') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = `ow-toast ow-toast-${type}`;
  el.textContent = message;
  el.setAttribute('role', 'status');
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

export function getDayName(dayNum) {
  return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayNum];
}

export function getDayShort(dayNum) {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dayNum];
}
