// ── Indian city database for supply-chain simulation ──────────────
// Curated list of major logistics-relevant cities with coordinates

export const DEFAULT_NODES = [
  { id: 'BLR', name: 'Bangalore',   lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
  { id: 'MAA', name: 'Chennai',     lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
  { id: 'BOM', name: 'Mumbai',      lat: 19.0760, lng: 72.8777, state: 'Maharashtra' },
  { id: 'DEL', name: 'Delhi',       lat: 28.7041, lng: 77.1025, state: 'Delhi' },
  { id: 'PNQ', name: 'Pune',        lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
  { id: 'HYD', name: 'Hyderabad',   lat: 17.3850, lng: 78.4867, state: 'Telangana' },
  { id: 'KOL', name: 'Kolkata',     lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
  { id: 'AMD', name: 'Ahmedabad',   lat: 23.0225, lng: 72.5714, state: 'Gujarat' },
  { id: 'JAI', name: 'Jaipur',      lat: 26.9124, lng: 75.7873, state: 'Rajasthan' },
  { id: 'LKO', name: 'Lucknow',     lat: 26.8467, lng: 80.9462, state: 'Uttar Pradesh' },
  { id: 'NAG', name: 'Nagpur',      lat: 21.1458, lng: 79.0882, state: 'Maharashtra' },
  { id: 'GOA', name: 'Goa',         lat: 15.2993, lng: 74.1240, state: 'Goa' },
  { id: 'COK', name: 'Kochi',       lat: 9.9312,  lng: 76.2673, state: 'Kerala' },
  { id: 'TRV', name: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366, state: 'Kerala' },
  { id: 'VTZ', name: 'Visakhapatnam', lat: 17.6868, lng: 83.2185, state: 'Andhra Pradesh' },
  { id: 'IXC', name: 'Chandigarh',  lat: 30.7333, lng: 76.7794, state: 'Chandigarh' },
  { id: 'PAT', name: 'Patna',       lat: 25.6093, lng: 85.1376, state: 'Bihar' },
  { id: 'BHO', name: 'Bhopal',      lat: 23.2599, lng: 77.4126, state: 'Madhya Pradesh' },
  { id: 'IDR', name: 'Indore',      lat: 22.7196, lng: 75.8577, state: 'Madhya Pradesh' },
  { id: 'SUR', name: 'Surat',       lat: 21.1702, lng: 72.8311, state: 'Gujarat' },
  { id: 'RAI', name: 'Raipur',      lat: 21.2514, lng: 81.6296, state: 'Chhattisgarh' },
  { id: 'RAN', name: 'Ranchi',      lat: 23.3441, lng: 85.3096, state: 'Jharkhand' },
  { id: 'GUW', name: 'Guwahati',    lat: 26.1445, lng: 91.7362, state: 'Assam' },
  { id: 'CCU', name: 'Coimbatore',  lat: 11.0168, lng: 76.9558, state: 'Tamil Nadu' },
  { id: 'VGA', name: 'Vijayawada',  lat: 16.5062, lng: 80.6480, state: 'Andhra Pradesh' },
  { id: 'MDU', name: 'Madurai',     lat: 9.9252,  lng: 78.1198, state: 'Tamil Nadu' },
  { id: 'DGR', name: 'Dehradun',    lat: 30.3165, lng: 78.0322, state: 'Uttarakhand' },
  { id: 'AMR', name: 'Amritsar',    lat: 31.6340, lng: 74.8723, state: 'Punjab' },
  { id: 'VNS', name: 'Varanasi',    lat: 25.3176, lng: 82.9739, state: 'Uttar Pradesh' },
  { id: 'MYS', name: 'Mysore',      lat: 12.2958, lng: 76.6394, state: 'Karnataka' },
];

/**
 * Search cities by name prefix (case-insensitive).
 * Returns at most `limit` results.
 */
export function searchCities(query, limit = 10) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return DEFAULT_NODES
    .filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q))
    .slice(0, limit);
}

/**
 * Get a single city object by its name (exact, case-insensitive).
 */
export function getCityByName(name) {
  if (!name) return null;
  const n = name.toLowerCase();
  return DEFAULT_NODES.find(c => c.name.toLowerCase() === n) || null;
}

/**
 * Get a single city by its ID.
 */
export function getCityById(id) {
  if (!id) return null;
  return DEFAULT_NODES.find(c => c.id === id) || null;
}
