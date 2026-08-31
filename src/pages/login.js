import { login, register, isRegistered, currentUser } from '../auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export function validateIdentifier(value) {
  const v = String(value || '').trim();
  if (EMAIL_RE.test(v)) return { ok: true, type: 'email', value: v.toLowerCase() };
  const phone = v.replace(/[\s-]/g, '');
  if (PHONE_RE.test(phone))
    return { ok: true, type: 'phone', value: phone };
  return { ok: false, type: null, value: v };
}

export default function mountLogin() {
  const form = document.getElementById('login-form');
  const note = document.getElementById('login-note');
  const identifier = document.getElementById('login-identifier');
  const nameInput = document.getElementById('login-name');

  sessionStorage.removeItem('pt_login_route');

  identifier.addEventListener('input', () => {
    if (isRegistered(identifier.value)) {
      nameInput.value = currentUser()?.name || '';
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const parsed = validateIdentifier(identifier.value);
    const name = nameInput.value.trim();
    note.textContent = '';

    if (!parsed.ok) {
      note.textContent = 'Enter a valid email or a 10-digit Indian phone number.';
      identifier.focus();
      return;
    }
    if (!name) {
      note.textContent = 'Please tell us your name.';
      nameInput.focus();
      return;
    }

    register({ identifier: parsed.value, name });
    login(parsed.value, name);

    const next = sessionStorage.getItem('pt_next');
    sessionStorage.removeItem('pt_next');
    location.hash = next || '#booking';
  });
}