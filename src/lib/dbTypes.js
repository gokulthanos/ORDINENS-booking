/**
 * Supabase Database Type Definitions (JSDoc documentation).
 *
 * These are NOT TypeScript types — they document the expected shapes
 * of each Supabase table for reference when writing queries.
 */

/**
 * @typedef {Object} Profile
 * @property {string} id
 * @property {string} user_id
 * @property {string} full_name
 * @property {string} email
 * @property {string} phone
 * @property {string|null} profile_photo
 * @property {Object|null} hair_preferences
 * @property {string} role - 'customer' | 'owner' | 'admin'
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Shop
 * @property {string} id
 * @property {string} owner_id
 * @property {string} name
 * @property {string} shop_type
 * @property {string} phone
 * @property {string} address
 * @property {string} description
 * @property {string} location
 * @property {string} area
 * @property {string} status
 * @property {boolean} is_live
 * @property {number} capacity
 * @property {number} booking_window
 * @property {number} cancellation_hours
 * @property {number} number_of_barbers
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} ShopWorkingHours
 * @property {string} id
 * @property {string} shop_id
 * @property {string} day_of_week - 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'
 * @property {boolean} is_open
 * @property {string} open_time - 'HH:MM' format
 * @property {string} close_time - 'HH:MM' format
 */

/**
 * @typedef {Object} ShopBreak
 * @property {string} id
 * @property {string} shop_id
 * @property {string} label
 * @property {string} start_time - 'HH:MM' format
 * @property {string} end_time - 'HH:MM' format
 */

/**
 * @typedef {Object} ShopHoliday
 * @property {string} id
 * @property {string} shop_id
 * @property {string} holiday_date - 'YYYY-MM-DD' format
 * @property {string} name
 * @property {string} reason
 * @property {string} created_at
 */

/**
 * @typedef {Object} Service
 * @property {string} id
 * @property {string} shop_id
 * @property {string} name
 * @property {string} emoji
 * @property {number} duration_minutes
 * @property {number} price
 * @property {string} description
 * @property {boolean} is_active
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Booking
 * @property {string} id
 * @property {string} customer_id
 * @property {string} shop_id
 * @property {string} service_id
 * @property {string} booking_ref
 * @property {string} appointment_date - 'YYYY-MM-DD' format
 * @property {string} preferred_period - 'morning' | 'afternoon' | 'evening'
 * @property {string|null} preferred_time_note
 * @property {string|null} allocated_start_time
 * @property {string|null} allocated_end_time
 * @property {string|null} allocated_by
 * @property {string|null} customer_name
 * @property {string|null} customer_phone
 * @property {string|null} customer_identifier
 * @property {string|null} customer_note
 * @property {Object|null} customer_preferences
 * @property {string} status - 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'declined' | 'no-show'
 * @property {string} requested_at
 * @property {string|null} confirmed_at
 * @property {string|null} cancelled_at
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} BookingStatusHistory
 * @property {string} id
 * @property {string} booking_id
 * @property {string|null} old_status
 * @property {string} new_status
 * @property {string|null} changed_by
 * @property {string|null} note
 * @property {string} created_at
 */

/**
 * @typedef {Object} Payment
 * @property {string} id
 * @property {string} booking_id
 * @property {number} amount
 * @property {string} payment_status - 'pending' | 'paid' | 'refunded' | 'failed'
 * @property {string|null} payment_method
 * @property {string|null} transaction_id
 * @property {string|null} paid_at
 * @property {string|null} refunded_at
 * @property {string} created_at
 */

/**
 * @typedef {Object} Review
 * @property {string} id
 * @property {string} booking_id
 * @property {string} customer_id
 * @property {string} shop_id
 * @property {number} rating
 * @property {string|null} comment
 * @property {string} created_at
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} user_id
 * @property {string} type
 * @property {string} title
 * @property {string} message
 * @property {boolean} is_read
 * @property {string} created_at
 */
