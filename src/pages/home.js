import { getShops } from '../data.js';
import { formatINR, escapeHtml } from '../utils.js';
import { currentUser } from '../auth.js';

function getCustomerLocation() {
  const el = document.getElementById('location-text');
  return el ? el.textContent.trim() : 'Coimbatore';
}

function shopCardHTML(s) {
  return `
    <article class="shop-card">
      <div class="shop-card-main">
        <h3 class="shop-name">${escapeHtml(s.name)}</h3>
        <p class="shop-meta">${escapeHtml(s.area || s.location || '')} &middot; ${escapeHtml(s.shopType || '')}</p>
        <p class="shop-desc">${escapeHtml(s.description || '')}</p>
        <p class="shop-services">${shopServicesPreview(s)}</p>
      </div>
      <a class="btn btn-primary btn-sm" href="#shop/${encodeURIComponent(s.id)}">View Shop</a>
    </article>`;
}

function shopServicesPreview(shop) {
  const active = (shop.services || []).filter((s) => s.active !== false);
  if (!active.length) return '';
  const cheapest = Math.min(...active.map((s) => s.price));
  return `From ${formatINR(cheapest)}`;
}

function groupShops(shops) {
  const groups = new Map();
  for (const s of shops) {
    const area = s.area || s.location || 'Other';
    if (!groups.has(area)) groups.set(area, []);
    groups.get(area).push(s);
  }
  return [...groups.entries()];
}

function areaSections(shops) {
  return groupShops(shops)
    .map(
      ([area, list]) => `
      <h4 class="area-heading">${escapeHtml(area)}</h4>
      ${list.map(shopCardHTML).join('')}`
    )
    .join('');
}

export default function mountHome(root) {
  const user = currentUser();
  const greeting = document.getElementById('home-greeting');
  if (greeting) {
    greeting.textContent = user ? `Hello, ${String(user.name).split(' ')[0]}` : 'Hello';
  }

  const allShops = getShops().filter((s) => s.onboarded !== false && s.status !== 'closed');

  const nearbyEl = document.getElementById('nearby-shops');
  const moreEl = document.getElementById('more-shops');
  const searchEl = document.getElementById('home-search');

  const CUSTOMER_LOCATION = getCustomerLocation();

  function nearbyShops() {
    const localized = allShops.filter(
      (s) =>
        (s.location && s.location.toLowerCase().includes(CUSTOMER_LOCATION.toLowerCase())) ||
        true
    );
    const first = localized.slice(0, 3);
    const rest = allShops.slice(3);
    nearbyEl.innerHTML = first.length
      ? areaSections(first)
      : '<p class="empty-state">No shops found nearby.</p>';
    moreEl.innerHTML = rest.length
      ? areaSections(rest)
      : '<p class="empty-state">No more shops to show.</p>';
  }

  function renderSearch(term) {
    const q = term.trim().toLowerCase();
    if (!q) {
      nearbyShops();
      return;
    }
    const shops = allShops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.area || '').toLowerCase().includes(q) ||
        (s.location || '').toLowerCase().includes(q) ||
        (s.services || []).some((sv) => sv.name.toLowerCase().includes(q))
    );
    if (shops.length > 0) {
      const first = shops.slice(0, 3);
      const rest = shops.slice(3);
      nearbyEl.innerHTML = areaSections(first);
      moreEl.innerHTML = rest.length ? areaSections(rest) : '';
    } else {
      nearbyEl.innerHTML = '<p class="empty-state">No matching shops found.</p>';
      moreEl.innerHTML = '';
    }
  }

  nearbyShops();

  searchEl?.addEventListener('input', (e) => renderSearch(e.target.value));
}
