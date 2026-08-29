<template>
<div class="legend">
  <div class="section" v-if="currentTab === 'people'">
    <div class="title">Vulnerable populations
        <InfoTooltip tooltip-key="vulnerable-populations" />
      </div>
    <div class="subtitle">Percent of total population</div>
    <select class="custom-select" style="width: 100%;" v-model="vulnerabilityMetricSelected">
      <option v-for="item in vulnerabilityMetrics" :value="item.id" :key="item.id">
        {{ item.name }}
      </option>
    </select>

    <VulnerabilityLegend />
  </div>

  <div class="section" v-if="currentTab === 'infrastructure'">
    <PointsOfInterestLegend />
  </div>

  <div class="section" v-if="currentTab === 'infrastructure' && (layerSuccess('cityPowerOutagesTimeseries') || layerSuccess('countyPowerOutagesTimeseries'))">
    <div class="title">Power Outages</div>
    <div class="legend-item">
      <img class="legend-image" src="@/assets/img/power-outage.png">
      <div> > 15% pop. without power</div>
    </div>
  </div>

  <div class="section" v-if="currentTab === 'infrastructure' && layerSuccess('networkCoverage')">
    <div class="title">Network outages</div>
    <div class="legend-item">
      <span style="display:inline-block;width:14px;height:14px;background:rgb(15,47,128);opacity:0.6;margin-right:8px;border-radius:2px;flex-shrink:0;"></span>
      <div>Tiles that lost mobile coverage</div>
    </div>
  </div>

  <!-- Travel Time Isochrones Legend -->
  <div class="section" v-if="layerEnabled('isochrones') && currentTab === 'infrastructure' && selectedPlaceGeoids.length > 0">
    <div class="isochrones-legend">
      <div class="title isochrones-title">Driving Times</div>
      <div class="isochrones-legend-container">
        <div v-for="(x, i) in isochronesRange" :key="x" class="isochrones-bar" :style="{ background: isochronesColorScale(x) }">
          <div class="isochrones-labels">{{isochronesTicks[i]}}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section" v-if="currentTab === 'people' && movementDataExists">
    <div class="title">Movement
      <InfoTooltip tooltip-key="movement" />
    </div>
    <!-- Pop Density Legend -->
    <select class="custom-select" style="width: 100%;" v-model="movementDataSelected">
      <option v-for="item in movementDataSources" :value="item.id" :key="item.id">
        {{ item.name }} ({{ item.source }})
      </option>
    </select>
    <!-- <div class="title">Pop. density change <span class="data-source">Facebook Mobility Data</span></div> -->
    <PopDensityLegend />

    <div class="title">Movement trends</div>
    <div style="display: flex; align-items: center">
      <div>
        <div style="display: flex; justify-content: space-between; width: 182px;">
          <span style="font-size: 12px;">Origin</span>
          <img src="@/assets/img/mobility-arrow-legend.svg">
          <span style="font-size: 12px;">Destination</span>
        </div>
      </div>

      <div style="display: flex; justify-content: space-around; font-size: 12px; margin-left: auto">
        <div class="radio-and-label" style="padding-right: 8px">
          <input type="radio" id="movement-to" name="movement-trend-mode" value="to" v-model="flowsDirection" />
          <label for="movement-to">To</label>
        </div>
        <div class="radio-and-label">
          <input type="radio" id="movement-from" name="movement-trend-mode" value="from" v-model="flowsDirection" />
          <label for="movement-from">From</label>
        </div>
        <div class="radio-and-label" style="padding-left: 20px">
          <input type="radio" id="movement-off" name="movement-trend-mode" value="off" v-model="flowsDirection" />
          <label for="movement-off">Off</label>
        </div>
      </div>
    </div>
  </div>

  <div class="section" v-if="currentTab === 'people' && !movementDataExists">
    <div class="title">Movement</div>
    <p style="font-size: 12px">No data</p>
  </div>

</div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'
import * as d3 from 'd3'
import dayjs from 'dayjs'

import { settings } from '../../constants/settings'

import InfoTooltip from './InfoTooltip.vue'
import LineChart from './LineChart.vue'
import PopDensityLegend from './PopDensityLegend.vue'
import VulnerabilityLegend from './VulnerabilityLegend.vue'
import PointsOfInterestLegend from './PointsOfInterestLegend.vue'
import { useLayerError } from '@/composables/useLayerError'

export default {
  name: 'Legend',

  components: {
    PopDensityLegend,
    VulnerabilityLegend,
    PointsOfInterestLegend,
    InfoTooltip
  },

  setup() {
    const { layerSuccess } = useLayerError()
    return { layerSuccess }
  },

  props: {
    disasterDateEnd: Date,
    disasterDateStart: Date,
  },

  data() {
    return {
      acresBurned: false,
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
      'mobilityMode'
    ]),
    ...mapGetters([
      'currentFirePerimeter',
      'isochronesColorScale',
      'focusedPlace',
      'disasterCensusVintage',
      'layerEnabled',
      'layerLoadSuccess',
      'vulnerabilityMetrics',
    ]),
    d3() {
      return d3
    },
    dayjs() {
      return dayjs
    },
    movementDataExists() {
      return (
        this.layerLoadSuccess('fbPopDensity') ||
        this.layerLoadSuccess('fbMobility') ||
        this.layerLoadSuccess('mapboxActivityData')
      )
    },
    movementDataSources() {
      return settings.movementDataSources.filter(s => this.layerLoadSuccess(s.layerId))
    },
    movementDataSelected: {
      get() {
        return this.mobilityMode
      },
      set(value) {
        this.setMobilityMode(value)
      }
    },
    isochrones() {
      return this.isochronesData[this.focusedPlace?.properties?.GEOID]
    },
    isochronesRange() {
      if (!this.isochrones) return []

      return this.isochrones.features.map(f => f.properties['contour'])
        .sort((a, b) => d3.ascending(a, b))
    },
    isochronesTicks() {
      if (!this.isochrones) return []

      return this.isochronesRange.map(d => `${d} min`)
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
    currentFirePerimeter(perimeter) {
      this.acresBurned = perimeter?.properties?.acres
    },
    vulnerabilityMetricSelected(selected) {
      this.setVulnerabilityMetric(selected)
    },
  },

  methods: {
    ...mapMutations([
      'setVulnerabilityMetric',
      'setMobilityMode',
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
}

.legend-item {
  display: flex;
}

.isochrones-legend {
  .isochrones-title {
    margin: 0 0 0.5em;
  }

  .isochrones-legend-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    :last-child {
      // color last one white
      .isochrones-labels {
        color: #fff !important;
      }
    }
  }
  .isochrones-labels {
    font-weight: bold;
    text-align: center;
    font-size: 12px;
    width: 100%;
  }
  .isochrones-bar {
    width: 100%;
    height: 17px;
    text-align: center;
    align-items: center;
    display: flex;
  }
}

.custom-select {
  display: flex;
  align-items: center;
  text-align: left;
  // font-weight: bold;
  font-size: 12px;
  line-height: 17px;
  color: #000;
  border: 1px solid variables.$light-grey;
  border-radius: 4px;
  height: 27px;
  background: transparent;
  padding: 0 0.5em;
  margin-top: 4px;
  margin-bottom: 4px;
}

.section {
  margin-bottom: 10px;

  .title {
    display: flex;
    align-items: center;
    text-align: left;
    font-weight: bold;
    font-size: 14px;
    line-height: 17px;
    color: #000;
    margin: 12px 0 6px 0;
  }

  .subtitle {
    font-size: 10px;
    color: #1e1e1e;
  }

  .data-source {
    margin-left: auto;
    font-size: 12px;
    color: variables.$grey;
    font-weight: 400;
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

.radio-and-label {
  display: flex;
  align-items: center;

  input[type="radio"] {
    margin: 0px 3px;
  }
}

.legend-item {
  display: flex;
  align-items: center;

  div {
    font-size: 13px;
  }
}

.legend-image {
  width: 25px;
}
</style>
