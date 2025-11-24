import L from 'leaflet';
import { mdiTarget, mdiHandshake, mdiProgressClock, mdiMapMarker } from '@mdi/js';
// Force Leaflet to use explicit URLs instead of prepending its own imagePath
// when running in the embed bundle.
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface RangeData {
  id: string | number;
  slug: string;
  type?: 'club' | 'ally' | 'coming-soon' | string;
  displayName: string;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}

const POLAND_BOUNDS = {
  latMin: 49.0,
  latMax: 54.8,
  lngMin: 14.07,
  lngMax: 24.15,
};

const POLAND_CENTER: [number, number] = [
  (POLAND_BOUNDS.latMin + POLAND_BOUNDS.latMax) / 2,
  19.5,
];

const typeStyleMap: Record<string, { color: string; iconPath: string }> = {
  club: { color: '#43a047', iconPath: mdiTarget },
  ally: { color: '#0288d1', iconPath: mdiHandshake },
  'coming-soon': { color: '#f59e0b', iconPath: mdiProgressClock },
};

const createIcon = (range: RangeData): L.DivIcon => {
  const style = typeStyleMap[range.type ?? ''] ?? { color: '#1976d2', iconPath: mdiMapMarker };
  const size = 34;
  const border = '2px';
  const shadow = '0 4px 10px rgba(0, 0, 0, 0.18)';

  const svg = `
    <div style="width:${size}px;height:${size + 6}px;position: relative;">
      <div style="
        width:${size}px;
        height:${size}px;
        background: white;
        border:${border} solid ${style.color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow:${shadow};
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <svg style="transform: rotate(45deg);" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="${style.color}" aria-hidden="true" focusable="false">
          <path d="${style.iconPath}" />
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html: svg,
    className: 'leaflet-div-icon embed-map__pin',
    iconSize: [size, size + 6],
    iconAnchor: [size / 2, size + 6],
  });
};

const getMarkerZIndex = (range: RangeData): number => {
  switch (range.type) {
    case 'club':
      return 300;
    case 'ally':
      return 200;
    case 'coming-soon':
      return 100;
    default:
      return 150;
  }
};

const getParentOrigin = (): string => {
  const param = new URLSearchParams(window.location.search).get('parentOrigin');
  if (!param) {
    return '*';
  }

  try {
    const { origin } = new URL(param);
    return origin;
  } catch {
    console.warn('Invalid parentOrigin parameter, defaulting to "*".');
    return '*';
  }
};

async function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) {
    console.error('Map element not found!');
    return;
  }

  const parentOrigin = getParentOrigin();

  const map = L.map(mapElement).setView(POLAND_CENTER, 6); // Start on Poland

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  try {
    const response = await fetch('/api/v1/map-ranges');
    if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
    }
    const ranges: RangeData[] = await response.json();
    if (ranges.length > 0) {
      const valid = ranges.filter((range) => range.latitude != null && range.longitude != null);
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map((range) => [range.latitude as number, range.longitude as number]));
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.2), { maxZoom: 12 });
        }
      }

      ranges.forEach(range => {
        if (range.latitude == null || range.longitude == null) {
          return;
        }

        const marker = L.marker([range.latitude, range.longitude], {
          icon: createIcon(range),
          zIndexOffset: getMarkerZIndex(range),
        }).addTo(map);

        marker.bindTooltip(range.displayName, {
          direction: 'top',
          offset: L.point(0, -4),
          opacity: 0.95,
          permanent: false,
          sticky: false,
          className: 'embed-map__tooltip',
        });

        marker.on('click', () => {
          const rangeUrl = '/' + (range.slug ?? range.id);
          window.parent.postMessage({ type: 'navigate', url: rangeUrl }, parentOrigin);
        });
      });
    }

  } catch (error) {
    console.error('Error fetching ranges:', error);
  }
}

document.addEventListener('DOMContentLoaded', initMap);
