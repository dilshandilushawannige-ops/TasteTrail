export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export const OPEN_STREET_MAP_RASTER_STYLE = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '(c) OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
    },
  ],
};

export const DEFAULT_MAP_CENTER = { latitude: 6.9271, longitude: 79.8612 };
