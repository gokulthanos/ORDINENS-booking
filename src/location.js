const FALLBACK_CITY = 'Coimbatore';

export function initLiveLocation() {
  const el = document.getElementById('location-text');
  if (!el) return;

  if (!navigator.geolocation) {
    el.textContent = FALLBACK_CITY;
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude: lat, longitude: lon } = pos.coords;

        let city = '';
        let area = '';

        for (const zoom of [10, 14, 18]) {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=${zoom}&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const a = data.address || {};

          if (!city) {
            city = a.city || a.state_district || '';
          }
          if (!area) {
            area = a.town || a.suburb || a.neighbourhood || a.quarter || a.county || a.village || '';
          }

          if (city && area) break;
        }

        city = city || FALLBACK_CITY;

        if (area && city && area.toLowerCase() !== city.toLowerCase()) {
          el.textContent = `${city}, ${area}`;
        } else {
          el.textContent = city;
        }

        el.title = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
      } catch {
        el.textContent = FALLBACK_CITY;
      }
    },
    () => {
      el.textContent = FALLBACK_CITY;
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}
