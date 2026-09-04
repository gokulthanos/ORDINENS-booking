/* =============================================================
   Ordinens Tech — Owner App Data Layer
   Shop-based model that mirrors the customer app's `pt_shops`
   shape so both apps interoperate over shared localStorage.

   Booking model (shop-based):
   { id, shopId, shopName, serviceName, serviceId, price, duration,
     dateISO, period, customerName, customerPhone, customerIdentifier,
     customerNote, startMinute (null until owner allocates),
     status: pending|confirmed|declined|completed|cancelled|no-show,
     createdAt }
   ============================================================= */
import { OW_KEYS, CUSTOMER_KEYS, readJSON, writeJSON, uid, timeToMinutes, toISO, fromISO } from './utils.js';
import seedServices from './data/seed-services.json';
import seedStaff from './data/seed-staff.json';

export const PERIODS = ['morning', 'afternoon', 'evening'];
export const SLOT_STEP = 30;

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function seedDefaultHours() {
  const wh = {};
  for (let i = 0; i < 7; i++) {
    wh[DAY_NAMES[i]] = { open: i !== 0, start: '09:00', end: '21:00' };
  }
  return wh;
}

export const DEFAULT_OWNER_SHOP = {
  id: 'ow-shop',
  name: '',
  shopType: 'barber shop',
  phone: '',
  address: '',
  description: '',
  location: 'Coimbatore',
  area: '',
  status: 'open',
  capacity: 3,
  bookingWindow: 30,
  cancellationHours: 2,
  workingHours: seedDefaultHours(),
  breaks: [],
  services: [],
  onboarded: false,
};

/* ─────────────────── Shop Configuration ─────────────────────── */
export function getShopConfig() {
  const config = readJSON(OW_KEYS.shopConfig, null);
  // Fresh install: seed from defaults + seed services/staff
  if (!config || typeof config !== 'object') {
    const fresh = {
      ...DEFAULT_OWNER_SHOP,
      services: seedServices.map(s => ({
        id: s.id, name: s.name, duration: s.duration, price: s.price,
        active: s.active !== false, description: s.description || '',
      })),
      staff: seedStaff,
    };
    writeJSON(OW_KEYS.shopConfig, fresh);
    return fresh;
  }
  // Normalize day names for workingHours if stored as numeric keys
  if (config.workingHours && !config.workingHours.sun && config.workingHours['1']) {
    const wh = {};
    for (let i = 0; i < 7; i++) {
      const d = config.workingHours[String(i)] || { open: i !== 0, start: '09:00', end: '21:00' };
      wh[DAY_NAMES[i]] = d;
    }
    config.workingHours = wh;
  }
  if (!Array.isArray(config.services)) config.services = [];
  if (config.staff === undefined) config.staff = seedStaff;
  return config;
}

export function saveShopConfig(config) {
  writeJSON(OW_KEYS.shopConfig, config);
  mirrorShopToCustomer(config);
}

export function patchShopConfig(patch) {
  const updated = { ...getShopConfig(), ...patch };
  saveShopConfig(updated);
  return updated;
}

/* Mirror the owner's shop into the customer app's pt_shops list so
   the customer app surfaces the owner's shop, services and rules. */
export function mirrorShopToCustomer(config) {
  const raw = localStorage.getItem(CUSTOMER_KEYS.shops) || '[]';
  let shops = [];
  try { shops = JSON.parse(raw); } catch { shops = []; }
  const shop = {
    id: config.id,
    name: config.name,
    shopType: config.shopType,
    phone: config.phone,
    address: config.address,
    description: config.description,
    location: config.location,
    area: config.area,
    status: config.status || 'open',
    capacity: config.capacity,
    bookingWindow: config.bookingWindow,
    cancellationHours: config.cancellationHours,
    workingHours: config.workingHours,
    breaks: config.breaks || [],
    services: (config.services || []).filter(s => s.active !== false).map(s => ({
      id: s.id, name: s.name, price: s.price, duration: s.duration, active: true,
    })),
    onboarded: Boolean(config.onboarded),
  };
  const idx = shops.findIndex(s => s.id === shop.id);
  if (idx > -1) shops[idx] = shop;
  else shops.push(shop);
  writeJSON(CUSTOMER_KEYS.shops, shops);
  // Mirror services to shared services key for anything that reads it
  writeJSON(CUSTOMER_KEYS.services, (config.services || []).filter(s => s.active !== false));
}

export function getOwnerShop() {
  return getShopConfig();
}

/* ─────────────────── Holidays ───────────────────────────── */
export function getHolidays() {
  return readJSON(OW_KEYS.holidays, []);
}

export function saveHolidays(list) {
  writeJSON(OW_KEYS.holidays, list);
}

export function addHoliday(dateISO, label = 'Shop Closed') {
  const list = getHolidays();
  if (list.find(h => h.dateISO === dateISO)) return list;
  list.push({ id: uid('hol'), dateISO, label });
  list.sort((a, b) => a.dateISO < b.dateISO ? -1 : 1);
  saveHolidays(list);
  return list;
}

export function updateHoliday(id, patch) {
  const list = getHolidays().map(h => h.id === id ? { ...h, ...patch } : h);
  list.sort((a, b) => a.dateISO < b.dateISO ? -1 : 1);
  saveHolidays(list);
  return list.find(h => h.id === id) || null;
}

export function removeHoliday(id) {
  saveHolidays(getHolidays().filter(h => h.id !== id));
}

export function isHoliday(dateISO) {
  return getHolidays().some(h => h.dateISO === dateISO);
}

/* ─────────────────── Services (inline on shop) ───────────── */
export function getServices() {
  return getShopConfig().services || [];
}

export function saveServices(list) {
  patchShopConfig({ services: list });
}

export function addService(service) {
  const list = getServices();
  const item = { id: uid('svc'), active: true, ...service };
  list.push(item);
  patchShopConfig({ services: list });
  return item;
}

export function updateService(id, patch) {
  const list = getServices().map(s => s.id === id ? { ...s, ...patch } : s);
  patchShopConfig({ services: list });
  return getService(id);
}

export function deleteService(id) {
  patchShopConfig({ services: getServices().filter(s => s.id !== id) });
}

export function getService(id) {
  return getServices().find(s => s.id === id) || null;
}

/* ─────────────────── Staff / Barbers (informational) ──────── */
export function getStaff() {
  const cfg = getShopConfig();
  return cfg.staff || [];
}

export function saveStaff(list) {
  patchShopConfig({ staff: list });
}

export function getBarber(id) {
  return getStaff().find(b => b.id === id) || null;
}

export function addBarber(barber) {
  const list = getStaff();
  const item = { id: uid('barber'), workingDays: [1,2,3,4,5,6], startMinute: 570, endMinute: 1230, active: true, ...barber };
  list.push(item);
  saveStaff(list);
  return item;
}

export function updateBarber(id, patch) {
  const list = getStaff().map(b => b.id === id ? { ...b, ...patch } : b);
  saveStaff(list);
  return getBarber(id);
}

export function deleteBarber(id) {
  saveStaff(getStaff().filter(b => b.id !== id));
}

/* ─────────────────── Bookings (shared pt_bookings) ────────── */
export function getBookings() {
  return readJSON(CUSTOMER_KEYS.bookings, []);
}

export function saveBookings(list) {
  writeJSON(CUSTOMER_KEYS.bookings, list);
}

export function getBooking(id) {
  return getBookings().find(b => b.id === id) || null;
}

export function updateBookingStatus(id, status) {
  const booking = getBooking(id);
  if (!booking) return null;
  const list = getBookings().map(b => b.id === id && b.status !== 'completed' && b.status !== 'declined' && b.status !== 'cancelled' && b.status !== 'no-show'
    ? { ...b, status }
    : b
  );
  // Simpler: only allow if not in an absorbing terminal state
  saveBookings(list);
  return getBooking(id);
}

export function allocateAndConfirm(id, startMinute) {
  const booking = getBooking(id);
  if (!booking || booking.status !== 'pending') return { ok: false, reason: 'invalid' };
  const shop = getShopConfig();
  const service = (shop.services || []).find(s => s.id === booking.serviceId) ||
    { duration: booking.duration || 30 };
  // Slots are computed ignoring this pending booking; a slot is valid only if
  // it would not exceed capacity with the already-confirmed bookings + this one.
  const slots = generateOwnerSlots({ shop, service, dateISO: booking.dateISO, period: booking.period });
  if (!slots.includes(startMinute)) {
    return { ok: false, reason: 'unavailable' };
  }
  const list = getBookings().map(b =>
    b.id === id ? { ...b, status: 'confirmed', startMinute, allocatedAt: new Date().toISOString() } : b
  );
  saveBookings(list);
  return { ok: true, booking: getBooking(id) };
}

export function declineBooking(id) {
  const b = getBooking(id);
  if (!b || b.status !== 'pending') return null;
  const list = getBookings().map(x => x.id === id ? { ...x, status: 'declined' } : x);
  saveBookings(list);
  return getBooking(id);
}

/* ─────────────────── Slot Engine (shop-based) ─────────────── */
export function slotMinute(hhmm) {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function shopOpenOn(shop, dateISO) {
  if (!shop) return false;
  const day = DAY_NAMES[fromISO(dateISO).getDay()];
  const dayCfg = (shop.workingHours || {})[day];
  return Boolean(dayCfg && dayCfg.open);
}

export function shopDayHours(shop, dateISO) {
  const day = DAY_NAMES[fromISO(dateISO).getDay()];
  const dayCfg = (shop.workingHours || {})[day] || {};
  return { openMinute: slotMinute(dayCfg.start), closeMinute: slotMinute(dayCfg.end) };
}

export function shopBreakBlocks(shop) {
  return (shop && Array.isArray(shop.breaks) ? shop.breaks : []).map(br => ({
    start: slotMinute(br.start), end: slotMinute(br.end),
  }));
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

export function overlapsBreak(shop, start, duration) {
  const end = start + duration;
  return shopBreakBlocks(shop).some(b => b.start != null && b.end != null && overlaps(start, end, b.start, b.end));
}

export function countConcurrent(shopId, dateISO, start, duration, ignoreBookingId) {
  const bookings = getBookings().filter(b =>
    b.shopId === shopId && b.dateISO === dateISO && b.status === 'confirmed' &&
    b.startMinute != null && (ignoreBookingId == null || b.id !== ignoreBookingId)
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
 * Valid exact-time slots the owner can allocate for a pending booking on the
 * requested date within the customer's preferred period. Considers working
 * hours, breaks, capacity, service duration and existing confirmed bookings.
 */
export function generateOwnerSlots({ shop, service, dateISO, period, ignoreBookingId }) {
  if (!shop || !service) return [];
  if (isHoliday(dateISO)) return [];
  if (!shopOpenOn(shop, dateISO)) return [];
  const { openMinute, closeMinute } = shopDayHours(shop, dateISO);
  if (openMinute == null || closeMinute == null || closeMinute <= openMinute) return [];
  const capacity = Math.max(1, Number(shop.capacity) || 1);
  const duration = Number(service.duration) || 30;

  const periodRange = {
    morning: [openMinute, Math.min(12 * 60, closeMinute)],
    afternoon: [Math.max(12 * 60, openMinute), Math.min(16 * 60, closeMinute)],
    evening: [Math.max(16 * 60, openMinute), closeMinute],
  }[period] || [openMinute, closeMinute];

  const start = Math.max(openMinute, periodRange[0]);
  const end = Math.min(closeMinute, periodRange[1]);

  const slots = [];
  for (let t = start; t + duration <= end; t += SLOT_STEP) {
    if (overlapsBreak(shop, t, duration)) continue;
    if (countConcurrent(shop.id, dateISO, t, duration, ignoreBookingId) >= capacity) continue;
    slots.push(t);
  }
  return slots;
}

export function periodAvailability({ shop, service, dateISO }) {
  if (!shop || !service) return { morning: 'full', afternoon: 'full', evening: 'full' };
  const out = {};
  for (const period of PERIODS) {
    const slots = generateOwnerSlots({ shop, service, dateISO, period });
    if (slots.length === 0) out[period] = 'full';
    else if (slots.length <= Math.max(1, shop.capacity)) out[period] = 'limited';
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

export function periodLabel(p) {
  return { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' }[p] || '—';
}

/* ─────────────────── Dashboard stats ──────────────────────── */
export function getOwnerDashboardStats() {
  const bookings = getBookings().filter(b => b.shopId === getShopConfig().id);
  const services = getServices().filter(s => s.active !== false);
  const staff = getStaff().filter(b => b.active !== false);
  const today = toISO(new Date());

  const todayBookings = bookings.filter(b => b.dateISO === today);
  const counts = { confirmed: 0, completed: 0, cancelled: 0, 'no-show': 0, pending: 0, declined: 0 };
  for (const b of bookings) counts[b.status] = (counts[b.status] || 0) + 1;

  const pendingAll = bookings.filter(b => b.status === 'pending');
  const upcomingAll = bookings.filter(b =>
    (b.status === 'confirmed' || b.status === 'pending') && b.dateISO >= today
  );

  const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  const nextBooking = todayBookings
    .filter(b => (b.status === 'confirmed' || b.status === 'pending') && (b.startMinute ?? 1440) >= nowMin())
    .sort((a, b) => (a.startMinute ?? 1440) - (b.startMinute ?? 1440))[0] || null;

  return {
    services: services.length,
    staff: staff.length,
    todayTotal: todayBookings.length,
    todayCompleted: counts.completed,
    todayUpcoming: counts.confirmed + counts.pending,
    todayCancelled: counts.cancelled,
    todayNoShow: counts['no-show'],
    pendingAll: pendingAll.length,
    pendingBookings: pendingAll.sort((a, b) => a.dateISO < b.dateISO ? -1 : 1),
    upcomingAll: upcomingAll.length,
    nextBooking,
    todayBookings: todayBookings.sort((a, b) => (a.startMinute ?? 1440) - (b.startMinute ?? 1440)),
  };
}
