// Canonical colour vocabularies for the News Sources tab — 2026 Nepal floods.
//
// Colour encodes SUBSTANTIVE STATUS only, one vocabulary per table. Every palette
// is chosen to sit VISIBLY APART from the satellite building-damage ramp
// (red = destroyed … green = intact): passability is not damage, and sharing that
// ramp would invite a false cross-layer comparison. In particular a blocked road is
// PURPLE here, never red. A group of facts with more than one status renders GREY
// (see MIXED_COLOR) — "most severe" would be an editorial invention the source never made.
//
// Shared by the layer factory (map paint) and NewsSourcesPanel (legend swatches) so
// the two can never drift apart.

export const MIXED_COLOR = '#9aa0a6'   // neutral grey: a chip whose facts disagree on status
export const UNKNOWN_COLOR = '#8a8f98' // status value not in the vocabulary

// table -> the property that carries its substantive status
export const STATUS_FIELD = {
  people_aggregate: 'metric',
  infrastructure: 'status',
  access: 'passability',
  shelter_sites: 'site_function',
  aid_delivery: 'commodity',
  hazard_watch: 'hazard',
  damage_extent: 'metric',
}

// table -> { statusValue: hex }
export const PALETTES = {
  infrastructure: {
    destroyed: '#6a1b9a', damaged: '#9c27b0', non_functional: '#5c6bc0',
    partial: '#26a69a', functional: '#78909c', restoring: '#00897b',
  },
  access: {
    blocked: '#7b1fa2', partial: '#f57c00', heli_only: '#1e88e5',
    foot_only: '#00acc1', open: '#2e7d32', unknown: '#9e9e9e',
  },
  people_aggregate: {
    dead: '#37474f', missing: '#6a1b9a', unaccounted: '#9c27b0',
    rescued: '#00897b', stranded: '#f57c00', injured: '#d81b60',
    found_alive: '#43a047', displaced: '#1e88e5', affected: '#5c6bc0',
  },
  shelter_sites: {
    displacement_shelter: '#1e88e5', medical_treatment: '#d81b60',
  },
  aid_delivery: {
    cash: '#2e7d32', food: '#f9a825', medical: '#d81b60', rescue: '#1e88e5',
    fuel: '#6d4c41', water: '#00acc1', shelter_NFI: '#9c27b0',
    transport: '#5c6bc0', other: '#9e9e9e',
  },
  hazard_watch: {
    further_flooding: '#1565c0', barrier_lake: '#0097a7', landslide_dam: '#6d4c41',
    landslide: '#8d6e63', disease_outbreak: '#ad1457',
  },
  damage_extent: {
    buildings_destroyed: '#6a1b9a', buildings_damaged: '#9c27b0',
    households_affected: '#5c6bc0', land_lost: '#00695c',
  },
}

export function statusColor(table, value) {
  const pal = PALETTES[table] || {}
  return pal[value] || UNKNOWN_COLOR
}

// 'non_functional' -> 'Non-functional', 'shelter_NFI' -> 'Shelter / NFI'
export function prettyStatus(value) {
  if (!value) return 'Unknown'
  if (value === 'shelter_NFI') return 'Shelter / NFI'
  const s = String(value).replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// human label for the radio / tab / report
export const TABLE_LABELS = {
  people_aggregate: 'People',
  infrastructure: 'Infrastructure',
  access: 'Access & roads',
  shelter_sites: 'Shelters & care',
  aid_delivery: 'Aid delivery',
  hazard_watch: 'Hazard watch',
  damage_extent: 'Damage extent',
}

// filename stem per table (facts-<file>.geojson)
export const TABLE_FILE = {
  people_aggregate: 'people-aggregate',
  infrastructure: 'infrastructure',
  access: 'access',
  shelter_sites: 'shelter-sites',
  aid_delivery: 'aid-delivery',
  hazard_watch: 'hazard-watch',
  damage_extent: 'damage-extent',
}

export const NEWS_TABLES = [
  'people_aggregate', 'infrastructure', 'access',
  'shelter_sites', 'aid_delivery', 'hazard_watch', 'damage_extent',
]

export const NEWS_BANNER =
  'Compiled from news media. Use to prioritise assessment and cross-check field ' +
  'reports — never as the sole basis for allocating relief.'
