<template>
  <div class="legend-container">
    <div class="legend-col">
      <div class="title">Current conditions</div>
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;"
        src="@/assets/img/hurricane-legend-icon.png">
        <div>Storm Category</div>
      </div>
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;"
        src="@/assets/img/hurricane-legend-wind-speed-perimeter.png">
        <div>Category 1 wind speed perimeter (> 74mph)</div>
      </div>
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;"
        src="@/assets/img/hurricane-legend-storm-surge.png">
        <div>Storm surge alert</div>
      </div>
    </div>
    <div class="legend-col">
      <div class="title">Forecast conditions</div>
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;"
        src="@/assets/img/hurricane-legend-pathway.png">
        <div>Forecast Pathway</div>
      </div>
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;"
        src="@/assets/img/hurricane-legend-wind-speed-chance.png">
        <div>Chance of category 1 wind speeds (> 74mph)</div>
      </div>
    </div>
  </div>
  <div class="legend-container"  v-if="disasterType === 'cyclone'">
    <div class="legend-col">
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;"
        src="@/assets/img/hurricane-legend-icon.png">
        <div>Storm Category</div>
      </div>
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;"
        src="@/assets/img/hurricane-legend-wind-speed-perimeter.png">
        <div>Category 1 wind speed perimeter (> 119kph)</div>
      </div>
    </div>
    <div class="legend-col">
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;"
        src="@/assets/img/hurricane-legend-pathway.png">
        <div>Forecast Pathway</div>
      </div>
    </div>
  </div>
</template>

<script>
  import { mapState, mapGetters, mapMutations } from 'vuex'

  export default {
    name: 'MapLegendHurricane',

    computed: {
      ...mapGetters([
        'disasterType',
      ]),
    },
  }
</script>

<style lang="scss" scoped>
.title {
  display: flex;
  align-items: center;
  text-align: left;
  font-weight: bold;
  font-size: 14px;
  line-height: 17px;
  color: #000;
  margin: 12px 0 6px 0;
  margin-top: 0px;
}

.legend-container {
  width: 100%;
  display: flex;
}

.legend-col {
  display: flex;
  flex-direction: column;
  align-items: left;
  width: 50%;
  .legend-item:not(:last-child) {
    margin-bottom: 0.5em;
  }
  &:not(:last-child) {
    margin-right: 15px;
    border-right: 1px solid #D9D9D9;
  }
}

.legend-item {
  display: flex;
  align-items: center;

  div {
    font-size: 12px;
  }
}

.legend-image {
  height: 22px;
  margin-right: 6px;
}
</style>
