<template>
  <div>
    <HtmlTitle :title="this.selectedDisasterName ? `${this.siteTitle} - ${this.selectedDisasterName}` : this.siteTitle" />
    <div id='map' :class="navbarOpen ? 'map-navbar-open' : 'map-navbar-closed'" :style="[reportVisible ? {'visibility': 'hidden'} : '']"></div>
    <Navbar />
    <DisasterArchivePanel />
    <MapMenu />
    <Timeslider />

    <Tooltip :tooltipHTML="tooltipHTMLHurricane ? tooltipHTMLHurricane : tooltipHTML" />

    <MobilityFlowsCanvas />
    <HurricaneForecastCanvas v-if="disasterType === 'hurricane'" />
    <MapLayerController />
    <IsochronesLayerController v-if="layerEnabled('isochrones')" />

    <LoadingBarsButton />
    <GenerateReportButton />
    <GenerateReportModal />
    <PickMapViewScreen />

    <AboutModal />

    <Report v-if="reportVisible" />

    <div class="loading" v-if="reportLoading">
      <LoadingSpinner message="Generating report" />
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'
import dayjs from 'dayjs'
import mapboxgl from 'mapbox-gl';

import { settings } from '../../constants/settings'

import { generateReportMaps } from '../components/utils/generateReportMaps'

import { loadMapData } from './utils/mapData.ts'
import { enableMapInteraction } from './utils/mapInteraction'
import { orderReportSectionsFromQuery } from './utils/queryString'

import MapLayerController from '../components/MapLayerController.vue'
import Tooltip from '../components/Tooltip.vue'
import GenerateReportModal from '../components/GenerateReportModal.vue'
import GenerateReportButton from '../components/GenerateReportButton.vue'
import PickMapViewScreen from '../components/PickMapViewScreen.vue'
import AboutModal from '../components/AboutModal.vue'
import MobilityFlowsCanvas from '../components/MobilityFlowsCanvas.vue'
import HurricaneForecastCanvas from '../components/HurricaneForecastCanvas.vue'
import IsochronesLayerController from '../components/IsochronesLayerController.vue'
import MapMenu from '../components/MapMenu.vue'
import Navbar from '../components/Navbar.vue'
import DisasterArchivePanel from '../components/DisasterArchivePanel.vue'
import Timeslider from '../components/Timeslider.vue'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import LoadingBarsButton from '../components/LoadingBarsButton.vue'
import Report from '../components/Report.vue'
import HtmlTitle from '../components/HtmlTitle.vue';

export default {
  name: 'Home',

  components: {
    MapMenu,
    Navbar,
    DisasterArchivePanel,
    Tooltip,
    MapLayerController,
    MobilityFlowsCanvas,
    HurricaneForecastCanvas,
    IsochronesLayerController,
    GenerateReportButton,
    GenerateReportModal,
    PickMapViewScreen,
    AboutModal,
    Timeslider,
    LoadingSpinner,
    LoadingBarsButton,
    Report,
    HtmlTitle,
  },

  data() {
    return {
      loading: true
    }
  },

  computed: {
    ...mapState([
      'selectedCountyFips',
      'selectedPlaceGeoids',
      'focusedCountyFips',
      'focusedPlaceGeoid',
      'currentTab',
      'currentLocation',
      'reportVisible',
      'reportLoading',
      'reportNotes',
      'disasterConfig',
      'navbarOpen',
      'tooltipHTML',
      'tooltipHTMLHurricane',
      'pickMapViewScreen',
    ]),
    ...mapGetters([
      'closestCities',
      'closestHealthcare',
      'selectedHealthcare',
      'selectedFBFlows',
      'disasterLng',
      'disasterLat',
      'disasterZoom',
      'disasterType',
      'selectedDisasterName',
      'siteTitle',
      'layerEnabled'
    ]),
  },

  watch: {
    selectedCountyFips(countyFips) {
      const map = this.$store.state.map
      if (map?.getLayer('counties-selected')) map.setFilter('counties-selected', ['in', 'rm_id', ...countyFips])
      if (map?.getLayer('counties-stroke-selected')) map.setFilter('counties-stroke-selected', ['in', 'rm_id', ...countyFips])
    },
    focusedCountyFips(countyFips) {
      const map = this.$store.state.map
      if (map?.getLayer('counties-stroke-focused')) map.setFilter('counties-stroke-focused', ['in', 'rm_id', countyFips])
    },
    selectedPlaceGeoids(placeGeoids) {
      const map = this.$store.state.map
      if (map?.getLayer('acs-places-selected')) map.setFilter('acs-places-selected', ['in', 'rm_id', ...placeGeoids])
      if (map?.getLayer('acs-places-stroke-selected')) map.setFilter('acs-places-stroke-selected', ['in', 'rm_id', ...placeGeoids])
    },
    focusedPlaceGeoid(placeGeoid) {
      const map = this.$store.state.map
      if (map?.getLayer('acs-places-stroke-focused')) map.setFilter('acs-places-stroke-focused', ['in', 'rm_id', placeGeoid])
    },
    reportVisible() {
      if (this.reportVisible) return null
      // trigger again when coming back from report view
      if (this.selectedCountyFips?.length) {
        this.$store.state.map?.setFilter('counties-selected', ['in', 'rm_id', ...this.selectedCountyFips])
      }
      if (this.selectedPlaceGeoids?.length) {
        this.$store.state.map?.setFilter('acs-places-selected', ['in', 'rm_id', ...this.selectedPlaceGeoids])
        this.$store.state.map?.setFilter('acs-places-stroke-selected', ['in', 'rm_id', ...this.selectedPlaceGeoids])
      }
    },
    async navbarOpen() {
      await new Promise(r => { setTimeout(r, 10); })
      this.$store.state.map?.resize()
    }
  },

  methods: {
    ...mapMutations([
      'setTab',
      'setReportMapViews',
    ]),
    toggleFlows() {
      this.$store.commit('toggleFlowsMode')
    },
  },

  mounted: async function() {
    const query = this.$route.query

    //
    // This is a hack to erase the "reportVisible" query param
    // if the user refreshes the report page before saving.
    // If we refactor the report so it auto-saves, or if vue router
    // implements history.state support, we could remove this.
    //
    if (query?.reportVisible && !query?.reportSaved) {
      let newQuery = Object.assign({}, this.$route.query)
      delete newQuery.reportVisible
      this.$router.replace({ query: newQuery })
    }

    //
    // A little custom routing so that the browser back
    // button closes the report screen.
    //
    this.$watch(() => this.$route.query, (toQuery) => {
      if (toQuery.reportVisible) {
        this.$store.commit("setReportVisible", true)
      } else {
        this.$store.commit("setReportVisible", false)
      }
    })

    this.$store.dispatch('getAboutData')
    await this.$store.dispatch('getDisasters')

    // get query string parameters
    if (query?.disasterId) {
      this.$store.commit('setDisaster', query.disasterId)
      this.$store.dispatch('loadDisasterMetadata')
    }
    if (query?.vulnerabilityMetric) { this.$store.commit('setVulnerabilityMetric', query.vulnerabilityMetric) }
    if (query?.date) { this.$store.commit('setSelectedDateTime', dayjs.utc(query.date, settings.timeFormatFBMobility).toDate()) }
    if (query?.sections) {
      const sections = orderReportSectionsFromQuery(query.sections)
      this.$store.commit("setReportSections", sections)
    }

    // // for debugging
    // window.$store = this.$store

    mapboxgl.accessToken = settings.mapboxAccessToken

    let mapLoadInterval = setInterval(() => this.$store.commit('bumpLoadProgress', { loadLabel: 'Map' }), 200)
    const map = window.map = new mapboxgl.Map({
      container: 'map',
      style: settings.mapboxStyleUrl,
      center: [query?.lng || this.disasterLng, query?.lat || this.disasterLat],
      zoom: query?.zoom || this.disasterZoom || 9,
      boxZoom: false,
      preserveDrawingBuffer: true,  // required for getting map canvas as image
      dragRotate: false
    })

    await new Promise((resolve) => map.on('load', () => resolve()))
    clearInterval(mapLoadInterval)
    this.$store.commit('bumpLoadProgress', { loadLabel: 'Map', complete: true })

    // When the map is in the store, it's ready to use
    this.$store.commit('setMap', map)

    await loadMapData(map, this.$store)
    enableMapInteraction(map, this.$store)

    // set selections after map has loaded, so they can be styled properly
    if (query?.regionTypeSelection && query?.ids) {
      const storeProp = query?.regionTypeSelection  === "places"
        ? "setSelectedPlaceGeoids"
        : "setSelectedCountyFips"
      this.$store.commit("setRegionTypeSelection", query.regionTypeSelection)
      this.$store.commit(storeProp, Array.isArray(query.ids) ? query.ids : [query.ids])
    }

    // restore flood-impact source selections + custom layer visibility so a saved
    // report's tables and captured maps match the selections it was made with.
    // Committed before generateReportMaps so the map captures reflect them.
    const asArray = (v) => (v == null ? [] : (Array.isArray(v) ? v : [v]))
    if (query?.buildingDamageSource) this.$store.commit('setBuildingDamageSource', query.buildingDamageSource)
    if (query?.buildingDamageMode) this.$store.commit('setBuildingDamageMode', query.buildingDamageMode)
    if (query?.floodExtentSource) this.$store.commit('setFloodExtentSource', query.floodExtentSource)
    if (query?.bridgeDamageSource) this.$store.commit('setBridgeDamageSource', query.bridgeDamageSource)
    if (query?.roadDamageSource) this.$store.commit('setRoadDamageSource', query.roadDamageSource)
    if (query?.hiddenMapLayerIds !== undefined) this.$store.commit('setHiddenMapLayerIds', asArray(query.hiddenMapLayerIds))
    if (query?.hiddenInfraTypes !== undefined) this.$store.commit('setHiddenInfraTypes', asArray(query.hiddenInfraTypes))

    // generate report
    if (query?.reportSaved) {
      const addReportNotes = (sectionId) => { this.reportNotes[sectionId] = query?.[`notes-${sectionId}`] }
      await generateReportMaps(this.$store.state.disasterConfig, this.$store.state.map, this.setTab, this.setReportMapViews)
      this.setTab('vulnerability')
      addReportNotes('disaster')
      addReportNotes('vulnerability')
      addReportNotes('movement')
      addReportNotes('infrastructure')
      this.$store.commit('setReportCreatedOn', query?.reportCreatedOn)
      this.$store.commit('setReportVisible', true)
    }

    this.loading = false
  }
}
</script>

<style lang="scss" scoped>
@use "../variables.scss";

#map {
  position: absolute;
  top: 0px;
  right: 0px;
  bottom: 0px;
}

.map-navbar-closed {
  left: 61px;
}

.map-navbar-open {
  left: variables.$nav-bar-width;
}

.loading {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  right: 0;
  background: white;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
  z-index: 20;
}
</style>
