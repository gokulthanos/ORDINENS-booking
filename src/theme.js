import { STORAGE_KEYS } from './utils.js';

const THEMES = ['dark', 'light'];

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme);
  const preferred = saved && THEMES.includes(saved) ? saved : 'dark';
  document.documentElement.setAttribute('data-theme', preferred);

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const next =
        document.documentElement.getAttribute('data-theme') === 'dark'
          ? 'light'
          : 'dark';
      setTheme(next);
    });
  }
  syncBtn();
}

export function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEYS.theme, theme);
  syncBtn();
}

function syncBtn() {
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.classList.toggle(
      'is-light',
      document.documentElement.getAttribute('data-theme') === 'light'
    );
  }
}