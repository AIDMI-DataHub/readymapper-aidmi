import * as turf from '@turf/turf'
import { settings } from '../../constants/settings'
import { helpers } from '../helpers'

export const healthcareFacilitiesLayer = {
  // This is California only healthcare data

  async loadData(store, loadLabel) {
    let slugs = settings.healthcareFacilityTypes.map(t => t.slug)
    for (const slug of slugs) {
      helpers.loadMapboxImage(store.state.map, new URL(`../assets/img/poi-icons/${slug}.png`, import.meta.url).href, slug, { pixelRatio: 2 })
      helpers.loadMapboxImage(store.state.map, new URL(`../assets/img/poi-icons/${slug}-Non-Reporting.png`, import.meta.url).href, `${slug}-Non-Reporting`, { pixelRatio: 2 })
    }
    helpers.loadMapboxImage(store.state.map, new URL(`../assets/img/poi-icons/Unknown.png`, import.meta.url).href, 'Unknown')

    const path = `${settings.baseUrlData}/current-california-healthcare-facility-listing.csv`
    // WARNING: this is a California specific dataset, more comprehensive than others
    // in terms of nursing facilities
    let healthcareFacilities = await helpers.fetchCsvAndBumpProgress(path, loadLabel, store, [])

    // Exclude certain facility types from the dataset
    let typesToExclude = settings.healthcareFacilitySubtypes.filter(t => t.exclude).map(t => t.subtype)
    healthcareFacilities = healthcareFacilities.filter(r => {
      return !typesToExclude.includes(r['License Type'])
    })

    healthcareFacilities = turf.featureCollection(
      healthcareFacilities.slice(1).map(row => {
        let point
        try {
          return turf.point([parseFloat(row.Longitude), parseFloat(row.Latitude)], row)
        } catch (e) {
          return null
        }
      })
      .filter(point => !!point)
    )

    healthcareFacilities.features.forEach(f => {
      let type = settings.healthcareFacilitySubtypes.find(t => t.subtype === f.properties['License Type'])?.general_type
      if (type) {
        f.properties.general_type = type
        f.properties.type = f.properties['License Type']
        f.properties.name = f.properties['Facility Name']
        f.properties.beds = f.properties['Number of Beds']
        f.properties.address = f.properties['Facility Address']
        f.properties.city = f.properties['Facility City']
        // set image field
        f.properties.image = type.replaceAll('/', ' ').replaceAll(/\s+/g, '-') + "-Non-Reporting"
        f.properties.image_sort_key = settings.healthcareFacilityTypes.find(d => d.slug === f.properties.image)?.sort_key
      } else {
        console.warn(`Missing category mapping for CA healthcare facility type ${f.properties['License Type']}. Marking as Unknown.`)
        f.properties.general_type = "Unknown"
        // fallback
        f.properties.image = "Unknown"
        f.properties.image_sort_key = 1000
      }
    })

    return healthcareFacilities

  },

  postProcess(data, store) {
    if (data?.features?.length) {
      store.commit('setData', { healthcareFacilities: data });
    }
  },

  addLayer(map, healthcareFacilities, store, beforeId) {

    if (!map.getSource('healthcare-facilities')) {
      map.addSource('healthcare-facilities', {
        'type': 'geojson',
        data: healthcareFacilities,
        cluster: true,
        // Max zoom to cluster points on. Should be one less than the zoom at which you want the clusters to disappear
        // when zooming in.
        clusterMaxZoom: 7,
        clusterRadius: 50 // Radius of each cluster when clustering points
      })
    }

    if (!map.getLayer('healthcare-facilities')) {
      map.addLayer({
        'id': 'healthcare-facilities',
        'type': 'symbol',
        'source': 'healthcare-facilities',
        'minzoom': 8,
        'layout': {
          'icon-allow-overlap': true,
          'icon-size': [
            "interpolate",
            ["linear"],
            ["zoom"],
            8, 0.7,
            10, 1
          ],
          'icon-anchor': 'center',
          'icon-image': ['get', 'image'],
          'symbol-sort-key': ['get', 'image_sort_key'],
        },
        'paint': {
          'icon-opacity': 1
        }
      }, beforeId)
    }

    if (!map.getLayer('healthcare-clusters')) {
      map.addLayer({
        'id': 'healthcare-clusters',
        'type': 'circle',
        'source': 'healthcare-facilities',
        'minzoom': 6,
        'maxzoom': 8,
        'filter': ['has', 'point_count'],
        'paint': {
          'circle-color': '#FCA923',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            10,
            5,
            15,
            10,
            20,
            20,
            40
          ],
          'circle-opacity': 0.7
        },
      }, beforeId);
    }

    if (!map.getLayer('healthcare-cluster-count')) {
      map.addLayer({
        'id': 'healthcare-cluster-count',
        'type': 'symbol',
        'source': 'healthcare-facilities',
        'minzoom': 6,
        'maxzoom': 8,
        'filter': ['has', 'point_count'],
        'paint': {
          'text-color': '#ffffff',
        },
        'layout': {
          'text-field': '{point_count_abbreviated}',
          'text-size': 14,
          'text-font': ['Arial Unicode MS Bold'],
          'text-allow-overlap': true
        }
      }, beforeId);
    }
  },

  updateLayer(map, store, layerConfig) {
    const currentTab = store.state.currentTab;
    // Includes healthcare-facilities-with-capacities from a sibling LayerConfig
    const layerIds = [
      ...(layerConfig?.mapLayerIds ?? ['healthcare-facilities', 'healthcare-clusters', 'healthcare-cluster-count']),
      'healthcare-facilities-with-capacities',
    ];

    if (currentTab === 'infrastructure' || currentTab === 'infrastructureReport') {
      helpers.showLayers(map, layerIds);
    } else {
      helpers.hideLayers(map, layerIds);
    }
  },

}
