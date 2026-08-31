import { getShop, getServices } from '../data.js';
import { formatINR, escapeHtml } from '../utils.js';

function getShopId() {
  const m = location.hash.match(/^#\/?shop\/([\w-]+)/i);
  return m ? m[1] : null;
}

function serviceRowHTML(shopId, s) {
  return `
    <div class="service-row shop-service-row">
      <div class="service-row-main">
        <span class="service-name">${escapeHtml(s.name)}</span>
        <span class="service-price">${formatINR(s.price)}</span>
      </div>
      <a class="btn btn-primary btn-sm" href="#booking" data-select-service="${s.id}" data-shop="${encodeURIComponent(shopId)}">Select</a>
    </div>`;
}

export default function mountShop(root) {
  const shop = getShop(getShopId());
  if (!shop) {
    root.innerHTML = '<p class="empty-state">Shop not found.</p>';
    return;
  }

  document.getElementById('shop-name').textContent = shop.name;
  document.getElementById('shop-area').textContent = `${shop.area || ''}${shop.area && shop.location ? ', ' : ''}${shop.location || ''}`;
  document.getElementById('shop-address').textContent = shop.address || 'Not provided';
  const about = document.getElementById('shop-about');
  about.textContent = shop.description || 'No description yet.';

  const dir = document.getElementById('shop-directions');
  if (shop.address) {
    dir.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`;
  } else {
    dir.removeAttribute('href');
  }

  const services = (shop.services || []).filter((s) => s.active !== false);
  const list = document.getElementById('shop-services');
  if (!services.length) {
    list.innerHTML = '<p class="empty-state">No services available.</p>';
    return;
  }

  list.innerHTML = services.map((s) => serviceRowHTML(shop.id, s)).join('');

  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-select-service]');
    if (btn) {
      sessionStorage.setItem('pt_booking', JSON.stringify({
        shopId: shop.id,
        serviceId: btn.dataset.selectService,
      }));
    }
  });
}
