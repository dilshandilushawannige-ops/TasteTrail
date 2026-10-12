import type { Coordinates } from '@/utils/distance';

export interface LocationChoice extends Coordinates {
  name: string;
  type: 'province' | 'city';
  zoom: number;
}

export type ProvinceId =
  | 'western'
  | 'central'
  | 'southern'
  | 'northern'
  | 'eastern'
  | 'northWestern'
  | 'northCentral'
  | 'uva'
  | 'sabaragamuwa';

export const PROVINCE_KEYWORDS: Record<ProvinceId, string[]> = {
  western: ['colombo', 'gampaha', 'kalutara', 'negombo', 'moratuwa', 'dehiwala', 'mount lavinia', 'kotte', 'maharagama', 'panadura', 'wattala', 'ja-ela'],
  central: ['kandy', 'matale', 'nuwara eliya', 'peradeniya', 'gampola', 'dambulla'],
  southern: ['galle', 'matara', 'hambantota', 'unawatuna', 'mirissa', 'tangalle', 'weligama', 'hikkaduwa'],
  northern: ['jaffna', 'kilinochchi', 'mannar', 'vavuniya', 'mullaitivu'],
  eastern: ['trincomalee', 'batticaloa', 'ampara', 'kalmunai', 'arugam bay'],
  northWestern: ['kurunegala', 'puttalam', 'chilaw', 'kuliyapitiya'],
  northCentral: ['anuradhapura', 'polonnaruwa'],
  uva: ['badulla', 'monaragala', 'bandarawela', 'ella', 'haputale', 'welimada', 'mahiyangana', 'passara', 'wellawaya'],
  sabaragamuwa: ['ratnapura', 'kegalle', 'balangoda', 'embilipitiya'],
};

export const PROVINCE_ANCHORS: Record<ProvinceId, Coordinates[]> = {
  western: [{ latitude: 6.93, longitude: 79.85 }, { latitude: 7.09, longitude: 80 }, { latitude: 6.58, longitude: 79.96 }],
  central: [{ latitude: 7.29, longitude: 80.63 }, { latitude: 7.47, longitude: 80.62 }, { latitude: 6.95, longitude: 80.79 }, { latitude: 7.87, longitude: 80.65 }],
  southern: [{ latitude: 6.03, longitude: 80.22 }, { latitude: 5.95, longitude: 80.55 }, { latitude: 6.12, longitude: 81.12 }, { latitude: 6.28, longitude: 80.05 }],
  northern: [{ latitude: 9.66, longitude: 80.03 }, { latitude: 9.38, longitude: 80.4 }, { latitude: 8.98, longitude: 79.9 }],
  eastern: [{ latitude: 8.59, longitude: 81.22 }, { latitude: 7.71, longitude: 81.7 }, { latitude: 7.3, longitude: 81.68 }],
  northWestern: [{ latitude: 7.49, longitude: 80.36 }, { latitude: 8.04, longitude: 79.84 }, { latitude: 7.58, longitude: 79.8 }],
  northCentral: [{ latitude: 8.31, longitude: 80.4 }, { latitude: 7.94, longitude: 81 }, { latitude: 8.1, longitude: 80.75 }],
  uva: [{ latitude: 6.99, longitude: 81.06 }, { latitude: 6.83, longitude: 80.99 }, { latitude: 6.87, longitude: 81.35 }, { latitude: 7.32, longitude: 80.99 }],
  sabaragamuwa: [{ latitude: 6.68, longitude: 80.4 }, { latitude: 7.25, longitude: 80.35 }, { latitude: 6.43, longitude: 80.82 }],
};

export const SRI_LANKAN_PROVINCES: LocationChoice[] = [
  { name: 'Western Province', type: 'province', latitude: 6.9271, longitude: 79.8612, zoom: 9 },
  { name: 'Central Province', type: 'province', latitude: 7.2906, longitude: 80.6337, zoom: 9 },
  { name: 'Southern Province', type: 'province', latitude: 6.0535, longitude: 80.221, zoom: 9 },
  { name: 'Northern Province', type: 'province', latitude: 9.1, longitude: 80.2, zoom: 9 },
  { name: 'Eastern Province', type: 'province', latitude: 7.75, longitude: 81.4, zoom: 9 },
  { name: 'North Western Province', type: 'province', latitude: 7.75, longitude: 80.1, zoom: 9 },
  { name: 'North Central Province', type: 'province', latitude: 8.35, longitude: 80.5, zoom: 9 },
  { name: 'Uva Province', type: 'province', latitude: 6.9, longitude: 81.15, zoom: 9 },
  { name: 'Sabaragamuwa Province', type: 'province', latitude: 6.65, longitude: 80.55, zoom: 9 },
];

export const POPULAR_CITIES: LocationChoice[] = [
  { name: 'Colombo', type: 'city', latitude: 6.9271, longitude: 79.8612, zoom: 12 },
  { name: 'Kandy', type: 'city', latitude: 7.2906, longitude: 80.6337, zoom: 12 },
  { name: 'Galle', type: 'city', latitude: 6.0329, longitude: 80.2168, zoom: 12 },
  { name: 'Jaffna', type: 'city', latitude: 9.6615, longitude: 80.0255, zoom: 12 },
  { name: 'Negombo', type: 'city', latitude: 7.2083, longitude: 79.8358, zoom: 12 },
  { name: 'Matara', type: 'city', latitude: 5.9549, longitude: 80.555, zoom: 12 },
  { name: 'Badulla', type: 'city', latitude: 6.9934, longitude: 81.055, zoom: 12 },
  { name: 'Anuradhapura', type: 'city', latitude: 8.3114, longitude: 80.4037, zoom: 12 },
  { name: 'Nuwara Eliya', type: 'city', latitude: 6.9497, longitude: 80.7891, zoom: 12 },
  { name: 'Trincomalee', type: 'city', latitude: 8.5874, longitude: 81.2152, zoom: 12 },
  { name: 'Kurunegala', type: 'city', latitude: 7.4863, longitude: 80.3647, zoom: 12 },
  { name: 'Ratnapura', type: 'city', latitude: 6.6828, longitude: 80.3992, zoom: 12 },
];
