import { supabase } from '../lib/supabase.js';
import * as data from '../data.js';
import * as auth from '../auth.js';
import { STORAGE_KEYS, readJSON, writeJSON, uid } from '../utils.js';

/* ------------------------------------------------------------------ */
/*  Connection test                                                    */
/* ------------------------------------------------------------------ */

export async function testSupabaseConnection() {
  try {
    const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' });
    if (error) throw error;
    return { connected: true, error: null };
  } catch (err) {
    console.warn('[supabaseService] connection test failed:', err.message);
    return { connected: false, error: err.message };
  }
}

/* ------------------------------------------------------------------ */
/*  AUTH                                                               */
/* ------------------------------------------------------------------ */

export async function supaRegister(identifier, name) {
  try {
    const email = identifier.includes('@')
      ? identifier
      : `${identifier.replace(/[^a-zA-Z0-9]/g, '')}@pentane.local`;
    const password = `Pentane_${identifier.slice(-6)}!`;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, identifier } },
    });

    if (authError) throw authError;

    const userId = authData.user?.id;
    if (userId) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        user_id: userId,
        full_name: name,
        email,
        role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (profileError) console.warn('[supabaseService] profile upsert:', profileError.message);
    }

    auth.register({ identifier, name });
    return { user: authData.user, error: null };
  } catch (err) {
    console.warn('[supabaseService] supaRegister fallback:', err.message);
    auth.register({ identifier, name });
    return { user: null, error: err.message };
  }
}

export async function supaLogin(identifier, name) {
  try {
    const email = identifier.includes('@')
      ? identifier
      : `${identifier.replace(/[^a-zA-Z0-9]/g, '')}@pentane.local`;
    const password = `Pentane_${identifier.slice(-6)}!`;

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message?.includes('Invalid login')) {
        return await supaRegister(identifier, name);
      }
      throw authError;
    }

    auth.login(identifier, name);
    return { user: authData.user, error: null };
  } catch (err) {
    console.warn('[supabaseService] supaLogin fallback:', err.message);
    auth.login(identifier, name);
    return { user: null, error: err.message };
  }
}

export async function supaLogout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (err) {
    console.warn('[supabaseService] supaLogout error:', err.message);
  }
  auth.logout();
}

export async function supaCurrentUser() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session?.user) {
      return {
        id: session.user.id,
        identifier: session.user.user_metadata?.identifier || session.user.email,
        name: session.user.user_metadata?.full_name || 'Customer',
      };
    }
  } catch (err) {
    console.warn('[supabaseService] supaCurrentUser fallback:', err.message);
  }
  return auth.currentUser();
}

/* ------------------------------------------------------------------ */
/*  SHOPS                                                              */
/* ------------------------------------------------------------------ */

export async function supaGetShops() {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('is_live', true)
      .order('name');
    if (error) throw error;
    if (data && data.length > 0) {
      writeJSON(STORAGE_KEYS.shops, data);
      return data;
    }
  } catch (err) {
    console.warn('[supabaseService] supaGetShops fallback:', err.message);
  }
  return data.getShops();
}

export async function supaGetShop(id) {
  try {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (shop) return shop;
  } catch (err) {
    console.warn('[supabaseService] supaGetShop fallback:', err.message);
  }
  return data.getShop(id);
}

/* ------------------------------------------------------------------ */
/*  SERVICES                                                           */
/* ------------------------------------------------------------------ */

export async function supaGetServices() {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    if (services && services.length > 0) {
      writeJSON(STORAGE_KEYS.services, services);
      return services;
    }
  } catch (err) {
    console.warn('[supabaseService] supaGetServices fallback:', err.message);
  }
  return data.getServices();
}

export async function supaGetServicesByShop(shopId) {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    if (services && services.length > 0) return services;
  } catch (err) {
    console.warn('[supabaseService] supaGetServicesByShop fallback:', err.message);
  }
  const all = data.getServices();
  const shop = data.getShop(shopId);
  if (shop && Array.isArray(shop.services)) {
    const ids = shop.services.map((s) => s.id);
    return all.filter((s) => ids.includes(s.id) && s.active !== false);
  }
  return all;
}

/* ------------------------------------------------------------------ */
/*  BOOKINGS                                                           */
/* ------------------------------------------------------------------ */

export async function supaAddBooking(bookingData) {
  const payload = {
    customer_id: bookingData.customerId || null,
    shop_id: bookingData.shopId,
    service_id: bookingData.serviceId,
    booking_ref: bookingData.bookingRef || uid('REF'),
    appointment_date: bookingData.dateISO,
    preferred_period: bookingData.period,
    preferred_time_note: bookingData.timeNote || null,
    customer_name: bookingData.customerName || null,
    customer_phone: bookingData.customerPhone || null,
    customer_identifier: bookingData.customerIdentifier || null,
    customer_note: bookingData.note || null,
    customer_preferences: bookingData.preferences || null,
    status: 'pending',
    requested_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('booking_status_history').insert({
      booking_id: booking.id,
      old_status: null,
      new_status: 'pending',
      changed_by: payload.customer_id,
      note: null,
      created_at: new Date().toISOString(),
    });

    const localBooking = {
      id: booking.id,
      shopId: payload.shop_id,
      serviceId: payload.service_id,
      dateISO: payload.appointment_date,
      period: payload.preferred_period,
      timeNote: payload.preferred_time_note,
      customerName: payload.customer_name,
      customerPhone: payload.customer_phone,
      customerIdentifier: payload.customer_identifier,
      note: payload.customer_note,
      status: 'pending',
      createdAt: payload.created_at,
      bookingRef: payload.booking_ref,
      customerId: payload.customer_id,
    };
    const bookings = data.getBookings();
    bookings.push(localBooking);
    writeJSON(STORAGE_KEYS.bookings, bookings);

    return booking;
  } catch (err) {
    console.warn('[supabaseService] supaAddBooking fallback:', err.message);
    return data.addBooking({
      shopId: bookingData.shopId,
      serviceId: bookingData.serviceId,
      dateISO: bookingData.dateISO,
      period: bookingData.period,
      timeNote: bookingData.timeNote,
      customerName: bookingData.customerName,
      customerPhone: bookingData.customerPhone,
      customerIdentifier: bookingData.customerIdentifier,
      note: bookingData.note,
      bookingRef: bookingData.bookingRef,
      customerId: bookingData.customerId,
    });
  }
}

export async function supaGetBookings(filters = {}) {
  try {
    let query = supabase.from('bookings').select('*');

    if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);
    if (filters.shop_id) query = query.eq('shop_id', filters.shop_id);
    if (filters.status) query = query.eq('status', filters.status);

    query = query.order('created_at', { ascending: false });

    const { data: bookings, error } = await query;
    if (error) throw error;
    if (bookings && bookings.length > 0) {
      const local = bookings.map((b) => ({
        id: b.id,
        shopId: b.shop_id,
        serviceId: b.service_id,
        dateISO: b.appointment_date,
        period: b.preferred_period,
        timeNote: b.preferred_time_note,
        customerName: b.customer_name,
        customerPhone: b.customer_phone,
        customerIdentifier: b.customer_identifier,
        note: b.customer_note,
        status: b.status,
        createdAt: b.created_at,
        bookingRef: b.booking_ref,
        customerId: b.customer_id,
        startMinute: b.allocated_start_time ? Number(b.allocated_start_time) : null,
      }));
      writeJSON(STORAGE_KEYS.bookings, local);
      return local;
    }
  } catch (err) {
    console.warn('[supabaseService] supaGetBookings fallback:', err.message);
  }
  let bookings = data.getBookings();
  if (filters.customer_id) bookings = bookings.filter((b) => b.customerId === filters.customer_id || b.customerIdentifier === filters.customer_id);
  if (filters.shop_id) bookings = bookings.filter((b) => b.shopId === filters.shop_id);
  if (filters.status) bookings = bookings.filter((b) => b.status === filters.status);
  return bookings;
}

export async function supaGetBooking(id) {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (booking) {
      return {
        id: booking.id,
        shopId: booking.shop_id,
        serviceId: booking.service_id,
        dateISO: booking.appointment_date,
        period: booking.preferred_period,
        timeNote: booking.preferred_time_note,
        customerName: booking.customer_name,
        customerPhone: booking.customer_phone,
        customerIdentifier: booking.customer_identifier,
        note: booking.customer_note,
        status: booking.status,
        createdAt: booking.created_at,
        bookingRef: booking.booking_ref,
        customerId: booking.customer_id,
        startMinute: booking.allocated_start_time ? Number(booking.allocated_start_time) : null,
      };
    }
  } catch (err) {
    console.warn('[supabaseService] supaGetBooking fallback:', err.message);
  }
  return data.getBooking(id);
}

export async function supaUpdateBookingStatus(id, status, note) {
  const now = new Date().toISOString();
  const updatePayload = { status, updated_at: now };
  if (status === 'confirmed') updatePayload.confirmed_at = now;
  if (status === 'cancelled') updatePayload.cancelled_at = now;

  try {
    const { data: current, error: fetchErr } = await supabase
      .from('bookings')
      .select('status')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    const { error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', id);
    if (error) throw error;

    await supabase.from('booking_status_history').insert({
      booking_id: id,
      old_status: current?.status || null,
      new_status: status,
      changed_by: null,
      note: note || null,
      created_at: now,
    });
  } catch (err) {
    console.warn('[supabaseService] supaUpdateBookingStatus fallback:', err.message);
  }

  data.updateBookingStatus(id, status);
  return data.getBooking(id);
}

/* ------------------------------------------------------------------ */
/*  HOLIDAYS                                                           */
/* ------------------------------------------------------------------ */

export async function supaGetHolidays(shopId) {
  try {
    const { data: holidays, error } = await supabase
      .from('shop_holidays')
      .select('*')
      .eq('shop_id', shopId)
      .order('holiday_date');
    if (error) throw error;
    if (holidays) return holidays;
  } catch (err) {
    console.warn('[supabaseService] supaGetHolidays fallback:', err.message);
  }
  return readJSON(STORAGE_KEYS.holidays, []).filter(
    (h) => !shopId || h.shopId === shopId
  );
}

/* ------------------------------------------------------------------ */
/*  AVAILABILITY                                                       */
/* ------------------------------------------------------------------ */

export async function supaPeriodAvailability({ shopId, serviceId, dateISO }) {
  try {
    const shop = await supaGetShop(shopId);
    if (!shop) return { morning: 'full', afternoon: 'full', evening: 'full' };

    let service;
    try {
      const { data: svc, error: svcErr } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();
      if (svcErr) throw svcErr;
      service = svc;
    } catch {
      service = data.getService(serviceId);
    }

    if (!service) return { morning: 'full', afternoon: 'full', evening: 'full' };

    const normalizedService = {
      ...service,
      duration: service.duration_minutes || service.duration,
    };

    return data.periodAvailability({ shop, service: normalizedService, dateISO });
  } catch (err) {
    console.warn('[supabaseService] supaPeriodAvailability fallback:', err.message);
    const shop = data.getShop(shopId);
    const service = data.getService(serviceId);
    return data.periodAvailability({ shop, service, dateISO });
  }
}
