import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, uid, fromISO } from './formatters';
import { Shop, Service, Booking, BookingPeriod, BookingStatus } from '../types';

import seedServices from '../data/services.json';
import seedStaff from '../data/staff.json';
import seedShops from '../data/shops.json';

/* ------------------------------ Storage Utils ------------------------------ */
export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function writeJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/* ------------------------------ Shops ------------------------------- */
export async function getShops(): Promise<Shop[]> {
  const stored = await readJSON<Shop[] | null>(STORAGE_KEYS.shops, null);
  if (!stored) return seedShops as any;
  const ids = new Set(stored.map((s) => s.id));
  let modified = false;
  for (const s of seedShops) {
    if (!ids.has(s.id)) {
      stored.push(s as any);
      modified = true;
    }
  }
  if (modified) {
    await writeJSON(STORAGE_KEYS.shops, stored);
  }
  return stored;
}

export async function getShop(id: string): Promise<Shop | null> {
  const shops = await getShops();
  return shops.find((s) => s.id === id) || null;
}

/* ------------------------------ Services ------------------------------ */
export async function getServices(): Promise<Service[]> {
  return readJSON<Service[]>(STORAGE_KEYS.services, seedServices as any);
}

export async function getService(id: string): Promise<Service | null> {
  const services = await getServices();
  return services.find((s) => s.id === id) || null;
}

/* -------------------------------- Staff ------------------------------- */
export async function getStaff(): Promise<any[]> {
  return readJSON<any[]>(STORAGE_KEYS.staff, seedStaff);
}

export async function getBarber(id: string): Promise<any | null> {
  const staff = await getStaff();
  return staff.find((b) => b.id === id) || null;
}

/* ------------------------------ Bookings ------------------------------ */
export const PERIODS: BookingPeriod[] = ['morning', 'afternoon', 'evening'];

export async function getBookings(): Promise<Booking[]> {
  return readJSON<Booking[]>(STORAGE_KEYS.bookings, []);
}

export async function getBooking(id: string): Promise<Booking | null> {
  const bookings = await getBookings();
  return bookings.find((b) => b.id === id) || null;
}

export async function saveBookings(list: Booking[]): Promise<void> {
  await writeJSON(STORAGE_KEYS.bookings, list);
}

export async function addBooking(booking: Partial<Booking>): Promise<Booking> {
  const item: Booking = {
    id: uid('BK'),
    created_at: new Date().toISOString(),
    status: 'pending',
    ...(booking as any),
  };
  const list = await getBookings();
  list.push(item);
  await saveBookings(list);
  return item;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<Booking | undefined> {
  const list = await getBookings();
  const updatedList = list.map((b) => (b.id === id ? { ...b, status } : b));
  await saveBookings(updatedList);
  return updatedList.find((b) => b.id === id);
}

export async function updateBooking(id: string, patch: Partial<Booking>): Promise<Booking | undefined> {
  const list = await getBookings();
  const updatedList = list.map((b) => (b.id === id ? { ...b, ...patch } : b));
  await saveBookings(updatedList);
  return updatedList.find((b) => b.id === id);
}

/* ------------------------------ Slot engine --------------------------- */
export const SLOT_STEP = 30;
const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function slotMinute(hhmm: string | undefined | null): number | null {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function normalizeShop(shop: Shop | null) {
  if (!shop) return null;
  const workingHours = shop.workingHours || {};
  const capacity = Number(shop.capacity) || 1;
  const breaks = Array.isArray(shop.breaks) ? shop.breaks : [];
  return { ...shop, workingHours, capacity, breaks };
}

export async function isHoliday(dateISO: string): Promise<boolean> {
  const holidays = await readJSON<any[]>(STORAGE_KEYS.holidays, []);
  return holidays.some(h => h.dateISO === dateISO);
}

export async function shopOpenOn(shop: Shop | null, dateISO: string): Promise<boolean> {
  if (!shop) return false;
  if (await isHoliday(dateISO)) return false;
  const day = fromISO(dateISO).getDay();
  const dayKey = DAY_NAMES[day];
  const dayCfg = (shop.workingHours || {})[dayKey] || (shop.workingHours || {})[String(day)];
  return Boolean(dayCfg && dayCfg.open);
}

export function shopDayHours(shop: Shop, dateISO: string) {
  const day = fromISO(dateISO).getDay();
  const dayKey = DAY_NAMES[day];
  const dayCfg = (shop.workingHours || {})[dayKey] || (shop.workingHours || {})[String(day)] || {};
  return {
    openMinute: slotMinute(dayCfg.start),
    closeMinute: slotMinute(dayCfg.end),
  };
}

export function shopBreakBlocks(shop: Shop | null) {
  return (shop && Array.isArray(shop.breaks) ? shop.breaks : []).map((br) => ({
    start: slotMinute(br.start),
    end: slotMinute(br.end),
  }));
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && aEnd > bStart;
}

export function overlapsBreak(shop: Shop, start: number, duration: number) {
  const end = start + duration;
  return shopBreakBlocks(shop).some(
    (b) => b.start != null && b.end != null && overlaps(start, end, b.start, b.end)
  );
}

export async function countConcurrent(shopId: string, dateISO: string, start: number, duration: number, ignoreBookingId?: string): Promise<number> {
  const bookings = await getBookings();
  const relevantBookings = bookings.filter(
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
    for (const b of relevantBookings) {
      if (b.startMinute != null && b.duration != null && t >= b.startMinute && t < b.startMinute + b.duration) count++;
    }
    if (count > peak) peak = count;
  }
  return peak;
}

export async function generateOwnerSlots({ shop, service, dateISO, period, ignoreBookingId }: { shop: Shop | null; service: Service | null; dateISO: string; period: BookingPeriod; ignoreBookingId?: string }): Promise<number[]> {
  const s = normalizeShop(shop);
  if (!s || !service) return [];
  if (!(await shopOpenOn(s, dateISO))) return [];
  const { openMinute, closeMinute } = shopDayHours(s, dateISO);
  if (openMinute == null || closeMinute == null || closeMinute <= openMinute) return [];

  const capacity = Math.max(1, s.capacity);
  const duration = Number(service.duration_minutes || service.duration) || 30;

  const periodRange = {
    morning: [openMinute, Math.min(12 * 60, closeMinute)],
    afternoon: [Math.max(12 * 60, openMinute), Math.min(16 * 60, closeMinute)],
    evening: [Math.max(16 * 60, openMinute), closeMinute],
  }[period] || [openMinute, closeMinute];

  const [pStart, pEnd] = periodRange;
  const start = Math.max(openMinute, pStart);
  const end = Math.min(closeMinute, pEnd);

  const slots: number[] = [];
  for (let t = start; t + duration <= end; t += SLOT_STEP) {
    if (overlapsBreak(s, t, duration)) continue;
    if (await countConcurrent(s.id, dateISO, t, duration, ignoreBookingId) >= capacity) continue;
    slots.push(t);
  }
  return slots;
}

export async function periodAvailability({ shop, service, dateISO }: { shop: Shop | null; service: Service | null; dateISO: string }): Promise<Record<BookingPeriod, 'available' | 'limited' | 'full'>> {
  const s = normalizeShop(shop);
  if (!s || !service || !(await shopOpenOn(s, dateISO))) {
    return { morning: 'full', afternoon: 'full', evening: 'full' };
  }
  const out: Record<BookingPeriod, 'available' | 'limited' | 'full'> = { morning: 'full', afternoon: 'full', evening: 'full' };
  for (const period of PERIODS) {
    const slots = await generateOwnerSlots({ shop: s, service, dateISO, period });
    if (slots.length === 0) out[period] = 'full';
    else if (slots.length <= Math.max(1, s.capacity)) out[period] = 'limited';
    else out[period] = 'available';
  }
  return out;
}

export function formatSlotTime(startMinute: number | null | undefined): string {
  if (startMinute == null) return '—';
  const h = Math.floor(startMinute / 60);
  const m = startMinute % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}
