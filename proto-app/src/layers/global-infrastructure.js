import * as turf from '@turf/turf'
import { settings } from '../../constants/settings'
import { helpers } from '../helpers'

// zoom < 4: nothing; 4-6: airports only; 6+: all types INCLUDING schools.
// (Schools were previously gated to zoom 10; now shown from zoom 6 for parity
// with hospitals/dams/hydropower so they appear for every non-US disaster.)
const BASE_ZOOM_FILTER = [
  'step',
  ['zoom'],
  false,
  4,
  ['==', ['get', 'image'], 'airport'],
  6,
  true,
]

export const globalInfrastructureLayer = {

  async loadData(store, loadLabel) {
    const disasterBaseUrlData = store.getters.disasterBaseUrlData
    const path = `${disasterBaseUrlData}/infrastructure/osm-infra.csv`
    let globalInfra = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, [])

    globalInfra = turf.featureCollection(globalInfra.map(row => {
      return turf.point([parseFloat(row.lng), parseFloat(row.lat)], row)
    }))

    // Filter out all features that fall outside of the disaster
    // country polygon
    globalInfra.features = globalInfra.features.filter(f => {
      return store.getters.pointInDisasterCountry(f)
    })
    
    globalInfra.features.forEach(f => {
      f.properties.image = f.properties.rm_type
    })

    await Promise.all([
      helpers.loadMapboxImage(map, new URL(`../assets/img/poi-icons/Airports.png`, import.meta.url).href, 'poi-airport'),
      helpers.loadMapboxImage(map, new URL(`../assets/img/poi-icons/Schools.png`, import.meta.url).href, 'poi-school'),
      helpers.loadMapboxImage(map, new URL(`../assets/img/poi-icons/global-infra-hospitals.png`, import.meta.url).href, 'poi-hospital'),
      helpers.loadMapboxImage(map, new URL(`../assets/img/poi-icons/Hydropower.png`, import.meta.url).href, 'poi-hydropower'),
      helpers.loadMapboxImage(map, new URL(`../assets/img/poi-icons/Dams.png`, import.meta.url).href, 'poi-dam'),
    ])

    return globalInfra
  },

  async addLayer(map, globalInfra, store, beforeId) {
    map.addSource('global-infra', {
      'type': 'geojson',
      data: globalInfra,
      // cluster: true,
      // clusterMaxZoom: 7, // Max zoom to cluster points on
      // clusterRadius: 50 // Radius of each cluster when clustering points
    })

    map.addLayer({
      'id': 'global-infra',
      'type': 'symbol',
      'source': 'global-infra',
      'minzoom': 4,
      'filter': BASE_ZOOM_FILTER,
      'layout': {
        'icon-allow-overlap': true,
        'icon-size': [
          "interpolate",
          ["linear"],
          ["zoom"],
          4, 0.7,
          8, 1
        ],
        'icon-anchor': 'center',
        'icon-image': ['concat', 'poi-', ['get', 'image']],
        // 'visibility': 'none',
      },
      'paint': {
        'icon-opacity': 1
      }
    }, beforeId);
  },

  updateLayer(map, store, layerConfig) {
    const currentTab = store.state.currentTab;
    const layerIds = layerConfig?.mapLayerIds ?? ['global-infra'];

    // Keep the infrastructure-type filter in sync every time the layer updates.
    // NB: updaters are invoked as `layerConfig.updater(...)`, so `this` is the
    // layer CONFIG object, not this module — call the helper by name.
    globalInfrastructureLayer.applyTypeFilter(map, store.state.hiddenInfraTypes);

    if (currentTab === 'infrastructure' || currentTab === 'infrastructureReport') {
      helpers.showLayers(map, layerIds);
    } else {
      helpers.hideLayers(map, layerIds);
    }
  },

  // Sub-filter the POI symbols by type (school/airport/hospital/dam/hydropower).
  // hiddenTypes is a list of `rm_type` values to suppress; combined with the base
  // zoom filter so the two never clobber each other. Driven by the Custom tab, but
  // applied as a Mapbox setFilter so it also persists on the Infrastructure tab.
  applyTypeFilter(map, hiddenTypes = []) {
    if (!map?.getLayer('global-infra')) return
    const filter = hiddenTypes.length
      ? ['all', BASE_ZOOM_FILTER, ['!', ['in', ['get', 'image'], ['literal', hiddenTypes]]]]
      : BASE_ZOOM_FILTER
    map.setFilter('global-infra', filter)
  },

}
