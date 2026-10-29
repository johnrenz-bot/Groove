/**
 * A small, stable set of Philippine city anchors for the Studio Locator.
 *
 * These are shortcuts, not a claim of complete coverage. Users can search any
 * Philippine city, municipality, province, or address; these coordinates simply
 * let the UI jump somewhere useful without spending a geocoding request.
 */

export interface PhilippineCity {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
}

export const PHILIPPINE_CITIES: PhilippineCity[] = [
  { id: 'quezon-city', name: 'Quezon City', region: 'Metro Manila', latitude: 14.676, longitude: 121.0437 },
  { id: 'makati', name: 'Makati City', region: 'Metro Manila', latitude: 14.5547, longitude: 121.0244 },
  { id: 'manila', name: 'Manila', region: 'Metro Manila', latitude: 14.5995, longitude: 120.9842 },
  { id: 'taguig', name: 'Taguig City', region: 'Metro Manila', latitude: 14.5176, longitude: 121.0509 },
  { id: 'pasig', name: 'Pasig City', region: 'Metro Manila', latitude: 14.5764, longitude: 121.0851 },
  { id: 'san-jose-del-monte', name: 'San Jose del Monte', region: 'Bulacan', latitude: 14.8139, longitude: 121.0453 },
  { id: 'bocaue', name: 'Bocaue', region: 'Bulacan', latitude: 14.7954178, longitude: 120.9253578 },
  { id: 'marilao', name: 'Marilao', region: 'Bulacan', latitude: 14.7575956, longitude: 120.9484672 },
  { id: 'meycauayan', name: 'Meycauayan', region: 'Bulacan', latitude: 14.7345008, longitude: 120.9571635 },
  { id: 'santa-maria', name: 'Santa Maria', region: 'Bulacan', latitude: 14.8187993, longitude: 120.9607117 },
  { id: 'malolos', name: 'Malolos', region: 'Bulacan', latitude: 14.843759, longitude: 120.8113694 },
  { id: 'antipolo', name: 'Antipolo City', region: 'Rizal', latitude: 14.586, longitude: 121.1762 },
  { id: 'batangas-city', name: 'Batangas City', region: 'Batangas', latitude: 13.7565, longitude: 121.0583 },
  { id: 'lucena', name: 'Lucena City', region: 'Quezon', latitude: 13.937, longitude: 121.617 },
  { id: 'naga', name: 'Naga City', region: 'Camarines Sur', latitude: 13.6218, longitude: 123.1948 },
  { id: 'legazpi', name: 'Legazpi City', region: 'Albay', latitude: 13.1391, longitude: 123.7438 },
  { id: 'baguio', name: 'Baguio City', region: 'Benguet', latitude: 16.4023, longitude: 120.596 },
  { id: 'laoag', name: 'Laoag City', region: 'Ilocos Norte', latitude: 18.1978, longitude: 120.5936 },
  { id: 'vigan', name: 'Vigan City', region: 'Ilocos Sur', latitude: 17.5747, longitude: 120.3869 },
  { id: 'dagupan', name: 'Dagupan City', region: 'Pangasinan', latitude: 16.0433, longitude: 120.333 },
  { id: 'angeles', name: 'Angeles City', region: 'Pampanga', latitude: 15.145, longitude: 120.5887 },
  { id: 'olongapo', name: 'Olongapo City', region: 'Zambales', latitude: 14.8386, longitude: 120.2842 },
  { id: 'cebu-city', name: 'Cebu City', region: 'Cebu', latitude: 10.3157, longitude: 123.8854 },
  { id: 'lapu-lapu', name: 'Lapu-Lapu City', region: 'Cebu', latitude: 10.3103, longitude: 123.9494 },
  { id: 'dumaguete', name: 'Dumaguete City', region: 'Negros Oriental', latitude: 9.3068, longitude: 123.3054 },
  { id: 'iloilo-city', name: 'Iloilo City', region: 'Iloilo', latitude: 10.7202, longitude: 122.5621 },
  { id: 'bacolod', name: 'Bacolod City', region: 'Negros Occidental', latitude: 10.6765, longitude: 122.9509 },
  { id: 'tacloban', name: 'Tacloban City', region: 'Leyte', latitude: 11.244, longitude: 125.0038 },
  { id: 'cagayan-de-oro', name: 'Cagayan de Oro', region: 'Misamis Oriental', latitude: 8.4542, longitude: 124.6319 },
  { id: 'davao-city', name: 'Davao City', region: 'Davao del Sur', latitude: 7.1907, longitude: 125.4553 },
  { id: 'general-santos', name: 'General Santos City', region: 'South Cotabato', latitude: 6.1164, longitude: 125.1716 },
  { id: 'butuan', name: 'Butuan City', region: 'Agusan del Norte', latitude: 8.9475, longitude: 125.5406 },
  { id: 'zamboanga', name: 'Zamboanga City', region: 'Zamboanga del Sur', latitude: 6.9214, longitude: 122.079 },
];

/**
 * Shortcut chips chosen for geographic spread and dance-scene relevance.
 * Any other Philippine location remains searchable.
 */
export const LOCAL_PHILIPPINE_CITIES = PHILIPPINE_CITIES.filter((city) =>
  ['bocaue', 'marilao', 'meycauayan', 'santa-maria', 'san-jose-del-monte', 'malolos'].includes(
    city.id
  )
);

export const POPULAR_PHILIPPINE_CITIES = PHILIPPINE_CITIES.filter((city) =>
  [
    'quezon-city',
    'makati',
    'cebu-city',
    'davao-city',
    'baguio',
    'angeles',
    'iloilo-city',
    'cagayan-de-oro',
  ].includes(city.id)
);
