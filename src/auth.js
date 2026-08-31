import { STORAGE_KEYS, readJSON, writeJSON, uid } from './utils.js';

export const ADMIN_PASSWORD = 'pentane';

export function isRegistered(identifier) {
  const users = readJSON(STORAGE_KEYS.users, {});
  return Boolean(users[String(identifier).toLowerCase()]);
}

export function register({ identifier, name }) {
  const users = readJSON(STORAGE_KEYS.users, {});
  const key = String(identifier).toLowerCase();
  if (!users[key]) {
    users[key] = {
      identifier,
      name,
      createdAt: new Date().toISOString(),
      id: uid('usr'),
    };
  }
  writeJSON(STORAGE_KEYS.users, users);
}

export function login(identifier, name) {
  const user = {
    identifier,
    name: name || 'Customer',
    loginAt: new Date().toISOString(),
  };
  writeJSON(STORAGE_KEYS.session, user);
  return user;
}

export function currentUser() {
  return readJSON(STORAGE_KEYS.session, null);
}

export function logout() {
  localStorage.removeItem(STORAGE_KEYS.session);
}

export function requiresLogin() {
  return !currentUser();
}

export function isAdmin() {
  return localStorage.getItem(STORAGE_KEYS.admin) === 'true';
}

export function adminLogin(password) {
  if (password !== ADMIN_PASSWORD) return false;
  localStorage.setItem(STORAGE_KEYS.admin, 'true');
  return true;
}

export function adminLogout() {
  localStorage.removeItem(STORAGE_KEYS.admin);
}