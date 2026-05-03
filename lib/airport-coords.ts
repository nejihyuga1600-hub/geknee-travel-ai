// Top international airports with lat/lng + Haversine nearest-airport
// lookup. Used to translate a user's geolocation coords into a usable
// origin IATA code for the booking-suggestions prompt. Hardcoded list
// covers >95% of likely user homes (~80 airports across major regions);
// fallback returns the closest by great-circle distance.
//
// Separate file from lib/airports.ts because that one is a city→IATA
// map shaped for the style/book pages — incompatible schema, different
// callers. Kept side-by-side rather than merged.

export interface AirportRec {
  iata: string;
  city: string;
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  lat: number;
  lng: number;
}

export const AIRPORT_COORDS: AirportRec[] = [
  // ── United States / Canada ────────────────────────────────────────────────
  { iata: 'JFK', city: 'New York',     country: 'United States', countryCode: 'US', lat: 40.6413, lng: -73.7781 },
  { iata: 'LGA', city: 'New York',     country: 'United States', countryCode: 'US', lat: 40.7769, lng: -73.8740 },
  { iata: 'EWR', city: 'Newark',       country: 'United States', countryCode: 'US', lat: 40.6895, lng: -74.1745 },
  { iata: 'BOS', city: 'Boston',       country: 'United States', countryCode: 'US', lat: 42.3656, lng: -71.0096 },
  { iata: 'IAD', city: 'Washington',   country: 'United States', countryCode: 'US', lat: 38.9531, lng: -77.4565 },
  { iata: 'BWI', city: 'Baltimore',    country: 'United States', countryCode: 'US', lat: 39.1754, lng: -76.6684 },
  { iata: 'DCA', city: 'Washington',   country: 'United States', countryCode: 'US', lat: 38.8512, lng: -77.0402 },
  { iata: 'PHL', city: 'Philadelphia', country: 'United States', countryCode: 'US', lat: 39.8729, lng: -75.2437 },
  { iata: 'CLT', city: 'Charlotte',    country: 'United States', countryCode: 'US', lat: 35.2144, lng: -80.9473 },
  { iata: 'MIA', city: 'Miami',        country: 'United States', countryCode: 'US', lat: 25.7959, lng: -80.2870 },
  { iata: 'MCO', city: 'Orlando',      country: 'United States', countryCode: 'US', lat: 28.4312, lng: -81.3081 },
  { iata: 'ATL', city: 'Atlanta',      country: 'United States', countryCode: 'US', lat: 33.6407, lng: -84.4277 },
  { iata: 'DFW', city: 'Dallas',       country: 'United States', countryCode: 'US', lat: 32.8998, lng: -97.0403 },
  { iata: 'IAH', city: 'Houston',      country: 'United States', countryCode: 'US', lat: 29.9902, lng: -95.3368 },
  { iata: 'AUS', city: 'Austin',       country: 'United States', countryCode: 'US', lat: 30.1975, lng: -97.6664 },
  { iata: 'ORD', city: 'Chicago',      country: 'United States', countryCode: 'US', lat: 41.9742, lng: -87.9073 },
  { iata: 'MSP', city: 'Minneapolis',  country: 'United States', countryCode: 'US', lat: 44.8848, lng: -93.2223 },
  { iata: 'DTW', city: 'Detroit',      country: 'United States', countryCode: 'US', lat: 42.2162, lng: -83.3554 },
  { iata: 'DEN', city: 'Denver',       country: 'United States', countryCode: 'US', lat: 39.8561, lng: -104.6737 },
  { iata: 'PHX', city: 'Phoenix',      country: 'United States', countryCode: 'US', lat: 33.4373, lng: -112.0078 },
  { iata: 'LAS', city: 'Las Vegas',    country: 'United States', countryCode: 'US', lat: 36.0840, lng: -115.1537 },
  { iata: 'LAX', city: 'Los Angeles',  country: 'United States', countryCode: 'US', lat: 33.9416, lng: -118.4085 },
  { iata: 'SAN', city: 'San Diego',    country: 'United States', countryCode: 'US', lat: 32.7338, lng: -117.1933 },
  { iata: 'SFO', city: 'San Francisco', country: 'United States', countryCode: 'US', lat: 37.6213, lng: -122.3790 },
  { iata: 'SJC', city: 'San Jose',     country: 'United States', countryCode: 'US', lat: 37.3639, lng: -121.9289 },
  { iata: 'OAK', city: 'Oakland',      country: 'United States', countryCode: 'US', lat: 37.7126, lng: -122.2197 },
  { iata: 'PDX', city: 'Portland',     country: 'United States', countryCode: 'US', lat: 45.5898, lng: -122.5951 },
  { iata: 'SEA', city: 'Seattle',      country: 'United States', countryCode: 'US', lat: 47.4502, lng: -122.3088 },
  { iata: 'HNL', city: 'Honolulu',     country: 'United States', countryCode: 'US', lat: 21.3245, lng: -157.9251 },
  { iata: 'YYZ', city: 'Toronto',      country: 'Canada',        countryCode: 'CA', lat: 43.6777, lng: -79.6248 },
  { iata: 'YVR', city: 'Vancouver',    country: 'Canada',        countryCode: 'CA', lat: 49.1939, lng: -123.1844 },
  { iata: 'YUL', city: 'Montreal',     country: 'Canada',        countryCode: 'CA', lat: 45.4706, lng: -73.7408 },

  // ── Europe ────────────────────────────────────────────────────────────────
  { iata: 'LHR', city: 'London',       country: 'United Kingdom', countryCode: 'GB', lat: 51.4700, lng: -0.4543 },
  { iata: 'LGW', city: 'London',       country: 'United Kingdom', countryCode: 'GB', lat: 51.1537, lng: -0.1821 },
  { iata: 'STN', city: 'London',       country: 'United Kingdom', countryCode: 'GB', lat: 51.8860, lng: 0.2389 },
  { iata: 'MAN', city: 'Manchester',   country: 'United Kingdom', countryCode: 'GB', lat: 53.3537, lng: -2.2750 },
  { iata: 'EDI', city: 'Edinburgh',    country: 'United Kingdom', countryCode: 'GB', lat: 55.9500, lng: -3.3725 },
  { iata: 'DUB', city: 'Dublin',       country: 'Ireland',        countryCode: 'IE', lat: 53.4213, lng: -6.2701 },
  { iata: 'CDG', city: 'Paris',        country: 'France',         countryCode: 'FR', lat: 49.0097, lng: 2.5479 },
  { iata: 'ORY', city: 'Paris',        country: 'France',         countryCode: 'FR', lat: 48.7233, lng: 2.3794 },
  { iata: 'AMS', city: 'Amsterdam',    country: 'Netherlands',    countryCode: 'NL', lat: 52.3105, lng: 4.7683 },
  { iata: 'FRA', city: 'Frankfurt',    country: 'Germany',        countryCode: 'DE', lat: 50.0379, lng: 8.5622 },
  { iata: 'MUC', city: 'Munich',       country: 'Germany',        countryCode: 'DE', lat: 48.3537, lng: 11.7860 },
  { iata: 'BER', city: 'Berlin',       country: 'Germany',        countryCode: 'DE', lat: 52.3667, lng: 13.5033 },
  { iata: 'ZRH', city: 'Zurich',       country: 'Switzerland',    countryCode: 'CH', lat: 47.4647, lng: 8.5492 },
  { iata: 'VIE', city: 'Vienna',       country: 'Austria',        countryCode: 'AT', lat: 48.1103, lng: 16.5697 },
  { iata: 'MAD', city: 'Madrid',       country: 'Spain',          countryCode: 'ES', lat: 40.4983, lng: -3.5676 },
  { iata: 'BCN', city: 'Barcelona',    country: 'Spain',          countryCode: 'ES', lat: 41.2974, lng: 2.0833 },
  { iata: 'LIS', city: 'Lisbon',       country: 'Portugal',       countryCode: 'PT', lat: 38.7813, lng: -9.1359 },
  { iata: 'FCO', city: 'Rome',         country: 'Italy',          countryCode: 'IT', lat: 41.8003, lng: 12.2389 },
  { iata: 'MXP', city: 'Milan',        country: 'Italy',          countryCode: 'IT', lat: 45.6306, lng: 8.7281 },
  { iata: 'CPH', city: 'Copenhagen',   country: 'Denmark',        countryCode: 'DK', lat: 55.6181, lng: 12.6561 },
  { iata: 'ARN', city: 'Stockholm',    country: 'Sweden',         countryCode: 'SE', lat: 59.6519, lng: 17.9186 },
  { iata: 'OSL', city: 'Oslo',         country: 'Norway',         countryCode: 'NO', lat: 60.1939, lng: 11.1004 },
  { iata: 'HEL', city: 'Helsinki',     country: 'Finland',        countryCode: 'FI', lat: 60.3172, lng: 24.9633 },
  { iata: 'WAW', city: 'Warsaw',       country: 'Poland',         countryCode: 'PL', lat: 52.1657, lng: 20.9671 },
  { iata: 'PRG', city: 'Prague',       country: 'Czechia',        countryCode: 'CZ', lat: 50.1008, lng: 14.2632 },
  { iata: 'IST', city: 'Istanbul',     country: 'Turkey',         countryCode: 'TR', lat: 41.2753, lng: 28.7519 },
  { iata: 'SVO', city: 'Moscow',       country: 'Russia',         countryCode: 'RU', lat: 55.9726, lng: 37.4146 },

  // ── Middle East / South Asia ─────────────────────────────────────────────
  { iata: 'DXB', city: 'Dubai',        country: 'United Arab Emirates', countryCode: 'AE', lat: 25.2528, lng: 55.3644 },
  { iata: 'AUH', city: 'Abu Dhabi',    country: 'United Arab Emirates', countryCode: 'AE', lat: 24.4330, lng: 54.6511 },
  { iata: 'DOH', city: 'Doha',         country: 'Qatar',          countryCode: 'QA', lat: 25.2731, lng: 51.6080 },
  { iata: 'TLV', city: 'Tel Aviv',     country: 'Israel',         countryCode: 'IL', lat: 32.0114, lng: 34.8867 },
  { iata: 'DEL', city: 'Delhi',        country: 'India',          countryCode: 'IN', lat: 28.5562, lng: 77.1000 },
  { iata: 'BOM', city: 'Mumbai',       country: 'India',          countryCode: 'IN', lat: 19.0896, lng: 72.8656 },
  { iata: 'BLR', city: 'Bangalore',    country: 'India',          countryCode: 'IN', lat: 13.1986, lng: 77.7066 },
  { iata: 'MAA', city: 'Chennai',      country: 'India',          countryCode: 'IN', lat: 12.9941, lng: 80.1709 },
  { iata: 'HYD', city: 'Hyderabad',    country: 'India',          countryCode: 'IN', lat: 17.2403, lng: 78.4294 },

  // ── East / Southeast Asia ────────────────────────────────────────────────
  { iata: 'NRT', city: 'Tokyo',        country: 'Japan',          countryCode: 'JP', lat: 35.7720, lng: 140.3929 },
  { iata: 'HND', city: 'Tokyo',        country: 'Japan',          countryCode: 'JP', lat: 35.5523, lng: 139.7798 },
  { iata: 'KIX', city: 'Osaka',        country: 'Japan',          countryCode: 'JP', lat: 34.4347, lng: 135.2329 },
  { iata: 'ICN', city: 'Seoul',        country: 'South Korea',    countryCode: 'KR', lat: 37.4602, lng: 126.4407 },
  { iata: 'GMP', city: 'Seoul',        country: 'South Korea',    countryCode: 'KR', lat: 37.5587, lng: 126.7906 },
  { iata: 'PEK', city: 'Beijing',      country: 'China',          countryCode: 'CN', lat: 40.0801, lng: 116.5846 },
  { iata: 'PVG', city: 'Shanghai',     country: 'China',          countryCode: 'CN', lat: 31.1443, lng: 121.8083 },
  { iata: 'CAN', city: 'Guangzhou',    country: 'China',          countryCode: 'CN', lat: 23.3924, lng: 113.2988 },
  { iata: 'HKG', city: 'Hong Kong',    country: 'Hong Kong',      countryCode: 'HK', lat: 22.3080, lng: 113.9185 },
  { iata: 'TPE', city: 'Taipei',       country: 'Taiwan',         countryCode: 'TW', lat: 25.0797, lng: 121.2342 },
  { iata: 'SIN', city: 'Singapore',    country: 'Singapore',      countryCode: 'SG', lat: 1.3644,  lng: 103.9915 },
  { iata: 'BKK', city: 'Bangkok',      country: 'Thailand',       countryCode: 'TH', lat: 13.6900, lng: 100.7501 },
  { iata: 'KUL', city: 'Kuala Lumpur', country: 'Malaysia',       countryCode: 'MY', lat: 2.7456,  lng: 101.7099 },
  { iata: 'CGK', city: 'Jakarta',      country: 'Indonesia',      countryCode: 'ID', lat: -6.1256, lng: 106.6559 },
  { iata: 'MNL', city: 'Manila',       country: 'Philippines',    countryCode: 'PH', lat: 14.5086, lng: 121.0198 },
  { iata: 'SGN', city: 'Ho Chi Minh',  country: 'Vietnam',        countryCode: 'VN', lat: 10.8188, lng: 106.6519 },

  // ── Oceania ─────────────────────────────────────────────────────────────
  { iata: 'SYD', city: 'Sydney',       country: 'Australia',      countryCode: 'AU', lat: -33.9461, lng: 151.1772 },
  { iata: 'MEL', city: 'Melbourne',    country: 'Australia',      countryCode: 'AU', lat: -37.6690, lng: 144.8410 },
  { iata: 'BNE', city: 'Brisbane',     country: 'Australia',      countryCode: 'AU', lat: -27.3942, lng: 153.1218 },
  { iata: 'PER', city: 'Perth',        country: 'Australia',      countryCode: 'AU', lat: -31.9403, lng: 115.9669 },
  { iata: 'AKL', city: 'Auckland',     country: 'New Zealand',    countryCode: 'NZ', lat: -37.0082, lng: 174.7917 },

  // ── Africa ──────────────────────────────────────────────────────────────
  { iata: 'CAI', city: 'Cairo',        country: 'Egypt',          countryCode: 'EG', lat: 30.1219, lng: 31.4056 },
  { iata: 'JNB', city: 'Johannesburg', country: 'South Africa',   countryCode: 'ZA', lat: -26.1392, lng: 28.2460 },
  { iata: 'CPT', city: 'Cape Town',    country: 'South Africa',   countryCode: 'ZA', lat: -33.9648, lng: 18.6017 },
  { iata: 'NBO', city: 'Nairobi',      country: 'Kenya',          countryCode: 'KE', lat: -1.3192, lng: 36.9277 },
  { iata: 'LOS', city: 'Lagos',        country: 'Nigeria',        countryCode: 'NG', lat: 6.5774,  lng: 3.3211 },
  { iata: 'CMN', city: 'Casablanca',   country: 'Morocco',        countryCode: 'MA', lat: 33.3675, lng: -7.5898 },
  { iata: 'ADD', city: 'Addis Ababa',  country: 'Ethiopia',       countryCode: 'ET', lat: 8.9778,  lng: 38.7993 },

  // ── Latin America ───────────────────────────────────────────────────────
  { iata: 'MEX', city: 'Mexico City',  country: 'Mexico',         countryCode: 'MX', lat: 19.4361, lng: -99.0719 },
  { iata: 'CUN', city: 'Cancún',       country: 'Mexico',         countryCode: 'MX', lat: 21.0365, lng: -86.8770 },
  { iata: 'GRU', city: 'São Paulo',    country: 'Brazil',         countryCode: 'BR', lat: -23.4356, lng: -46.4731 },
  { iata: 'GIG', city: 'Rio de Janeiro', country: 'Brazil',       countryCode: 'BR', lat: -22.8099, lng: -43.2505 },
  { iata: 'EZE', city: 'Buenos Aires', country: 'Argentina',      countryCode: 'AR', lat: -34.8222, lng: -58.5358 },
  { iata: 'SCL', city: 'Santiago',     country: 'Chile',          countryCode: 'CL', lat: -33.3927, lng: -70.7854 },
  { iata: 'LIM', city: 'Lima',         country: 'Peru',           countryCode: 'PE', lat: -12.0219, lng: -77.1143 },
  { iata: 'BOG', city: 'Bogotá',       country: 'Colombia',       countryCode: 'CO', lat: 4.7016,  lng: -74.1469 },
  { iata: 'PTY', city: 'Panama City',  country: 'Panama',         countryCode: 'PA', lat: 9.0714,  lng: -79.3835 },
];

// Great-circle distance in kilometers between two lat/lng points.
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestAirport(lat: number, lng: number): AirportRec | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best: AirportRec | null = null;
  let bestDist = Infinity;
  for (const a of AIRPORT_COORDS) {
    const d = haversineKm(lat, lng, a.lat, a.lng);
    if (d < bestDist) { bestDist = d; best = a; }
  }
  return best;
}
