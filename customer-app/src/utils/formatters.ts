export const STORAGE_KEYS = {
  session: 'pt_session',
  users: 'pt_users',
  theme: 'pt_theme',
  bookings: 'pt_bookings',
  services: 'pt_services',
  staff: 'pt_staff',
  shops: 'pt_shops',
  holidays: 'ow_holidays',
};

export function formatINR(amount: number | string | undefined | null): string {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

export function minutesTo24(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDateLong(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function toISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatSlotTime(startMinute: number | null | undefined): string {
  if (startMinute == null) return '—';
  const h = Math.floor(startMinute / 60);
  const m = startMinute % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}
