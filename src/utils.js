export const STORAGE_KEYS = {
  session: 'pt_session',
  users: 'pt_users',
  admin: 'pt_admin',
  theme: 'pt_theme',
  bookings: 'pt_bookings',
  services: 'pt_services',
  staff: 'pt_staff',
  shops: 'pt_shops',
  holidays: 'ow_holidays',
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

export function toISO(date) {
  return date.toISOString().split('T')[0];
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function toast(message, type = 'info') {
  const wrap = document.getElementById('toast-wrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = message;
  el.setAttribute('role', 'status');
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

export function download(filename, content, mime = 'text/calendar') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildICS(booking, service, barber) {
  const { dateISO, startMinute, id } = booking;
  const d = fromISO(dateISO);
  const start = new Date(d);
  start.setHours(Math.floor(startMinute / 60), startMinute % 60, 0, 0);
  const end = new Date(start.getTime() + (service.duration + 15) * 60000);
  const fmt = (dt) =>
    dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const summary = `Haircut with ${barber.name}`;
  const location = 'Ordinens Tech Barber Salon';
  const desc =
    `Service: ${service.name}\n` +
    `Barber: ${barber.name}\n` +
    `Booking ID: ${id}\n` +
    `Estimated duration: ${service.duration} min`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ordinens Tech//Barber Salon//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${id}@ordinens.tech`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${desc.replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}