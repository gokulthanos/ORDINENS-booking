/* =============================================================
   Ordinens Tech — Admin Panel Authentication
   Role: admin (platform operator)
   Session key: admin_session — fully separate from
   customer_session (pt_session) and owner_session (ow_session).

   The demo admin credential lives ONLY inside this prototype
   authentication layer. It is never rendered in the UI and is
   never shared with customers or owners.
   ============================================================= */
import { AD_KEYS, readJSON, writeJSON, uid } from './utils.js';

export const ADMIN_PASSWORD = 'admin123';
export const ROLE_ADMIN = 'admin';

export function isAdmin() {
  const session = readJSON(AD_KEYS.session, null);
  return Boolean(session && session.role === ROLE_ADMIN && session.authenticated === true);
}

/**
 * Verify admin credentials.
 * Returns { ok } and, on success, persists an admin-only session.
 * Does NOT reuse, read, or write any customer/owner session key.
 */
export function adminLogin(password) {
  if (password !== ADMIN_PASSWORD) return false;
  writeJSON(AD_KEYS.session, {
    role: ROLE_ADMIN,
    authenticated: true,
    name: 'Admin',
    loginAt: new Date().toISOString(),
    id: uid('adm'),
  });
  return true;
}

export function adminLogout() {
  localStorage.removeItem(AD_KEYS.session);
}

export function getAdminSession() {
  return readJSON(AD_KEYS.session, null);
}

/**
 * Role guard: only authenticates an ADMIN user.
 * Customer and Owner sessions are intentionally ignored —
 * they can never enter the Admin Panel.
 */
export function requiresAdmin() {
  return !isAdmin();
}

export function hasRole(role) {
  const session = readJSON(AD_KEYS.session, null);
  return Boolean(session && session.role === role);
}
