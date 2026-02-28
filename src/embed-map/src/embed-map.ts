import L from 'leaflet';
import 'leaflet.markercluster';
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
  type?: 'club' | 'ally' | 'coming-soon' | 'meetup' | string;
  displayName: string;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  mapLogoUrl?: string | null;
}

type RangeType = 'club' | 'ally' | 'coming-soon' | 'meetup';

const POLAND_BOUNDS = {
  latMin: 49.0,
  latMax: 54.8,
  lngMin: 14.07,
  lngMax: 24.15,
};

const POLAND_LEAFLET_BOUNDS = L.latLngBounds(
  [POLAND_BOUNDS.latMin, POLAND_BOUNDS.lngMin],
  [POLAND_BOUNDS.latMax, POLAND_BOUNDS.lngMax],
);

const POLAND_INTERACTION_PADDING = {
  north: 0.9,
  south: 0.2,
  west: 0.2,
  east: 0.2,
};

const POLAND_INTERACTION_BOUNDS = L.latLngBounds(
  [POLAND_BOUNDS.latMin - POLAND_INTERACTION_PADDING.south, POLAND_BOUNDS.lngMin - POLAND_INTERACTION_PADDING.west],
  [POLAND_BOUNDS.latMax + POLAND_INTERACTION_PADDING.north, POLAND_BOUNDS.lngMax + POLAND_INTERACTION_PADDING.east],
);

const createDefaultLogoDataUri = (svgContent: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">${svgContent}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const DEFAULT_CLUB_LOGO = createDefaultLogoDataUri(
  '<rect width="80" height="80" rx="20" fill="#1f2937"/><circle cx="40" cy="40" r="23" fill="none" stroke="#ffffff" stroke-width="6"/><circle cx="40" cy="40" r="13" fill="none" stroke="#ffffff" stroke-width="6"/><circle cx="40" cy="40" r="4.5" fill="#ffffff"/>',
);

const DEFAULT_ALLY_LOGO = createDefaultLogoDataUri(
  '<rect width="80" height="80" rx="20" fill="#0f3b68"/><path d="M22 48c6-1 9-7 13-10 4-3 8-4 12-1 4-3 8-2 12 1 4 3 7 9 13 10v8H22z" fill="#ffffff"/><rect x="18" y="27" width="17" height="9" rx="4.5" fill="#ffffff"/><rect x="45" y="27" width="17" height="9" rx="4.5" fill="#ffffff"/>',
);

const typeStyleMap: Record<RangeType, { bgColor: string; logoUrl: string }> = {
  club: { bgColor: '#2e7d32', logoUrl: DEFAULT_CLUB_LOGO },
  ally: { bgColor: '#1565c0', logoUrl: DEFAULT_ALLY_LOGO },
  'coming-soon': { bgColor: '#ef6c00', logoUrl: DEFAULT_CLUB_LOGO },
  meetup: { bgColor: '#00695c', logoUrl: DEFAULT_CLUB_LOGO },
};

type MarkerWithRangeType = L.Marker & { options: L.MarkerOptions & { rangeType?: RangeType } };

const normalizeRangeType = (value: string | undefined): RangeType => {
  if (value === 'club' || value === 'ally' || value === 'coming-soon' || value === 'meetup') {
    return value;
  }

  return 'club';
};

const getRangeLogoUrl = (range: RangeData, type: RangeType): string => {
  const customLogoUrl = typeof range.mapLogoUrl === 'string' ? range.mapLogoUrl.trim() : '';
  if (customLogoUrl.length > 0) {
    return customLogoUrl;
  }

  return typeStyleMap[type].logoUrl;
};

const escapeHtmlAttribute = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const createIcon = (range: RangeData): L.DivIcon => {
  const type = normalizeRangeType(range.type);
  const style = typeStyleMap[type];
  const logoUrl = escapeHtmlAttribute(getRangeLogoUrl(range, type));
  const size = 80;

  const pin = `
    <div style="width:${size}px;height:${size + 6}px;position: relative;">
      <div style="
        width:${size}px;
        height:${size}px;
        background: ${style.bgColor};
        border:2px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow:0 7px 18px rgba(0, 0, 0, 0.25);
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
      ">
        <div style="transform: rotate(45deg); width:60px; height:60px; border-radius:50%; background:rgba(255,255,255,0.97); display:flex; align-items:center; justify-content:center; overflow:hidden;">
          <img src="${logoUrl}" alt="" width="56" height="56" style="display:block; object-fit:cover; border-radius:50%;" />
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: pin,
    className: 'leaflet-div-icon embed-map__pin',
    iconSize: [size, size + 6],
    iconAnchor: [size / 2, size + 6],
  });
};

const getMarkerZIndex = (range: RangeData): number => {
  switch (normalizeRangeType(range.type)) {
    case 'club':
      return 300;
    case 'ally':
      return 200;
    case 'coming-soon':
      return 100;
    case 'meetup':
      return 250;
    default:
      return 150;
  }
};

const createClusterIcon = (cluster: L.MarkerCluster): L.DivIcon => {
  const markers = cluster.getAllChildMarkers() as MarkerWithRangeType[];
  const byType = markers.reduce<Record<RangeType, number>>(
    (acc, marker) => {
      const type = normalizeRangeType(marker.options.rangeType);
      acc[type] += 1;
      return acc;
    },
    { club: 0, ally: 0, 'coming-soon': 0, meetup: 0 },
  );

  const dominantType = (Object.entries(byType) as Array<[RangeType, number]>)
    .sort((a, b) => b[1] - a[1])[0][0];
  const bgColor = typeStyleMap[dominantType].bgColor;

  const count = cluster.getChildCount();
  const size = count < 10 ? 44 : count < 100 ? 50 : 56;

  return L.divIcon({
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        background:${bgColor};
        border:3px solid rgba(255,255,255,0.95);
        box-shadow:0 10px 24px rgba(0,0,0,0.22);
        color:#ffffff;
        font-weight:700;
        font-size:${count < 10 ? 16 : 15}px;
        display:flex;
        align-items:center;
        justify-content:center;
      ">${count}</div>
    `,
    className: 'embed-map__cluster',
    iconSize: [size, size],
  });
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

  const map = L.map(mapElement, {
    maxBounds: POLAND_INTERACTION_BOUNDS,
    maxBoundsViscosity: 0.85,
  });

  const markerClusterGroup = L.markerClusterGroup({
    animate: false,
    animateAddingMarkers: false,
    maxClusterRadius: 88,
    disableClusteringAtZoom: 11,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: createClusterIcon,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  map.fitBounds(POLAND_LEAFLET_BOUNDS, { padding: [0, 0], animate: false });
  markerClusterGroup.addTo(map);

  try {
    const response = await fetch('/api/v1/map-ranges');
    if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
    }
    const ranges: RangeData[] = await response.json();
    if (ranges.length > 0) {
      ranges.forEach(range => {
        if (range.latitude == null || range.longitude == null) {
          return;
        }

        const marker = L.marker([range.latitude, range.longitude], {
          icon: createIcon(range),
          zIndexOffset: getMarkerZIndex(range),
        }) as MarkerWithRangeType;
        marker.options.rangeType = normalizeRangeType(range.type);
        marker.addTo(markerClusterGroup);

        marker.bindPopup(range.displayName, {
          closeButton: false,
          autoPan: false,
          offset: L.point(0, -8),
          className: 'embed-map__popup',
        });
        marker.on('mouseover', () => {
          marker.openPopup();
        });
        marker.on('mouseout', () => {
          marker.closePopup();
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
