/* =============================================================
   Ordinens Tech — Admin Panel Data Layer
   Admin sees the ENTIRE platform:
     - Bookings / services / barbers / customers come from the
       shared prototype data (pt_* keys), same as the other apps.
     - Shops and Issues are admin-managed collections stored
       under admin_* keys.

   This layer is intentionally thin and reads like a REST client
   so that in a future phase each function can be swapped for a
   call to the COMMON backend (GET /api/admin/...).
   ============================================================= */
import { AD_KEYS, readJSON, writeJSON, uid, toISO } from './utils.js';

/* ─────────────────── Read platform collections ─────────────── */

// Bookings are created by the customer app and shared via pt_bookings
export function getBookings() {
  return readJSON(AD_KEYS.bookings, []);
}

export function getBooking(id) {
  return getBookings().find((b) => b.id === id) || null;
}

// Services shared via pt_services
export function getServices() {
  return readJSON(AD_KEYS.services, []);
}

// Barbers (staff) shared via pt_staff
export function getBarbers() {
  return readJSON(AD_KEYS.staff, []);
}

// Customers are registered users in pt_users (map of identifier -> user)
export function getCustomers() {
  const users = readJSON('pt_users', {});
  return Object.values(users).map((u) => ({ ...u, id: u.id || u.identifier }));
}

/* ─────────────────── Admin-managed: Shops ──────────────────── */
const DEFAULT_SHOP = {
  id: '',
  name: '',
  ownerName: '',
  ownerPhone: '',
  location: '',
  address: '',
  type: 'barber',
  status: 'pending', // pending | active | suspended | inactive
  createdAt: '',
  description: '',
};

export function getShops() {
  const shops = readJSON(AD_KEYS.shops, []);
  // Enrich each shop with live aggregates from platform data
  return shops.map((s) => enrichShop(s));
}

export function getShop(id) {
  const shops = readJSON(AD_KEYS.shops, []);
  const shop = shops.find((s) => s.id === id);
  return shop ? enrichShop(shop) : null;
}

export function addShop(data) {
  const shops = readJSON(AD_KEYS.shops, []);
  const shop = {
    ...DEFAULT_SHOP,
    ...data,
    id: uid('shop'),
    createdAt: data.createdAt || new Date().toISOString(),
  };
  shops.push(shop);
  writeJSON(AD_KEYS.shops, shops);
  return shop;
}

export function updateShop(id, patch) {
  const shops = readJSON(AD_KEYS.shops, []);
  const next = shops.map((s) => (s.id === id ? { ...s, ...patch } : s));
  writeJSON(AD_KEYS.shops, next);
  return next.find((s) => s.id === id) || null;
}

export function setShopStatus(id, status) {
  const valid = ['pending', 'active', 'suspended', 'inactive'];
  if (!valid.includes(status)) return null;
  const shop = getShop(id);
  if (!shop) return null;
  return updateShop(id, { status });
}

/**
 * Aggregate derived counts for a shop based on shared platform data.
 * Because the prototype has a single local shop dataset (pt_services /
 * pt_staff), all registered shops report from the same local pool
 * until the common backend provides per-shop data.
 */
function enrichShop(shop) {
  const services = getServices().filter((s) => s.active !== false);
  const barbers = getBarbers().filter((b) => b.active !== false);
  const bookings = getBookings();
  return {
    ...shop,
    barberCount: barbers.length,
    serviceCount: services.length,
    bookingCount: bookings.length,
  };
}

/* ─────────────────── Admin-managed: Issues ─────────────────── */
const DEFAULT_ISSUE_STATUSES = ['open', 'in_progress', 'resolved'];

export function getIssues() {
  return readJSON(AD_KEYS.issues, []);
}

export function addIssue(data) {
  const issues = getIssues();
  const issue = {
    id: uid('iss'),
    reportedBy: '',
    type: 'general',
    relatedBooking: '',
    shopId: '',
    status: 'open',
    createdDate: toISO(new Date()),
    notes: '',
    ...data,
  };
  issues.push(issue);
  writeJSON(AD_KEYS.issues, issues);
  return issue;
}

export function updateIssue(id, patch) {
  const issues = getIssues();
  const next = issues.map((i) => (i.id === id ? { ...i, ...patch } : i));
  writeJSON(AD_KEYS.issues, next);
  return next.find((i) => i.id === id) || null;
}

export function setIssueStatus(id, status) {
  if (!DEFAULT_ISSUE_STATUSES.includes(status)) return null;
  return updateIssue(id, { status });
}

/* ─────────────────── Platform statistics ───────────────────── */
// All figures are derived from ACTUAL available data.
// When a collection is empty the stat is 0 — never fabricated.
export function getPlatformStats() {
  const bookings = getBookings();
  const services = getServices();
  const barbers = getBarbers();
  const customers = getCustomers();
  const shops = getShops();
  const today = toISO(new Date());

  const statusCounts = {
    pending: 0,
    confirmed: 0,
    completed: 0,
    'no-show': 0,
    cancelled: 0,
  };
  for (const b of bookings) {
    if (statusCounts[b.status] !== undefined) statusCounts[b.status] += 1;
  }

  return {
    totalCustomers: customers.length,
    activeCustomers: customers.length,
    totalShops: shops.length,
    activeShops: shops.filter((s) => s.status === 'active').length,
    pendingShops: shops.filter((s) => s.status === 'pending').length,
    totalBarbers: barbers.length,
    activeBarbers: barbers.filter((b) => b.active !== false).length,
    totalServices: services.length,
    activeServices: services.filter((s) => s.active !== false).length,
    totalBookings: bookings.length,
    todayBookings: bookings.filter((b) => b.dateISO === today).length,
    pendingBookings: statusCounts.pending,
    confirmedBookings: statusCounts.confirmed,
    completedBookings: statusCounts.completed,
    noShowBookings: statusCounts['no-show'],
    cancelledBookings: statusCounts.cancelled,
    issuesOpen: getIssues().filter((i) => i.status !== 'resolved').length,
  };
}

export function getRecentBookings(limit = 8) {
  return getBookings()
    .slice()
    .sort((a, b) => {
      const da = (a.createdAt || '') < (b.createdAt || '') ? 1 : -1;
      if (da !== 0) return da;
      return (b.dateISO || '').localeCompare(a.dateISO || '');
    })
    .slice(0, limit);
}

/* ─────────────────── Booking status transitions ─────────────── */
export const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'no-show', 'cancelled'];

const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'no-show', 'cancelled'],
  completed: [],
  'no-show': [],
  cancelled: [],
};

// Returns the set of statuses a booking may move to.
export function getValidTransitions(status) {
  return VALID_TRANSITIONS[status] || [];
}

export function canTransition(from, to) {
  return getValidTransitions(from).includes(to);
}

export function setBookingStatus(id, status) {
  const bookings = getBookings();
  const booking = bookings.find((b) => b.id === id);
  if (!booking) return { ok: false, error: 'Booking not found' };
  if (!canTransition(booking.status, status)) {
    return { ok: false, error: `Cannot move a ${booking.status} booking to ${status}` };
  }
  const next = bookings.map((b) => (b.id === id ? { ...b, status } : b));
  writeJSON(AD_KEYS.bookings, next);
  return { ok: true, booking: next.find((b) => b.id === id) };
}

/* ─────────────────── Platform role / settings ──────────────── */
export function getSettings() {
  return readJSON(AD_KEYS.settings, {});
}

export function saveSettings(patch) {
  const current = getSettings();
  const next = { ...current, ...patch };
  writeJSON(AD_KEYS.settings, next);
  return next;
}
