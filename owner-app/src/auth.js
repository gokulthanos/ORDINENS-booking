/* =============================================================
   Ordinens Tech — Owner App Authentication
   Role: owner (separate from customer and admin roles)
   Demo credential: owner123
   ============================================================= */
import { OW_KEYS, readJSON, writeJSON } from './utils.js';

export const OWNER_PASSWORD = 'owner123';

export function isOwner() {
  return localStorage.getItem('ow_auth') === 'true';
}

export function ownerLogin(password) {
  if (password !== OWNER_PASSWORD) return false;
  localStorage.setItem('ow_auth', 'true');
  return true;
}

export function ownerLogout() {
  localStorage.removeItem('ow_auth');
  localStorage.removeItem(OW_KEYS.session);
}

export function getOwnerSession() {
  return readJSON(OW_KEYS.session, null);
}

export function saveOwnerSession(data) {
  writeJSON(OW_KEYS.session, data);
}

export function requiresOwner() {
  return !isOwner();
}
