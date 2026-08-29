<template>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import { layers, getLayerIds } from '@/layers/index.ts'
import { globalInfrastructureLayer } from '@/layers/global-infrastructure.js'
import { helpers } from '@/helpers'

// Tabs where every active layer is shown at once (user then hides individually),
// rather than the per-tab gating each layer's updater applies.
const SHOW_ALL_TABS = ['settings', 'custom']

export default {
  name: 'MapLayerController',

  computed: {
    ...mapState([
      'map',
      'activeLayerIds',
      'hiddenMapLayerIds',
      'hiddenInfraTypes',
      'buildingDamageSource',
      'buildingDamageMode',
      'floodExtentSource',
      'bridgeDamageSource',
      'roadDamageSource',
      'mobilityMode',
      'currentTab',
      'regionTypeSelection',
      'selectedDateTime',
      'vulnerabilityMetric',
      'sateliteBasemap',
      'hoveredCountyId',
      'hoveredPlaceId',
      'selectedCountyFips',
      'selectedPlaceGeoids',
      'selectedGaugeId',
      'newsTable',
    ]),
    ...mapGetters([
      'dataLoaded',
    ]),
  },

  watch: {
    mobilityMode() {
      this.callLayerUpdaters('mobilityMode')
    },

    newsTable() {
      this.callLayerUpdaters('newsTable')
    },

    currentTab() {
      // On a tab change reconcile EVERY active layer, not just the currentTab-dep
      // ones: a partial pass leaves layers whose updater didn't run showing the
      // previous tab's state. Deterministic and synchronous.
      this.reconcileAllLayers()
      // Re-assert once the map settles: on the first switch a layer may not be
      // render-ready on the synchronous pass (e.g. the choropleth fill not
      // appearing on the first People click until you bounce off another tab).
      // reconcileAllLayers is idempotent, so this only fixes the race.
      if (this.map) {
        this.map.once('idle', () => this.reconcileAllLayers())
      }
    },

    regionTypeSelection() {
      this.callLayerUpdaters('regionTypeSelection')
    },

    selectedDateTime() {
      this.callLayerUpdaters('selectedDateTime')
    },

    vulnerabilityMetric() {
      this.callLayerUpdaters('vulnerabilityMetric')
    },

    selectedGaugeId() {
      this.callLayerUpdaters('selectedGaugeId')
    },

    hiddenMapLayerIds(newHidden, oldHidden) {
      // Explicitly show layers that were just un-hidden; updaters below will re-hide
      // anything the app logic says shouldn't be visible for the current state
      const newlyShown = (oldHidden || []).filter(id => !newHidden.includes(id))
      if (newlyShown.length > 0) {
        helpers.showLayers(this.map, newlyShown)
      }
      // Reconcile every active layer so a visibility toggle re-asserts the full
      // correct state (and show-alls on settings/custom).
      this.reconcileAllLayers()
    },

    hiddenInfraTypes() {
      // Re-apply the POI type sub-filter whenever the Custom tab toggles a type.
      globalInfrastructureLayer.applyTypeFilter(this.map, this.hiddenInfraTypes)
    },

    buildingDamageSource() {
      this.callLayerUpdaters('buildingDamageSource')
    },

    buildingDamageMode() {
      this.callLayerUpdaters('buildingDamageMode')
    },

    floodExtentSource() {
      this.callLayerUpdaters('floodExtentSource')
    },

    bridgeDamageSource() {
      this.callLayerUpdaters('bridgeDamageSource')
    },

    roadDamageSource() {
      this.callLayerUpdaters('roadDamageSource')
    },

    // Triggers first render when all data is available
    dataLoaded() {
      if (!this.dataLoaded) return;
      this.callLayerUpdaters('selectedDateTime')
      this.callLayerUpdaters('regionTypeSelection')
      this.callLayerUpdaters('currentTab')
    },

    sateliteBasemap() {
      if (!this.layerExists('satellite-map')) {
        this?.map.addSource("mapbox-satellite", {
          "type": "raster",
          "url": "mapbox://mapbox.satellite",
          "tileSize": 256
        })
        this?.map.addLayer({
          "type": "raster",
          "id": 'satellite-map',
          "source": "mapbox-satellite",
          "opacity": 1
        }, 'hillshade')
      } else {
        this.map?.setPaintProperty('satellite-map', 'raster-opacity', this.sateliteBasemap ? 1 : 0)
      }
    },

    hoveredCountyId(newCountyId, oldCountyId) {
      if (oldCountyId) {
        this.map?.setFeatureState({ id: oldCountyId, source: 'counties' }, { hovered: false })
      }
      if (newCountyId) {
        this.map?.setFeatureState({ id: newCountyId, source: 'counties' }, { hovered: true })
      }
    },

    hoveredPlaceId(newPlaceId, oldPlaceId) {
      if (oldPlaceId) {
        this.map?.setFeatureState({ id: oldPlaceId, source: 'acs-places' }, { hovered: false })
      }
      if (newPlaceId) {
        this.map?.setFeatureState({ id: newPlaceId, source: 'acs-places' }, { hovered: true })
      }
    },

    // TODO: Refactor focused place / county so they are computed
    // from a single index into the current selection
    selectedCountyFips() {
      if (this.selectedCountyFips.length === 0) {
        this.$store.commit('clearFocusedCounty')
      }
    },

    selectedPlaceGeoids() {
      if (this.selectedPlaceGeoids.length === 0) {
        this.$store.commit('clearFocusedPlace')
      }
    }
  },

  methods: {
    callLayerUpdaters(dependency) {
      layers.filter(l => this.activeLayerIds.includes(l.id))
        .filter(l => l.updater && l.updaterDependencies?.includes(dependency))
        .forEach(l => {
          // Isolate each updater: a throw in one must not abort the pass and skip
          // applyHiddenLayers below (that would silently break "hide all").
          try {
            l.updater(this.map, this.$store, l)
          } catch (e) {
            console.error(`Layer updater for "${l.id}" failed (dep: ${dependency})`, e)
          }
        });
      // On the show-all tabs (settings, custom) every layer stays visible regardless
      // of its per-tab gate, so any dependency change (timeline scrub, mobility mode,
      // region type…) must re-show all active layers — otherwise a scrub would let a
      // people/infra updater re-hide itself. showAllActiveLayers ends with
      // applyHiddenLayers, so user-hidden layers still stay hidden.
      if (SHOW_ALL_TABS.includes(this.currentTab)) {
        this.showAllActiveLayers();
      } else {
        this.applyHiddenLayers();
      }
    },

    // Run EVERY active layer's updater once (not just those matching one
    // dependency), then reconcile visibility. Used on tab change and on
    // hidden-layer toggles so no layer is left showing a stale tab's state.
    reconcileAllLayers() {
      layers
        .filter(l => this.activeLayerIds.includes(l.id) && l.updater)
        .forEach(l => {
          try {
            l.updater(this.map, this.$store, l)
          } catch (e) {
            console.error(`Layer updater for "${l.id}" failed (reconcile)`, e)
          }
        })
      if (SHOW_ALL_TABS.includes(this.currentTab)) {
        this.showAllActiveLayers()
      } else {
        this.applyHiddenLayers()
      }
    },

    showAllActiveLayers() {
      layers
        .filter(l => this.activeLayerIds.includes(l.id))
        .forEach(l => helpers.showLayers(this.map, getLayerIds(l)))
      this.applyHiddenLayers()
    },

    applyHiddenLayers() {
      if (this.hiddenMapLayerIds.length > 0) {
        helpers.hideLayers(this.map, this.hiddenMapLayerIds);
      }
    },

    layerExists(layerId) {
      return this.map?.getLayer(layerId)
    },
  }
}
</script>


<style lang="scss" scoped>
</style>
