export type Role = 'customer' | 'owner' | 'admin';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined' | 'no-show';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type BookingPeriod = 'morning' | 'afternoon' | 'evening';

export interface User {
  id: string;
  identifier: string; // phone or email
  name: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_photo: string | null;
  hair_preferences: any | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  owner_id: string;
  name: string;
  shop_type: string;
  phone: string;
  address: string;
  description: string;
  location: string;
  area: string;
  status: string;
  is_live: boolean;
  capacity: number;
  booking_window: number;
  cancellation_hours: number;
  number_of_barbers: number;
  created_at: string;
  updated_at: string;
  workingHours?: Record<string, { open: boolean; start: string; end: string }>;
  breaks?: { start: string; end: string }[];
}

export interface ShopWorkingHours {
  id: string;
  shop_id: string;
  day_of_week: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
  is_open: boolean;
  open_time: string;
  close_time: string;
}

export interface ShopBreak {
  id: string;
  shop_id: string;
  label: string;
  start_time: string;
  end_time: string;
}

export interface ShopHoliday {
  id: string;
  shop_id: string;
  holiday_date: string;
  name: string;
  reason: string;
  created_at: string;
}

export interface Service {
  id: string;
  shop_id: string;
  name: string;
  emoji: string;
  duration_minutes: number;
  duration?: number; // Aliased for local logic
  price: number;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  shop_id: string;
  service_id: string;
  booking_ref: string;
  appointment_date: string;
  preferred_period: BookingPeriod;
  preferred_time_note: string | null;
  allocated_start_time: string | null;
  allocated_end_time: string | null;
  allocated_by: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_identifier: string | null;
  customer_note: string | null;
  customer_preferences: any | null;
  status: BookingStatus;
  requested_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  
  // App-level mapped fields (from data.js logic)
  shopId?: string;
  serviceId?: string;
  dateISO?: string;
  period?: BookingPeriod;
  timeNote?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerIdentifier?: string | null;
  note?: string | null;
  bookingRef?: string;
  customerId?: string | null;
  startMinute?: number | null;
  duration?: number;
  price?: number;
}
