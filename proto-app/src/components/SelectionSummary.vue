<template>
  <div class="selection-summary-container" v-if="selectedCountyFips.length > 0 || selectedPlaceGeoids.length > 0">
    <div class="pagination-controls">
      <button class="circle-button empty" style="margin-left: 6px"
              @click="removeLocation()">
        <img src="@/assets/img/x.svg">
      </button>
      <h4 style="margin-left: 6px">{{currentLocationName}}</h4>
      <button class="circle-button solid" style="margin-right: 6px;" v-if="selectedLocations.length > 1"
              @click="previousLocation()">
        <img src="@/assets/img/left-caret.svg">
      </button>
      <button class="circle-button solid" style="margin-right: 6px;" v-if="selectedLocations.length > 1"
              @click="nextLocation()">
        <img src="@/assets/img/right-caret.svg">
      </button>
    </div>

    <div class="overflow-section">
      <!-- Demographics Summary Table -->
      <SummaryTable
        v-if="(currentTab === 'disaster' || currentTab === 'people') && selectedLocations.length"
        :title="'Demographics'"
        :columnNames="demographicsTableColumns"
        :rows="demographicsTableRows"
      />

      <!-- Healthcare Summary Table -->
      <SummaryTable
        v-if="currentTab === 'infrastructure' && selectedLocations.length && layerEnabled('healthcareFacilities')"
        :title="'Healthcare Facilities'"
        :columnNames="healthcareTableColumns"
        :rows="healthcareTableRows"
      />

      <!-- Global Infra Summary Table -->
      <SummaryTable
        v-if="currentTab === 'infrastructure' && selectedLocations.length && layerEnabled('globalInfra')"
        :title="'Infrastructure'"
        :columnNames="globalInfraTableColumns"
        :rows="globalInfraTableRows"
      />

      <!-- Pop. Density Timeseries -->
      <div class="section"
           v-if="selectedLocations.length && currentTab === 'people' && currentLocationPopDensityTimeseries">
        <div class="title">{{ movementDataSelected?.name}} </div>
        <PopDensityLineChart
          :data="currentLocationPopDensityTimeseries.data"
          :height="80"
          :width="370"
          :numTicks="10"
        />
      </div>

      <!-- Movement Trends Timeseries -->
      <div class="section"
           v-if="selectedLocations.length && currentTab === 'people' && currentPopFlowsTimeseriesTo">
        <div class="title">Movement trends</div>
        <div class="subtitle">To {{currentLocationName}}</div>
        <PointChart
          :data="currentPopFlowsTimeseriesTo.data"
          :height="50"
          :width="370"
          :xPadding="10"
          :yPadding="10"
          :dateFormat="'YYYY-MM-DD HH:mm:ss'"
          :numTicks="10"
          :color="'none'"
          :pointColor="() => 'rgb(15, 47, 128, 0.5)'"
          :yMin="-75"
          :yMax="75"
          :displayZeroLine="true"
          :customMinDate="this.disasterDateStart"
          :customMaxDate="this.disasterDateEnd"
          :onDateChange="(dayjsDate) => {
            this.$store.commit('setSelectedDateTime', dayjsDate.toDate())
            this.$store.commit('setFlowsDirection', 'to')
          }"
        />

        <div class="subtitle">From {{currentLocationName}}</div>
        <PointChart
          :data="currentPopFlowsTimeseriesFrom.data"
          :height="50"
          :width="370"
          :xPadding="10"
          :yPadding="10"
          :dateFormat="'YYYY-MM-DD HH:mm:ss'"
          :numTicks="10"
          :color="'none'"
          :pointColor="() => 'rgb(15, 47, 128, 0.5)'"
          :yMin="-75"
          :yMax="75"
          :displayZeroLine="true"
          :customMinDate="this.disasterDateStart"
          :customMaxDate="this.disasterDateEnd"
          :onDateChange="(dayjsDate) => {
            this.$store.commit('setSelectedDateTime', dayjsDate.toDate())
            this.$store.commit('setFlowsDirection', 'from')
          }"
        />
      </div>

      <!-- Power Outages Timeseries -->
      <div class="section" v-if="selectedLocations.length && currentTab === 'infrastructure' && currentPowerOutageTimeseriesData">
        <div class="title">Power outages</div>
        <PowerOutageLineChart
          :data="currentPowerOutageTimeseriesData"
          :height="80"
          :width="370"
          :numTicks="10"
        />
      </div>
    </div>

  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'
import * as d3 from 'd3'

import PowerOutageLineChart from './PowerOutageLineChart.vue'
import PopDensityLineChart from './PopDensityLineChart.vue'
import PointChart from './PointChart.vue'
import SummaryTable from './SummaryTable.vue'

import { settings } from '../../constants/settings'

export default {
  name: 'SelectionSummary',

  components: {
    PointChart,
    SummaryTable,
    PopDensityLineChart,
    PowerOutageLineChart,
  },

  props: {
  },

  data() {
    return {
      selectedTimeseriesIndexCounties: 0,
      selectedTimeseriesIndexPlaces: 0,
      currentLocationIndex: 0,
    }
  },

  computed: {
    ...mapState([
      'selectedCountyFips',
      'selectedPlaceGeoids',
      'focusedCountyFips',
      'focusedPlaceGeoid',
      'dmeUsers',
      'counties',
      'acsPlaces',
      'healthcareFacilities',
      'currentTab',
      'regionTypeSelection',
      'isochrones',
      'vulnerabilityMetric',
      'reportVisible',
      'selectedLocations',
    ]),
    ...mapGetters([
      'disasterDateStart',
      'disasterDateEnd',
      // 'closestCities',
      // 'closestHealthcare',
      'selectedHealthcare',
      'selectedGlobalInfra',
      'sumFeatures',
      'selectedPlaces',
      'focusedPlace',
      'selectedPopDensityTimeseriesPlaces',
      'selectedCounties',
      'focusedCounty',
      'selectedPopDensityTimeseriesCounties',
      'selectedPowerOutagesTimeseriesRegions',
      'selectedFBPopFlowsTimeseriesTo',
      'selectedFBPopFlowsTimeseriesFrom',
      'movementDataSelected',
      'numDMEUsers',
      'layerEnabled',
      'allInfraTypes'
    ]),
    d3() {
      return d3
    },
    countiesTotalSelectedPopulation() {
      return d3.sum(this.selectedCounties.map(f => f.properties['rm_total_population']))
    },
    countiesTotalSelectedPopVulnerable() {
      return d3.sum(this.selectedCounties.map(f => f.properties[this.vulnerabilityMetric?.idAbsolute]))
    },
    countiesTotalDMEUsers() {
      const usersPerCounty = this.selectedCounties.map(d => this.numDMEUsers(d))
      return d3.sum(usersPerCounty)
    },
    placesTotalSelectedPopulation() {
      return d3.sum(this.selectedPlaces.map(t => t.properties['rm_total_population']))
    },
    placesTotalSelectedPopVulnerable() {
      return d3.sum(this.selectedPlaces.map(t => t.properties[this.vulnerabilityMetric?.idAbsolute]))
    },
    locationsTotalSelectedPopulation() {
      return this.regionTypeSelection === "counties" ? this.countiesTotalSelectedPopulation : this.placesTotalSelectedPopulation
    },
    locationsTotalSelectedPopVulnerable() {
      return this.regionTypeSelection === "counties" ? this.countiesTotalSelectedPopVulnerable : this.placesTotalSelectedPopVulnerable
    },
    locationsSelectedPopulation() {
      return d3.format(',')(this.currentLocation?.properties?.["rm_total_population"])
    },
    locationsSelectedPopVulnerable() {
      return d3.format(',')(this.currentLocation?.properties?.[this.vulnerabilityMetric?.idAbsolute])
    },
    locationsTotalSelectedDMEUsers() {
      if (this.regionTypeSelection === "counties") { return this.countiesTotalDMEUsers }
      return "N/A"
    },
    locationsSelectedDMEUsers() {
      return this.numDMEUsers(this.currentLocation)
    },
    locationsSelectedDMEUsersPer100K() {
      if (this.regionTypeSelection === "counties") { return d3.format(".4f")(this.locationsSelectedDMEUsers / 100000) }
      return "N/A"
    },
    locationsTotalSelectedDMEUsersPer100K() {
      if (this.regionTypeSelection === "counties") { return d3.format(".4f")(this.locationsTotalSelectedDMEUsers / 100000) }
      return "N/A"
    },
    currentLocation() {
      return this.selectedLocations[this.currentLocationIndex]
    },
    currentLocationName() {
      return this.currentLocation?.properties?.['rm_name']
    },
    currentLocationPopDensityTimeseries() {
      const timeseries = this.regionTypeSelection === "counties" ? this.selectedPopDensityTimeseriesCounties : this.selectedPopDensityTimeseriesPlaces
      return timeseries?.find(d => d.polygon_name === this.currentLocationName)
    },
    currentPowerOutageTimeseriesData() {
      const regions = this.regionTypeSelection === "counties" ? this.selectedCounties : this.selectedPlaces
      return this.selectedPowerOutagesTimeseriesRegions(regions, this.regionTypeSelection)
        ?.find(d => d.polygon_name === this.currentLocationName)?.data
    },
    currentPopFlowsTimeseriesTo() {
      return this.selectedFBPopFlowsTimeseriesTo?.find(d => d.polygon_name === this.currentLocationName)
    },
    currentPopFlowsTimeseriesFrom() {
      return this.selectedFBPopFlowsTimeseriesFrom?.find(d => d.polygon_name === this.currentLocationName)
    },
    demographicsTableColumns() {
      return [this.currentLocationName, `${this.selectedLocations.length} selected`]
    },
    demographicsTableRows() {
      let rows = [
        {
          title: 'Total Population',
          values: [this.locationsSelectedPopulation, this.locationsTotalSelectedPopulation]
        },
        {
          title: this.vulnerabilityMetric?.nameAbsolute,
          values: [this.locationsSelectedPopVulnerable, this.locationsTotalSelectedPopVulnerable]
        },
        // {title: 'DME Users per 100k Pop.', values: [locationsSelectedDMEUsersPer100K, locationsTotalSelectedDMEUsersPer100K]},
      ]

      if (this.layerEnabled('dmeUsers')) {
        rows.push({
          title: 'DME Users',
          values: [this.locationsSelectedDMEUsers, this.locationsTotalSelectedDMEUsers]
        })
      }

      return rows
    },
    healthcareTableColumns() {
      return ['Total Facilities', 'Total Beds']
    },
    healthcareTableRows() {
      const facilities = this.selectedHealthcare([this.currentLocation])
      const valuesMap = d3.rollup(facilities, v => {
        return {
          facilities: v.length,
          beds: d3.sum(v, d => Number(d.properties['beds']))
        }
      }, d => d.properties['general_type'])

      return settings.healthcareFacilityTypes.map(type => {
        const values = valuesMap.get(type.general_type)
        return {
          title: type.general_type,
          values: [
            values?.facilities || 0,
            values?.beds || 0,
          ]
        }
      })
    },
    globalInfraTableColumns() {
      return ['Total Facilities']
    },
    globalInfraTableRows() {
      const facilities = this.selectedGlobalInfra([this.currentLocation])
      const valuesMap = d3.rollup(facilities, v => {
        return {
          facilities: v.length
        }
      }, d => d.properties['rm_type'])

      return this.allInfraTypes.map(type => {
        const values = valuesMap.get(type.type)
        return {
          title: type.label,
          values: [
            values?.facilities || 0
          ]
        }
      })
    }
  },

  watch: {
    selectedCountyFips() {
      if (this.regionTypeSelection === "counties") {
        this.setSelectedLocations(this.selectedCounties)
        this.currentLocationIndex = this.selectedCounties?.length - 1
      }
    },
    selectedPlaceGeoids() {
      if (this.regionTypeSelection === "places") {
        this.setSelectedLocations(this.selectedPlaces)
        this.currentLocationIndex = this.selectedPlaces?.length - 1
      }
    },
    reportVisible() {
      if (this.regionTypeSelection === "counties") {
        this.setSelectedLocations(this.selectedCounties)
        this.currentLocationIndex = this.selectedCounties?.length - 1
      } else if (this.regionTypeSelection === "places") {
        this.setSelectedLocations(this.selectedPlaces)
        this.currentLocationIndex = this.selectedPlaces?.length - 1
      }
    },
    currentLocation() {
      this.$store.commit('setCurrentLocation', this.currentLocation)
      if (!this.currentLocation) return
      if (this.regionTypeSelection === "places") {
        this.focusPlace(this.currentLocation.properties['rm_id'])
      } else {
        this.focusCounty(this.currentLocation.properties['rm_id'])
      }
    },
  },

  methods: {
    ...mapMutations([
      'setSelectedLocations',
      'focusPlace',
      'focusCounty'
    ]),
    nextLocation() {
      this.currentLocationIndex = (this.currentLocationIndex + 1) % this.selectedLocations?.length
    },
    previousLocation() {
      this.currentLocationIndex = this.currentLocationIndex === 0 ? this.selectedLocations?.length - 1 : this.currentLocationIndex - 1
    },
    removeLocation() {
      if (this.regionTypeSelection === "counties") {
        this.$store.commit('removeSelectedCountyFips', this.selectedCountyFips[this.currentLocationIndex])
      } else if (this.regionTypeSelection === "places") {
        this.$store.commit('removeSelectedPlaceGeoids', this.selectedPlaceGeoids[this.currentLocationIndex])
      }
    }
  }
}
</script>


<style lang="scss" scoped>
@use '../variables.scss';

h3 {
  margin: 0 0 0.5em;
  border-bottom: 1px solid;
}

.title {
  font-size: 120%;
  font-weight: bold;
  color: #000;
}

.subtitle {
  font-size: 14px;
  margin-bottom: 4px;
}

.selection-summary-container {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.overflow-section {
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0px 15px;
}

.selection-summary {
  font-size: 14px;
}

.summary {
  text-align: left;
  margin-bottom: 10px;
}

.summary-title {
  font-weight: bold;
  font-size: 14px;
  line-height: 17px;
  color: #000;
  margin: 1em 0 0.5em 0;
}

.total {
  margin: 0.25em 0 0;
  font-weight: bold;
  border-top: 1px solid #a9a9a9;
  width: 100%;
  text-align: right;
}

.section {
  margin-top: 12px;

  .title {
    text-align: left;
    font-size: 14px;
    margin-bottom: 8px;
    font-weight: bold;
  }
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  background: variables.$light-grey;
  border-radius: 4px;
  flex-shrink: 0;
  margin: 0px 15px;

  h4 {
    margin: 0;
    width: 100%;
    text-align: left;
  }
}
</style>
