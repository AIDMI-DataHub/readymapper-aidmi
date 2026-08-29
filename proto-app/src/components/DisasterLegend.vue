<template>
<div class="legend" :class="{ collapsed: headerCollapsed }">

  <div class="section" v-if="disasterType === 'fire'">
    <MapLegendFire />
  </div>

  <div class="section" v-if="disasterType === 'hurricane'">
    <MapLegendHurricane />
  </div>

  <div class="section" v-if="disasterType === 'cyclone'">
    <MapLegendHurricane />
  </div>

  <div class="section" v-if="disasterType === 'flood' && (currentTab === 'disaster' || currentTab === 'disasterReport')">
    <MapLegendFlood />
  </div>

  <div class="section" v-if="disasterType === 'heat'">
    <MapLegendHeat />
  </div>

  <div class="section" v-if="disasterType === 'flood' && currentTab === 'disaster' && selectedGaugeId">
    <div class="title-container">
      <div class="title">Gauge level</div>
      <button class="clear-button" @click="clearSelectedGaugeId()">
        <div class="subtitle"><span style="font-weight: bold;">Selected gauge:</span> {{ selectedFloodGauge.gauge_id }}</div>
        <img src="@/assets/img/x-black.svg">
      </button>  
    </div>    

    <FloodGaugeLineChart
      :gaugeId="selectedGaugeId"
      :height="80"
      :width="370"
      :numTicks="9"
    />
  </div>

  <div class="section" v-if="disasterType === 'flood' && currentTab === 'disaster' && !selectedGaugeId && floodGauges && floodGauges.some(g => g.isInteresting)">
    <div class="title-container">
      <div class="title">Average gauge severity ({{ floodGauges.filter(g => g.isInteresting).length }} gauges)
         <InfoTooltip tooltip-key="flood-gauge-severity-average" />
      </div>
    </div>
    
    <FloodGaugeSummaryChart
      :height="80"
      :width="370"
      :numTicks="9"
      :floodGauges="floodGauges.filter(g => g.isInteresting)"
    />
  </div>

  <div class="section" v-if="disasterType === 'fire' && currentTab === 'disaster'">
    <div class="title">Acres burned: <span style="font-weight: normal">{{ acresBurned }}</span></div>
    <AcresAffectedLineChart
      :data="this.acresBurnedTimeseries"
      :height="80"
      :width="370"
      :numTicks="12"
      :maxType="'global'"
    />
  </div>

  <div class="section" v-if="disasterType === 'hurricane' && currentTab === 'disaster'">
    <div class="title">Wind speeds: <span style="font-weight: normal">{{ windCategorySpeed }}</span></div>
    <HurricaneWindSpeedLineChart
      :data="this.hurricaneWindSpeedTimeseries"
      :height="80"
      :width="370"
      :maxType="'global'"
    />
  </div>

  <div class="section" v-if="disasterType === 'cyclone' && currentTab === 'disaster'">
    <div class="title">Wind speeds: <span style="font-weight: normal">{{ windCategorySpeed }}</span></div>
    <HurricaneWindSpeedLineChart
      :data="this.cycloneWindSpeedTimeseries"
      :height="80"
      :width="370"
      :maxType="'global'"
    />
  </div>

</div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'
import * as d3 from 'd3'
import dayjs from 'dayjs'

import { settings } from '../../constants/settings'

import AcresAffectedLineChart from './AcresAffectedLineChart.vue'
import HurricaneWindSpeedLineChart from './HurricaneWindSpeedLineChart.vue'
import FloodGaugeLineChart from './FloodGaugeLineChart.vue'
import FloodGaugeSummaryChart from './FloodGaugeSummaryChart.vue'
import MapLegendFire from './MapLegendFire.vue'
import MapLegendHurricane from './MapLegendHurricane.vue'
import MapLegendFlood from './MapLegendFlood.vue'
import MapLegendHeat from './MapLegendHeat.vue'
import InfoTooltip from './InfoTooltip.vue'

export default {
  name: 'DisasterLegend',

  components: {
    AcresAffectedLineChart,
    HurricaneWindSpeedLineChart,
    MapLegendFire,
    MapLegendHurricane,
    MapLegendFlood,
    MapLegendHeat,
    FloodGaugeLineChart,
    FloodGaugeSummaryChart,
    InfoTooltip
  },

  props: {
    disasterDateEnd: Date,
    disasterDateStart: Date,
  },

  data() {
    return {
      // acresBurned: false,
      vulnerabilityMetricSelected: settings.vulnerabilityMetrics.find(d => d.default === true).id,
    }
  },

  computed: {
    ...mapState([
      'isochronesData',
      'selectedDateTime',
      'map',
      'currentTab',
      'selectedPlaceGeoids',
      'vulnerabilityMetric',
      'headerCollapsed',
      'currentHurricanePosition',
      'selectedGaugeId',
      'floodGauges'
    ]),
    ...mapGetters([
      'isochronesColorScale',
      'focusedPlace',
      'disasterType',
      'acresBurnedTimeseries',
      'hurricaneWindSpeedTimeseries',
      'selectedFloodGauge'
    ]),
    d3() {
      return d3
    },
    dayjs() {
      return dayjs
    },
    vulnerabilityMetrics() {
      return settings.vulnerabilityMetrics
    },
    isochrones() {
      return this.isochronesData[this.focusedPlace?.properties?.GEOID]
    },
    isochronesRange() {
      if (!this.isochrones) return []

      return this.isochrones.features.map(f => f.properties['contour'])
        .sort((a, b) => d3.descending(a, b))
    },
    isochronesTicks() {
      if (!this.isochrones) return []

      return this.isochronesRange.map(d => `${d} min`)
    },

    acresBurned() {
      const date = dayjs(this.selectedDateTime).format("YYYYMMDD")
      const acres = this.acresBurnedTimeseries?.[date]
      return acres ? d3.format(",.0f")(acres) : "N/A"
    },

    windSpeed() {
      return this.currentHurricanePosition?.properties?.["maxWindMph"]
    },

    windSpeedFormatted() {
      return this.windSpeed ? `${d3.format(",.0f")(this.windSpeed)} mph` : "N/A"
    },

    windCategory() {
      return settings.getHurricaneCategory(this.windSpeed)
    },

    windDamage() {
      return this.windCategory?.damage || "N/A"
    },

    windCategorySpeed() {
      return this.windCategory?.windSpeed || "N/A"
    },

    flowsDirection: {
      get() {
        return this.$store.state.flowsDirection
      },
      set(value) {
        this.$store.commit('setFlowsDirection', value)
      }
    }

  },

  watch: {
    vulnerabilityMetricSelected(selected) {
      this.setVulnerabilityMetric(selected)
    },
  },

  methods: {
    ...mapMutations([
      'setVulnerabilityMetric',
      'clearSelectedGaugeId'
    ]),
    layerExists(layerId) {
      return this.map.getLayer(layerId)
    },
  }
}
</script>

<style lang="scss" scoped>
@use "../variables.scss";
.legend {
  padding: 0px 15px;
  padding-top: 10px;
  overflow: hidden;
  max-height: 100vh;
  transition: max-height 0.2s ease;

  &.collapsed {
    max-height: 0px;
  }
}

.isochrones-legend {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 1.5em;

  .isochrones-title {
    margin: 0 !important;
    padding-right: 10px;
  }

  .isochrones-legend-container {
    display: flex;
    flex-direction: row;
    align-items: center;

    margin-right: 10px;
    &:last-child {
      margin-right: 0px;
    }
  }
  .isochrones-labels {
    margin: 2px 0 2px 2px;
  }
  .isochrones-number {
    text-align: center;
    font-size: 12px;
  }
  .isochrones-bar {
    width: 20px;
    height: 13px;
    text-align: center;
  }
}

.section {
  // margin-bottom: 10px;

  .title {
    text-align: left;
    font-weight: bold;
    font-size: 14px;
    line-height: 17px;
    color: #000;
    margin: 1em 0 0.5em 0;
  }

  .title-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .clear-button {
    display: flex;
    gap: 5px;
    position: relative;
    top: 5px;
    color: black;
    font-weight: normal;;
  }

  .subtitle {
    font-size: 11px;
  }

  .data-source {
    margin: 0;
    font-size: 12px;
    color: variables.$grey;
    text-align: left;
    margin-top: 4px;
  }

  &.bottom-border {
    padding-bottom: 10px;
    border-bottom: 1px solid #D8D8D8;
  }
}

.colordots {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  height: 60px;
}

.color-category {
  display: flex;
  align-items: center;
  margin-right: 20px;
  margin-bottom: 4px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 20px;
  margin-right: 5px;
}

.dot-label {
  color: black;
  font-size: 12px;
}

.line-chart-placeholder {
  height: 110px;
  background: #efefef;
  display: flex;
  justify-content: center;
  align-items: center;
}

.line-chart-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;

  h4 {
    margin: 0 0 0.75em;
  }
}

.date-label {
  font-size: 12px;
  color: variables.$grey;
}

</style>
