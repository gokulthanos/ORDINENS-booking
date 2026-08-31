import seedServices from './data/services.json';
import seedStaff from './data/staff.json';
import seedShops from './data/shops.json';
import { STORAGE_KEYS, readJSON, writeJSON, uid, toISO, fromISO } from './utils.js';

/* ------------------------------ Shops ------------------------------- */
export function getShops() {
  return readJSON(STORAGE_KEYS.shops, seedShops);
}

export function getShop(id) {
  return getShops().find((s) => s.id === id) || null;
}

export function saveShops(list) {
  writeJSON(STORAGE_KEYS.shops, list);
}

export function upsertShop(shop) {
  const list = getShops();
  const idx = list.findIndex((s) => s.id === shop.id);
  if (idx > -1) list[idx] = { ...list[idx], ...shop };
  else list.push(shop);
  saveShops(list);
}

/* ------------------------------ Services ------------------------------ */
export function getServices() {
  return readJSON(STORAGE_KEYS.services, seedServices);
}

export function getService(id) {
  return getServices().find((s) => s.id === id) || null;
}

export function saveServices(list) {
  writeJSON(STORAGE_KEYS.services, list);
}

export function addService(service) {
  const list = getServices();
  const item = { id: uid('svc'), ...service };
  list.push(item);
  saveServices(list);
  return item;
}

export function updateService(id, patch) {
  const list = getServices().map((s) => (s.id === id ? { ...s, ...patch } : s));
  saveServices(list);
  return list.find((s) => s.id === id);
}

export function deleteService(id) {
  saveServices(getServices().filter((s) => s.id !== id));
}

/* -------------------------------- Staff ------------------------------- */
export function getStaff() {
  return readJSON(STORAGE_KEYS.staff, seedStaff);
}

export function getBarber(id) {
  return getStaff().find((b) => b.id === id) || null;
}

export function saveStaff(list) {
  writeJSON(STORAGE_KEYS.staff, list);
}

export function addBarber(barber) {
  const list = getStaff();
  const item = {
    id: uid('barber'),
    workingDays: [1, 2, 3, 4, 5, 6],
    startMinute: 570,
    endMinute: 1230,
    ...barber,
  };
  list.push(item);
  saveStaff(list);
  return item;
}

export function updateBarber(id, patch) {
  const list = getStaff().map((b) => (b.id === id ? { ...b, ...patch } : b));
  saveStaff(list);
  return list.find((b) => b.id === id);
}

export function deleteBarber(id) {
  saveStaff(getStaff().filter((b) => b.id !== id));
}

/* ------------------------------ Bookings ------------------------------ */
export const PERIODS = ['morning', 'afternoon', 'evening'];

export function getBookings() {
  return readJSON(STORAGE_KEYS.bookings, []);
}

export function getBooking(id) {
  return getBookings().find((b) => b.id === id) || null;
}

export function saveBookings(list) {
  writeJSON(STORAGE_KEYS.bookings, list);
}

export function addBooking(booking) {
  const item = {
    id: uid('BK'),
    createdAt: new Date().toISOString(),
    status: 'pending',
    ...booking,
  };
  const list = getBookings();
  list.push(item);
  saveBookings(list);
  return item;
}

export function updateBookingStatus(id, status) {
  const list = getBookings().map((b) => (b.id === id ? { ...b, status } : b));
  saveBookings(list);
  return list.find((b) => b.id === id);
}

export function updateBooking(id, patch) {
  const list = getBookings().map((b) => (b.id === id ? { ...b, ...patch } : b));
  saveBookings(list);
  return list.find((b) => b.id === id);
}

/* ------------------------------ Slot engine --------------------------- */
export const SLOT_STEP = 30;

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function slotMinute(hhmm) {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToPeriod(minute) {
  if (minute < 12 * 60) return 'morning';
  if (minute < 16 * 60) return 'afternoon';
  return 'evening';
}

function normalizeShop(shop) {
  if (!shop) return null;
  const workingHours = shop.workingHours || {};
  const capacity = Number(shop.capacity) || 1;
  const breaks = Array.isArray(shop.breaks) ? shop.breaks : [];
  return { ...shop, workingHours, capacity, breaks };
}

/**
 * Whether a shop is open on a given date (by its configured working day).
 */
export function shopOpenOn(shop, dateISO) {
  if (!shop) return false;
  const day = fromISO(dateISO).getDay();
  const dayKey = DAY_NAMES[day];
  const dayCfg = (shop.workingHours || {})[dayKey] || (shop.workingHours || {})[String(day)];
  return Boolean(dayCfg && dayCfg.open);
}

/**
 * Effective opening/closing minutes for a shop on a date (respecting day config).
 */
export function shopDayHours(shop, dateISO) {
  const day = fromISO(dateISO).getDay();
  const dayKey = DAY_NAMES[day];
  const dayCfg = (shop.workingHours || {})[dayKey] || (shop.workingHours || {})[String(day)] || {};
  return {
    openMinute: slotMinute(dayCfg.start),
    closeMinute: slotMinute(dayCfg.end),
  };
}

/**
 * Returns the busy minute-blocks (break periods) for a shop on a date.
 */
export function shopBreakBlocks(shop) {
  return (shop && Array.isArray(shop.breaks) ? shop.breaks : []).map((br) => ({
    start: slotMinute(br.start),
    end: slotMinute(br.end),
  }));
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Does a service appointment [start, start+duration) overlap any break?
 */
export function overlapsBreak(shop, start, duration) {
  const end = start + duration;
  return shopBreakBlocks(shop).some(
    (b) => b.start != null && b.end != null && overlaps(start, end, b.start, b.end)
  );
}

/**
 * Compute how much of a given slot overlaps other (confirmed) bookings.
 * Returns the count of booking "seats" occupied during [start, start+duration).
 */
export function countConcurrent(shopId, dateISO, start, duration, ignoreBookingId) {
  const bookings = getBookings().filter(
    (b) =>
      b.shopId === shopId &&
      b.dateISO === dateISO &&
      b.status === 'confirmed' &&
      (b.startMinute != null) &&
      (ignoreBookingId == null || b.id !== ignoreBookingId)
  );
  let peak = 0;
  for (let t = start; t < start + duration; t += SLOT_STEP) {
    let count = 0;
    for (const b of bookings) {
      if (t >= b.startMinute && t < b.startMinute + b.duration) count++;
    }
    if (count > peak) peak = count;
  }
  return peak;
}

/**
 * Generate the list of valid exact-time slots the OWNER can allocate for a
 * pending booking on the requested date within the customer's preferred period.
 *
 * Considerations: working hours, breaks, capacity (number of barbers),
 * service duration, and existing confirmed bookings.
 */
export function generateOwnerSlots({ shop, service, dateISO, period, ignoreBookingId }) {
  const s = normalizeShop(shop);
  if (!s || !service) return [];
  if (!shopOpenOn(s, dateISO)) return [];
  const { openMinute, closeMinute } = shopDayHours(s, dateISO);
  if (openMinute == null || closeMinute == null || closeMinute <= openMinute) return [];

  const capacity = Math.max(1, s.capacity);
  const duration = Number(service.duration) || 30;

  const periodRange = {
    morning: [openMinute, Math.min(12 * 60, closeMinute)],
    afternoon: [Math.max(12 * 60, openMinute), Math.min(16 * 60, closeMinute)],
    evening: [Math.max(16 * 60, openMinute), closeMinute],
  }[period] || [openMinute, closeMinute];

  const [pStart, pEnd] = periodRange;
  const start = Math.max(openMinute, pStart);
  const end = Math.min(closeMinute, pEnd);

  const slots = [];
  for (let t = start; t + duration <= end; t += SLOT_STEP) {
    if (overlapsBreak(s, t, duration)) continue;
    if (countConcurrent(s.id, dateISO, t, duration, ignoreBookingId) >= capacity) continue;
    slots.push(t);
  }
  return slots;
}

/**
 * Compute the availability state for each period on a given date+shop+service.
 * Returns 'available' | 'limited' | 'full'.
 */
export function periodAvailability({ shop, service, dateISO }) {
  const s = normalizeShop(shop);
  if (!s || !service) return 'full';
  if (!shopOpenOn(s, dateISO)) return 'full';
  const out = {};
  for (const period of PERIODS) {
    const slots = generateOwnerSlots({ shop: s, service, dateISO, period });
    if (slots.length === 0) out[period] = 'full';
    else if (slots.length <= Math.max(1, s.capacity)) out[period] = 'limited';
    else out[period] = 'available';
  }
  return out;
}

export function formatSlotTime(startMinute) {
  if (startMinute == null) return '—';
  const h = Math.floor(startMinute / 60);
  const m = startMinute % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

/* ------------------------- Stats for dashboard ------------------------ */
export function getDashboardStats() {
  const bookings = getBookings();
  const services = getServices();
  const staff = getStaff();
  const today = toISO(new Date());
  const counts = { confirmed: 0, completed: 0, cancelled: 0, pending: 0, declined: 0, 'no-show': 0 };
  for (const b of bookings) counts[b.status] = (counts[b.status] || 0) + 1;
  const stats = {
    services: services.length,
    staff: staff.length,
    totalBookings: bookings.length,
    todayBookings: bookings.filter((b) => b.dateISO === today).length,
    revenue: bookings
      .filter((b) => b.status === 'completed' || b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.price || 0), 0),
    ...counts,
  };
  return stats;
}
