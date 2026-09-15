import { supabase } from '../lib/supabase';
import * as dataUtils from '../utils/dataUtils';
import { STORAGE_KEYS, uid } from '../utils/formatters';
import { Booking, BookingPeriod, Shop, Service } from '../types';

/* ------------------------------------------------------------------ */
/*  Connection test                                                    */
/* ------------------------------------------------------------------ */

export async function testSupabaseConnection() {
  try {
    const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' });
    if (error) throw error;
    return { connected: true, error: null };
  } catch (err: any) {
    console.warn('[supabaseService] connection test failed:', err.message);
    return { connected: false, error: err.message };
  }
}

/* ------------------------------------------------------------------ */
/*  SHOPS                                                              */
/* ------------------------------------------------------------------ */

export async function supaGetShops(): Promise<Shop[]> {
  try {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('is_live', true)
      .order('name');
    if (error) throw error;
    if (data && data.length > 0) {
      await dataUtils.writeJSON(STORAGE_KEYS.shops, data);
      return data;
    }
  } catch (err: any) {
    console.warn('[supabaseService] supaGetShops fallback:', err.message);
  }
  return dataUtils.getShops();
}

export async function supaGetShop(id: string): Promise<Shop | null> {
  try {
    const { data: shop, error } = await supabase
      .from('shops')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (shop) return shop;
  } catch (err: any) {
    console.warn('[supabaseService] supaGetShop fallback:', err.message);
  }
  return dataUtils.getShop(id);
}

/* ------------------------------------------------------------------ */
/*  SERVICES                                                           */
/* ------------------------------------------------------------------ */

export async function supaGetServices(): Promise<Service[]> {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    if (services && services.length > 0) {
      await dataUtils.writeJSON(STORAGE_KEYS.services, services);
      return services;
    }
  } catch (err: any) {
    console.warn('[supabaseService] supaGetServices fallback:', err.message);
  }
  return dataUtils.getServices();
}

export async function supaGetServicesByShop(shopId: string): Promise<Service[]> {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true)
      .order('name');
    if (error) throw error;
    if (services && services.length > 0) return services;
  } catch (err: any) {
    console.warn('[supabaseService] supaGetServicesByShop fallback:', err.message);
  }
  const all = await dataUtils.getServices();
  const shop = await dataUtils.getShop(shopId);
  // Assuming shop.services is an array of service IDs or objects
  if (shop && Array.isArray((shop as any).services)) {
    const ids = (shop as any).services.map((s: any) => s.id || s);
    return all.filter((s) => ids.includes(s.id) && s.is_active !== false);
  }
  return all;
}

/* ------------------------------------------------------------------ */
/*  BOOKINGS                                                           */
/* ------------------------------------------------------------------ */

export async function supaAddBooking(bookingData: Partial<Booking>): Promise<Booking> {
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
    customer_preferences: bookingData.customer_preferences || null,
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

    const localBooking: Booking = {
      id: booking.id,
      shop_id: payload.shop_id as string,
      service_id: payload.service_id as string,
      appointment_date: payload.appointment_date as string,
      preferred_period: payload.preferred_period as BookingPeriod,
      preferred_time_note: payload.preferred_time_note,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      customer_identifier: payload.customer_identifier,
      customer_note: payload.customer_note,
      status: 'pending',
      created_at: payload.created_at,
      booking_ref: payload.booking_ref,
      customer_id: payload.customer_id as string,
      requested_at: payload.requested_at,
      allocated_start_time: null,
      allocated_end_time: null,
      allocated_by: null,
      customer_preferences: null,
      confirmed_at: null,
      cancelled_at: null,
      updated_at: payload.updated_at,
      // mapping aliases for local usage
      shopId: payload.shop_id,
      serviceId: payload.service_id,
      dateISO: payload.appointment_date,
      period: payload.preferred_period as BookingPeriod,
      timeNote: payload.preferred_time_note,
      customerName: payload.customer_name,
      customerPhone: payload.customer_phone,
      customerIdentifier: payload.customer_identifier,
      note: payload.customer_note,
      bookingRef: payload.booking_ref,
      customerId: payload.customer_id,
    };
    
    const bookings = await dataUtils.getBookings();
    bookings.push(localBooking);
    await dataUtils.writeJSON(STORAGE_KEYS.bookings, bookings);

    return localBooking;
  } catch (err: any) {
    console.warn('[supabaseService] supaAddBooking fallback:', err.message);
    return dataUtils.addBooking({
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
    }) as any;
  }
}

export async function supaGetBookings(filters: any = {}): Promise<Booking[]> {
  try {
    let query = supabase.from('bookings').select('*');

    if (filters.customer_id) query = query.eq('customer_id', filters.customer_id);
    if (filters.shop_id) query = query.eq('shop_id', filters.shop_id);
    if (filters.status) query = query.eq('status', filters.status);

    query = query.order('created_at', { ascending: false });

    const { data: bookings, error } = await query;
    if (error) throw error;
    if (bookings && bookings.length > 0) {
      const local = bookings.map((b: any) => ({
        ...b,
        shopId: b.shop_id,
        serviceId: b.service_id,
        dateISO: b.appointment_date,
        period: b.preferred_period,
        timeNote: b.preferred_time_note,
        customerName: b.customer_name,
        customerPhone: b.customer_phone,
        customerIdentifier: b.customer_identifier,
        note: b.customer_note,
        bookingRef: b.booking_ref,
        customerId: b.customer_id,
        startMinute: b.allocated_start_time ? Number(b.allocated_start_time) : null,
      }));
      await dataUtils.writeJSON(STORAGE_KEYS.bookings, local);
      return local;
    }
  } catch (err: any) {
    console.warn('[supabaseService] supaGetBookings fallback:', err.message);
  }
  let bookings = await dataUtils.getBookings();
  if (filters.customer_id) bookings = bookings.filter((b) => b.customerId === filters.customer_id || b.customerIdentifier === filters.customer_id);
  if (filters.shop_id) bookings = bookings.filter((b) => b.shopId === filters.shop_id);
  if (filters.status) bookings = bookings.filter((b) => b.status === filters.status);
  return bookings;
}

export async function supaGetBooking(id: string): Promise<Booking | null> {
  try {
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (booking) {
      return {
        ...booking,
        shopId: booking.shop_id,
        serviceId: booking.service_id,
        dateISO: booking.appointment_date,
        period: booking.preferred_period,
        timeNote: booking.preferred_time_note,
        customerName: booking.customer_name,
        customerPhone: booking.customer_phone,
        customerIdentifier: booking.customer_identifier,
        note: booking.customer_note,
        bookingRef: booking.booking_ref,
        customerId: booking.customer_id,
        startMinute: booking.allocated_start_time ? Number(booking.allocated_start_time) : null,
      };
    }
  } catch (err: any) {
    console.warn('[supabaseService] supaGetBooking fallback:', err.message);
  }
  return dataUtils.getBooking(id);
}

/* ------------------------------------------------------------------ */
/*  AVAILABILITY                                                       */
/* ------------------------------------------------------------------ */

export async function supaPeriodAvailability({ shopId, serviceId, dateISO }: { shopId: string; serviceId: string; dateISO: string }): Promise<Record<BookingPeriod, 'available' | 'limited' | 'full'>> {
  try {
    const shop = await supaGetShop(shopId);
    if (!shop) return { morning: 'full', afternoon: 'full', evening: 'full' };

    let service: Service | null = null;
    try {
      const { data: svc, error: svcErr } = await supabase
        .from('services')
        .select('*')
        .eq('id', serviceId)
        .single();
      if (svcErr) throw svcErr;
      service = svc;
    } catch {
      service = await dataUtils.getService(serviceId);
    }

    if (!service) return { morning: 'full', afternoon: 'full', evening: 'full' };

    const normalizedService = {
      ...service,
      duration: service.duration_minutes || service.duration,
    };

    return dataUtils.periodAvailability({ shop, service: normalizedService, dateISO });
  } catch (err: any) {
    console.warn('[supabaseService] supaPeriodAvailability fallback:', err.message);
    const shop = await dataUtils.getShop(shopId);
    const service = await dataUtils.getService(serviceId);
    return dataUtils.periodAvailability({ shop, service, dateISO });
  }
}
