import * as turf from '@turf/turf'
import { helpers } from '../../helpers'

// ============================================================================
// News Sources — the "information gap" DATA layer (2026 Nepal floods).
//
// This used to paint silence.min.geojson as a diagonal hatch across every palika,
// but that blanketed the whole map in noise and buried the fact markers, so the
// on-map visualisation was removed. The palika/district/province polygons are still
// loaded here for two things:
//   1. the shared anchor-outline highlight — on chip hover we draw the BOUNDARY of
//      the anchoring polygon (never a fill; a shaded district would read as "this
//      whole area has this value", which the source never said);
//   2. the report's information-gap table — the worst-hit palikas that went dark
//      (coverage_state = NO DATA), which is the assessment-targeting output. Coverage
//      here runs OPPOSITE to need, so "no record" is "no one reported", not "no damage".
// No fill, no "?" glyphs, nothing user-toggleable on the map (mapLayerIds is empty).
// ============================================================================

const OUTLINE_SRC = 'news-anchor-outline'
let ANCHOR_POLYS = new Map() // rm_id -> Feature (Polygon/MultiPolygon)

function csvBasename() { return 'audit.json' }

export const newsSilenceLayer = {

  async loadData(store, loadLabel) {
    ANCHOR_POLYS = new Map()
    const base = `${store.getters.disasterBaseUrlData}/news`
    const empty = turf.featureCollection([])
    const silence = await helpers.fetchJsonAndBumpProgress(`${base}/silence.min.geojson`, loadLabel, store, empty)
    if (!silence?.features?.length) return null
    const districts = await helpers.fetchJsonAndBumpProgress(`${base}/admin-districts.geojson`, loadLabel, store, empty)
    const provinces = await helpers.fetchJsonAndBumpProgress(`${base}/admin-provinces.min.geojson`, loadLabel, store, empty)
    const audit = await helpers.fetchJsonAndBumpProgress(`${base}/${csvBasename()}`, loadLabel, store, null)

    // rm_id -> polygon, across all three admin levels (same id space as the facts' geo_anchor_id)
    for (const fc of [silence, districts, provinces]) {
      for (const f of (fc.features || [])) {
        const id = f.properties?.rm_id
        if (id && !ANCHOR_POLYS.has(id)) ANCHOR_POLYS.set(id, f)
      }
    }

    // ---- report payloads (properties-only; never freeze polygon geometry to Vuex) ----
    const props = silence.features.map(f => f.properties || {})
    const counts = { reported: 0, mentioned: 0, no_data: 0 }
    for (const p of props) {
      if (p.coverage_state === 'reported') counts.reported++
      else if (p.coverage_state === 'NO DATA') counts.no_data++
      else counts.mentioned++
    }
    const gapList = props
      .filter(p => p.coverage_state === 'NO DATA' && Number(p.information_gap_score) > 0)
      .sort((a, b) => Number(b.information_gap_score) - Number(a.information_gap_score))
      .slice(0, 15)
      .map(p => ({
        rm_name: p.rm_name, district: p.district,
        population: p.census_population_2021 != null ? Number(p.census_population_2021) : null,
        score: Number(p.information_gap_score),
      }))

    store.commit('setData', {
      newsSilenceList: gapList,
      newsCoverageCounts: counts,
      newsUnplaced: audit?.unplaced || null,
      newsMultiDistrict: audit?.multi_district || null,
      newsNationalCount: audit?.national_count || null,
    })

    // polygons live in the module-level ANCHOR_POLYS lookup; don't freeze 1.9MB into Vuex
    return null
  },

  addLayer(map, data, store, beforeId) {
    // shared anchor-outline highlight (boundary only, never a fill) — filled by hover
    if (!map.getSource(OUTLINE_SRC)) {
      map.addSource(OUTLINE_SRC, { type: 'geojson', data: turf.featureCollection([]) })
      map.addLayer({
        id: OUTLINE_SRC, type: 'line', source: OUTLINE_SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#111', 'line-width': 2.2, 'line-dasharray': [2, 1.2], 'line-opacity': 0.85 },
      }, beforeId)
    }
    newsSilenceLayer.updateLayer(map, store)
  },

  updateLayer(map, store) {
    // clear any stale highlight when leaving the News tab
    if (store.state.currentTab !== 'news' && map.getSource(OUTLINE_SRC)) {
      map.getSource(OUTLINE_SRC).setData(turf.featureCollection([]))
    }
  },

  // called from mapInteraction on chip hover/select; anchorId may be ";"-joined
  setHighlight(map, anchorId) {
    const src = map.getSource(OUTLINE_SRC)
    if (!src) return
    if (!anchorId) { src.setData(turf.featureCollection([])); return }
    const ids = String(anchorId).split(';').map(s => s.trim()).filter(Boolean)
    const feats = ids.map(id => ANCHOR_POLYS.get(id)).filter(Boolean)
    src.setData(turf.featureCollection(feats))
  },
}
