<template>
<div
  :class="`link-button-wrapper ${disabled ? 'isDisabled': ''}`"
  :data-tooltip="disabled ? 'Reports can only be generated when regions are selected. Click the map to select one or more regions.' : null"
  @click="!pickMapViewScreen ? showPickMapView() : generateReport()"
>
  <div>
    <button :disabled="disabled" :class="`link-button ${disabled ? 'isDisabled': ''}`">
      {{ pickMapViewScreen ? "View Report" : "Generate Report" }}
    </button>
  </div>
</div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

import { generateReportMaps } from './utils/generateReportMaps'

export default {
  name: 'GenerateReportButton',

  methods: {
    ...mapMutations([
      'setReportVisible',
      'setReportLoading',
      'setTab',
      'setReportMapViews',
      'setPickMapViewScreen',
      'stopPlayback'
    ]),

    showPickMapView() {
      if (this.disabled) return

      this.stopPlayback()

      this.setPickMapViewScreen(true)
    },

    async generateReport() {
      if (this.disabled) return

      this.setPickMapViewScreen(false)

      this.setReportLoading(true)
      const previousTab = this.$store.state.currentTab

      await generateReportMaps(this.$store.state.disasterConfig, this.$store.state.map, this.setTab, this.setReportMapViews)

      this.setTab(previousTab)
      this.setReportLoading(false)

      // Show the report
      this.showReport()
    },

    showReport() {
      // Go through the router so that the back button closes the report
      this.$router.replace({ query: {
        disasterId: this.disasterId,
        reportVisible: true
      }})
    }
  },

  computed: {
    ...mapState([
      'regionTypeSelection',
      'disasterConfig',
      'disasterId',
      'pickMapViewScreen',
    ]),
    ...mapGetters([
      'selectedPlaces',
      'selectedCounties',
    ]),
    selectedLocations() {
      if (this.regionTypeSelection === "counties") { return this.selectedCounties }
      return this.selectedPlaces
    },
    disabled() {
      return !this.selectedLocations?.length
    },
  },

  components: {
  },

  props: {
  }
}
</script>

<style lang="scss" scoped>
@use "../variables.scss";
.link-button-wrapper {
  position: absolute;
  bottom: variables.$action-button-bottom;
  right: variables.$action-button-right;
  display: flex;
  width: variables.$action-button-width;
  height: variables.$action-button-height;
  align-items: center;
  justify-content: center;
  background: variables.$orange;
  box-shadow: 0px 0px 8px rgba(73, 73, 73, 0.25);
  border-radius: 6px;
  cursor: pointer;
}

.link-button {
  color: #fff;
  text-decoration: none;
  text-transform: uppercase;
  font-size: 18px;
  font-weight: bold;
  width: 100%;
  background: none;
  border: none;
}

.isDisabled {
  background: #666;
  cursor: auto;

  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 220px;
    padding: 8px 12px;
    background: #333;
    color: #fff;
    font-size: 13px;
    font-weight: normal;
    text-transform: none;
    line-height: 1.4;
    text-align: center;
    border-radius: 4px;
    pointer-events: none;
    z-index: 100;
  }
}
</style>
