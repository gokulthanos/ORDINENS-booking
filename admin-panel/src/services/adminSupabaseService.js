/* =============================================================
   Ordinens Tech — Admin Panel Supabase Data Access Layer
   Tries Supabase first for every operation; falls back to the
   existing localStorage functions (data.js / utils.js) so the
   prototype and its tests keep working when the backend is
   unreachable or a table is missing / RLS-protected.
   All functions return the SAME shape as their localStorage
   counterparts.
   ============================================================= */
import { supabase } from '../lib/supabase.js';
import {
  getBookings,
  getBooking,
  getServices,
  getBarbers,
  getCustomers,
  getShops,
  getShop,
  addShop,
  setShopStatus,
  getIssues,
  addIssue,
  updateIssue,
  setIssueStatus,
  getPlatformStats,
  getRecentBookings,
  setBookingStatus,
} from '../data.js';
import { uid, toISO } from '../utils.js';

function logError(source, err) {
  console.error(`[supabase] ${source} failed, falling back to localStorage:`, err?.message || err);
}

/* ─────────────────── AUTH ───────────────────────────────────── */
export async function supaAdminLogin(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { ok: true, session: data.session, user: data.user };
  } catch (err) {
    logError('adminLogin', err);
    return { ok: false, error: err?.message || 'Login failed' };
  }
}

export async function supaAdminLogout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    logError('adminLogout', err);
    return { ok: false, error: err?.message || 'Logout failed' };
  }
}

export async function supaGetAdminSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session || null;
  } catch (err) {
    logError('getAdminSession', err);
    return null;
  }
}

/* ─────────────────── CUSTOMERS ──────────────────────────────── */
export async function supaGetCustomers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer');
    if (error) throw error;
    return (data || []).map((p) => ({
      id: p.id,
      identifier: p.phone || p.identifier || '',
      name: p.name || p.full_name || '',
      email: p.email || '',
      phone: p.phone || '',
      createdAt: p.created_at || p.createdAt || new Date().toISOString(),
      ...p,
    }));
  } catch (err) {
    logError('getCustomers', err);
    return getCustomers();
  }
}

export async function supaGetCustomer(id) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'customer')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      identifier: data.phone || data.identifier || '',
      name: data.name || data.full_name || '',
      email: data.email || '',
      phone: data.phone || '',
      createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      ...data,
    };
  } catch (err) {
    logError('getCustomer', err);
    const customers = getCustomers();
    return customers.find((c) => c.id === id || String(c.identifier).toLowerCase() === String(id).toLowerCase()) || null;
  }
}

export async function supaGetCustomerBookings(customerId) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .or(`customer_id.eq.${customerId},customerId.eq.${customerId}`);
    if (error) throw error;
    return data || [];
  } catch (err) {
    logError('getCustomerBookings', err);
    const customer = getCustomers().find((c) => c.id === customerId);
    if (!customer) return [];
    const phone = String(customer.identifier || customer.phone || '').replace(/[^0-9]/g, '');
    return getBookings().filter((b) => {
      const bPhone = String(b.customerPhone || '').replace(/[^0-9]/g, '');
      return phone && bPhone && phone === bPhone;
    });
  }
}

/* ─────────────────── OWNERS ─────────────────────────────────── */
export async function supaGetOwners() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'owner');
    if (error) throw error;
    return (data || []).map((p) => ({
      id: p.id,
      identifier: p.phone || p.identifier || '',
      name: p.name || p.full_name || '',
      email: p.email || '',
      phone: p.phone || '',
      createdAt: p.created_at || p.createdAt || new Date().toISOString(),
      ...p,
    }));
  } catch (err) {
    logError('getOwners', err);
    return [];
  }
}

/* ─────────────────── SHOPS ──────────────────────────────────── */
async function enrichShops(shops, bookings, services) {
  const allBookings = bookings || (await safeRead('bookings', getBookings));
  const allServices = services || (await safeRead('services', getServices));
  return shops.map((s) => ({
    ...s,
    barberCount: Number(s.number_of_barbers ?? s.barberCount ?? 0),
    serviceCount: (allServices || []).filter((sv) => !sv.shop_id || sv.shop_id === s.id || sv.shopId === s.id).length,
    bookingCount: (allBookings || []).filter((b) => b.shop_id === s.id || b.shopId === s.id).length,
  }));
}

async function safeRead(name, fallback) {
  try {
    const { data, error } = await supabase.from(name).select('*');
    if (error) throw error;
    return data || [];
  } catch {
    return fallback();
  }
}

export async function supaGetShops() {
  try {
    const { data, error } = await supabase.from('shops').select('*');
    if (error) throw error;
    return await enrichShops(data || [], null, null);
  } catch (err) {
    logError('getShops', err);
    return getShops();
  }
}

export async function supaGetShop(id) {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const enriched = await enrichShops([data], null, null);
    return enriched[0];
  } catch (err) {
    logError('getShop', err);
    return getShop(id);
  }
}

export async function supaUpdateShopStatus(id, status) {
  try {
    const valid = ['pending', 'active', 'suspended', 'inactive'];
    if (!valid.includes(status)) return null;
    const { data, error } = await supabase.from('shops').update({ status }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    logError('updateShopStatus', err);
    return setShopStatus(id, status);
  }
}

export async function supaAddShop(shopData) {
  try {
    const shop = {
      id: shopData.id || uid('shop'),
      created_at: new Date().toISOString(),
      ...shopData,
    };
    const { data, error } = await supabase.from('shops').insert(shop).select().maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    logError('addShop', err);
    return addShop(shopData);
  }
}

/* ─────────────────── SERVICES ───────────────────────────────── */
export async function supaGetServices() {
  try {
    const { data, error } = await supabase.from('services').select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    logError('getServices', err);
    return getServices();
  }
}

export async function supaUpdateServiceStatus(id, isActive) {
  try {
    const { data, error } = await supabase
      .from('services')
      .update({ active: isActive })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    logError('updateServiceStatus', err);
    const services = getServices().map((s) =>
      s.id === id ? { ...s, active: isActive } : s
    );
    localStorage.setItem('pt_services', JSON.stringify(services));
    return services.find((s) => s.id === id) || null;
  }
}

/* ─────────────────── BARBERS ────────────────────────────────── */
// Barbers are derived from shops' number_of_barbers (informational).
export async function supaGetBarbers() {
  try {
    const { data, error } = await supabase.from('shops').select('*');
    if (error) throw error;
    return (data || []).map((s) => ({
      id: s.id,
      name: s.name,
      shopId: s.id,
      active: s.status === 'active',
      role: 'Barber',
      shopName: s.name,
      barbers: Number(s.number_of_barbers ?? 0),
      ...s,
    }));
  } catch (err) {
    logError('getBarbers', err);
    return getBarbers();
  }
}

/* ─────────────────── BOOKINGS ───────────────────────────────── */
export async function supaGetBookings(filters = {}) {
  try {
    let query = supabase.from('bookings').select('*');
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.shopId) query = query.eq('shop_id', filters.shopId);
    if (filters.customerId) query = query.eq('customer_id', filters.customerId);
    if (filters.dateISO) query = query.eq('dateISO', filters.dateISO);
    if (filters.barberId) query = query.eq('barberId', filters.barberId);
    if (filters.limit) query = query.limit(filters.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    logError('getBookings', err);
    let bookings = getBookings();
    if (filters.status) bookings = bookings.filter((b) => b.status === filters.status);
    if (filters.shopId) bookings = bookings.filter((b) => b.shopId === filters.shopId);
    if (filters.customerId) bookings = bookings.filter((b) => b.customerId === filters.customerId);
    if (filters.dateISO) bookings = bookings.filter((b) => b.dateISO === filters.dateISO);
    if (filters.barberId) bookings = bookings.filter((b) => b.barberId === filters.barberId);
    if (filters.limit) bookings = bookings.slice(0, filters.limit);
    return bookings;
  }
}

export async function supaGetBooking(id) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (err) {
    logError('getBooking', err);
    return getBooking(id);
  }
}

export async function supaSetBookingStatus(id, status) {
  try {
    const current = await supaGetBooking(id);
    const prevStatus = current?.status;
    const { data, error } = await supabase
      .from('bookings')
      .update({ status, status_history: buildStatusHistory(current, status) })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return { ok: true, booking: data, previousStatus: prevStatus };
  } catch (err) {
    logError('setBookingStatus', err);
    return setBookingStatus(id, status);
  }
}

function buildStatusHistory(booking, newStatus) {
  const base = Array.isArray(booking?.status_history) ? booking.status_history : [];
  if (booking?.status === newStatus) return base;
  const entry = { from: booking?.status || null, to: newStatus, at: new Date().toISOString() };
  return [...base, entry];
}

export async function supaGetRecentBookings(limit = 8) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('createdAt', { ascending: false })
      .order('dateISO', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (err) {
    logError('getRecentBookings', err);
    return getRecentBookings(limit);
  }
}

/* ─────────────────── PAYMENTS ───────────────────────────────── */
export async function supaGetPayments(filters = {}) {
  try {
    let query = supabase.from('payments').select('*');
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.bookingId) query = query.eq('booking_id', filters.bookingId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    logError('getPayments', err);
    let bookings = getBookings();
    if (filters.bookingId) bookings = bookings.filter((b) => b.id === filters.bookingId);
    return bookings.map((b) => ({
      id: `${b.id}-payment`,
      booking_id: b.id,
      bookingId: b.id,
      status: b.advancePaid === true || b.paymentStatus === 'paid' ? 'paid' : 'unpaid',
      advance: 10,
      platform_fee: 2,
      owner_share: 8,
      dateISO: b.dateISO,
      customerName: b.customerName,
    }));
  }
}

export async function supaGetPaymentStats() {
  try {
    const { data, error } = await supabase.from('payments').select('*');
    if (error) throw error;
    const payments = data || [];
    return {
      totalPayments: payments.length,
      paid: payments.filter((p) => p.status === 'paid' || p.status === 'success').length,
      unpaid: payments.filter((p) => p.status !== 'paid' && p.status !== 'success').length,
      totalAmount: payments.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      platformFee: payments.reduce((sum, p) => sum + Number(p.platform_fee ?? p.platformFee ?? 0), 0),
      ownerShare: payments.reduce((sum, p) => sum + Number(p.owner_share ?? p.ownerShare ?? 0), 0),
    };
  } catch (err) {
    logError('getPaymentStats', err);
    const bookings = getBookings();
    return {
      totalPayments: bookings.length,
      paid: bookings.filter((b) => b.advancePaid === true || b.paymentStatus === 'paid').length,
      unpaid: bookings.filter((b) => !(b.advancePaid === true || b.paymentStatus === 'paid')).length,
      totalAmount: bookings.length * 10,
      platformFee: bookings.length * 2,
      ownerShare: bookings.length * 8,
    };
  }
}

/* ─────────────────── ISSUES ─────────────────────────────────── */
export async function supaGetIssues() {
  try {
    const { data, error } = await supabase.from('issues').select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    logError('getIssues', err);
    return getIssues();
  }
}

export async function supaAddIssue(issueData) {
  try {
    const issue = {
      id: issueData.id || uid('iss'),
      status: 'open',
      created_date: new Date().toISOString(),
      ...issueData,
    };
    const { data, error } = await supabase.from('issues').insert(issue).select().maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    logError('addIssue', err);
    return addIssue(issueData);
  }
}

export async function supaUpdateIssue(id, patch) {
  try {
    const { data, error } = await supabase.from('issues').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    logError('updateIssue', err);
    return updateIssue(id, patch);
  }
}

export async function supaSetIssueStatus(id, status) {
  try {
    const valid = ['open', 'in_progress', 'resolved'];
    if (!valid.includes(status)) return null;
    const { data, error } = await supabase.from('issues').update({ status }).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    logError('setIssueStatus', err);
    return setIssueStatus(id, status);
  }
}

/* ─────────────────── PLATFORM STATISTICS ────────────────────── */
export async function supaGetPlatformStats() {
  try {
    const { data: bookings, error: bErr } = await supabase.from('bookings').select('*');
    if (bErr) throw bErr;
    const { data: services, error: sErr } = await supabase.from('services').select('*');
    if (sErr) throw sErr;
    const { data: shops, error: shErr } = await supabase.from('shops').select('*');
    if (shErr) throw shErr;
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
    if (pErr) throw pErr;
    const { data: issues, error: iErr } = await supabase.from('issues').select('*');
    if (iErr) throw iErr;

    const customers = (profiles || []).filter((p) => p.role === 'customer');
    const bookingsArr = bookings || [];
    const servicesArr = services || [];
    const shopsArr = shops || [];
    const issuesArr = issues || [];
    const today = toISO(new Date());

    const statusCounts = { pending: 0, confirmed: 0, completed: 0, 'no-show': 0, cancelled: 0 };
    for (const b of bookingsArr) {
      if (statusCounts[b.status] !== undefined) statusCounts[b.status] += 1;
    }

    return {
      totalCustomers: customers.length,
      activeCustomers: customers.length,
      totalShops: shopsArr.length,
      activeShops: shopsArr.filter((s) => s.status === 'active').length,
      pendingShops: shopsArr.filter((s) => s.status === 'pending').length,
      totalBarbers: shopsArr.reduce((sum, s) => sum + Number(s.number_of_barbers ?? 0), 0),
      activeBarbers: shopsArr
        .filter((s) => s.status === 'active')
        .reduce((sum, s) => sum + Number(s.number_of_barbers ?? 0), 0),
      totalServices: servicesArr.length,
      activeServices: servicesArr.filter((s) => s.active !== false).length,
      totalBookings: bookingsArr.length,
      todayBookings: bookingsArr.filter((b) => (b.dateISO || b.date) === today).length,
      pendingBookings: statusCounts.pending,
      confirmedBookings: statusCounts.confirmed,
      completedBookings: statusCounts.completed,
      noShowBookings: statusCounts['no-show'],
      cancelledBookings: statusCounts.cancelled,
      issuesOpen: issuesArr.filter((i) => i.status !== 'resolved').length,
    };
  } catch (err) {
    logError('getPlatformStats', err);
    return getPlatformStats();
  }
}

/* ─────────────────── CONNECTION TEST ────────────────────────── */
export async function testAdminSupabaseConnection() {
  try {
    const { error } = await supabase.from('shops').select('id').limit(1);
    if (error) throw error;
    return { ok: true, connected: true };
  } catch (err) {
    logError('testAdminSupabaseConnection', err);
    return { ok: false, connected: false, error: err?.message || 'Connection failed' };
  }
}
