import L from 'leaflet';
import { setBrowserSanitizedHtml } from './browser-sanitizer';
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
  type?: 'club' | 'ally' | 'coming-soon' | 'meetup' | 'office' | string;
  displayName: string;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  approximateLocation?: boolean;
  mapLogoUrl?: string | null;
  mapBubbleDescription?: string | null;
  mapBubbleShowExactLocationLinks?: boolean;
}

type RangeType = 'club' | 'ally' | 'coming-soon' | 'meetup' | 'office';

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

const typeStyleMap: Record<RangeType, { bgColor: string; logoUrl?: string; iconClass?: string; iconColor?: string; innerBgColor?: string }> = {
  club: { bgColor: '#2e7d32', logoUrl: DEFAULT_CLUB_LOGO },
  ally: { bgColor: '#1565c0', iconClass: 'mdi mdi-handshake-outline', iconColor: '#0d47a1', innerBgColor: '#dbeafe' },
  'coming-soon': { bgColor: '#ef6c00', logoUrl: DEFAULT_CLUB_LOGO },
  meetup: { bgColor: '#00695c', logoUrl: DEFAULT_CLUB_LOGO },
  office: { bgColor: '#00897b', logoUrl: DEFAULT_CLUB_LOGO },
};

type MarkerWithRangeType = L.Marker & { options: L.MarkerOptions & { rangeType?: RangeType } };

const normalizeRangeType = (value: string | undefined): RangeType => {
  if (value === 'club' || value === 'ally' || value === 'coming-soon' || value === 'meetup' || value === 'office') {
    return value;
  }

  return 'club';
};

const getRangeLogoUrl = (range: RangeData, type: RangeType): string => {
  const customLogoUrl = typeof range.mapLogoUrl === 'string' ? range.mapLogoUrl.trim() : '';
  if (customLogoUrl.length > 0) {
    return customLogoUrl;
  }

  return typeStyleMap[type].logoUrl ?? DEFAULT_CLUB_LOGO;
};

const hasCustomRangeLogo = (range: RangeData): boolean =>
  typeof range.mapLogoUrl === 'string' && range.mapLogoUrl.trim().length > 0;

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
  const isApproximateLocation = range.approximateLocation ?? false;
  const centerContent = hasCustomRangeLogo(range) || !style.iconClass
    ? `<img src="${logoUrl}" alt="" width="56" height="56" style="display:block; object-fit:cover; border-radius:50%;" />`
    : `<i class="${style.iconClass}" style="font-size:36px; color:${style.iconColor ?? '#1f2937'}; line-height:1;"></i>`;
  const innerBgColor = style.innerBgColor ?? 'rgba(255,255,255,0.97)';

  const pin = isApproximateLocation
    ? `
    <div style="width:${size}px;height:${size}px;position: relative;">
      <div style="
        width:${size}px;
        height:${size}px;
        background: ${style.bgColor};
        border:2px solid #ffffff;
        border-radius: 50%;
        box-shadow:0 7px 18px rgba(0, 0, 0, 0.25);
        display:flex;
        align-items:center;
        justify-content:center;
        overflow:hidden;
      ">
        <div style="width:60px; height:60px; border-radius:50%; background:${innerBgColor}; display:flex; align-items:center; justify-content:center; overflow:hidden;">
          ${centerContent}
        </div>
      </div>
    </div>
  `
    : `
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
        <div style="transform: rotate(45deg); width:60px; height:60px; border-radius:50%; background:${innerBgColor}; display:flex; align-items:center; justify-content:center; overflow:hidden;">
          ${centerContent}
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: pin,
    className: 'leaflet-div-icon embed-map__pin',
    iconSize: isApproximateLocation ? [size, size] : [size, size + 6],
    iconAnchor: isApproximateLocation ? [size / 2, size / 2] : [size / 2, size + 6],
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
    case 'office':
      return 280;
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
    { club: 0, ally: 0, 'coming-soon': 0, meetup: 0, office: 0 },
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

const hasExactLocationLinks = (range: RangeData): boolean =>
  range.mapBubbleShowExactLocationLinks === true &&
  range.approximateLocation !== true &&
  typeof range.latitude === 'number' &&
  typeof range.longitude === 'number';

const createMapUrl = (range: RangeData, provider: 'google' | 'osm'): string => {
  const latitude = Number(range.latitude);
  const longitude = Number(range.longitude);
  if (provider === 'google') {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
};

const createDetailsPanel = (): { open: (range: RangeData) => void } => {
  const panel = document.createElement('aside');
  panel.className = 'embed-map__details-panel';
  panel.setAttribute('aria-hidden', 'true');

  const header = document.createElement('div');
  header.className = 'embed-map__details-header';

  const title = document.createElement('h2');
  title.className = 'embed-map__details-title';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'embed-map__details-close';
  closeButton.setAttribute('aria-label', 'Close panel');
  closeButton.textContent = 'x';

  const body = document.createElement('div');
  body.className = 'embed-map__details-body';

  const close = () => {
    panel.classList.remove('embed-map__details-panel--open');
    panel.setAttribute('aria-hidden', 'true');
  };

  closeButton.addEventListener('click', close);
  header.append(title, closeButton);
  panel.append(header, body);
  document.body.append(panel);

  return {
    open: (range: RangeData) => {
      title.textContent = range.displayName;
      body.replaceChildren();

      const description = typeof range.mapBubbleDescription === 'string' ? range.mapBubbleDescription.trim() : '';
      if (description.length > 0) {
        const descriptionElement = document.createElement('div');
        descriptionElement.className = 'embed-map__details-description';
        setBrowserSanitizedHtml(descriptionElement, description);
        body.append(descriptionElement);
      }

      if (hasExactLocationLinks(range)) {
        const actions = document.createElement('div');
        actions.className = 'embed-map__details-actions';

        const googleLink = document.createElement('a');
        googleLink.className = 'embed-map__details-link';
        googleLink.href = createMapUrl(range, 'google');
        googleLink.target = '_blank';
        googleLink.rel = 'noopener noreferrer';
        googleLink.textContent = 'Google Maps';

        const osmLink = document.createElement('a');
        osmLink.className = 'embed-map__details-link';
        osmLink.href = createMapUrl(range, 'osm');
        osmLink.target = '_blank';
        osmLink.rel = 'noopener noreferrer';
        osmLink.textContent = 'OSM';

        actions.append(googleLink, osmLink);
        body.append(actions);
      }

      panel.classList.add('embed-map__details-panel--open');
      panel.setAttribute('aria-hidden', 'false');
    },
  };
};

async function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) {
    console.error('Map element not found!');
    return;
  }

  const detailsPanel = createDetailsPanel();

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
    const response = await fetch('/api/v1/map-ranges?scope=embed');
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

        marker.bindTooltip(range.displayName, {
          direction: 'bottom',
          offset: L.point(0, 18),
          opacity: 1,
          className: 'embed-map__tooltip',
        });
        marker.on('mouseover', () => {
          marker.openTooltip();
        });
        marker.on('mouseout', () => {
          marker.closeTooltip();
        });

        marker.on('click', () => {
          detailsPanel.open(range);
        });
      });
    }

  } catch (error) {
    console.error('Error fetching ranges:', error);
  }
}

document.addEventListener('DOMContentLoaded', initMap);
