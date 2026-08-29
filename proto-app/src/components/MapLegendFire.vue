<template>
  <div class="legend-container">
    <div class="legend-col" v-if="layerSuccess('firePerimeter')">
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;"
        src="@/assets/img/fire-diff.png">
        <div>Fire perimeter</div>
      </div>
    </div>
    <div class="legend-col" v-if="layerSuccess('firePerimeterDifference')">
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 20px;"
        src="@/assets/img/fire.png">
        <div>New fire perimeter growth</div>
      </div>
    </div>
    <div class="legend-col" v-if="layerSuccess('smokePerimeter')">
      <div class="legend-item">
        <img class="legend-image" style="height: 15px; width: 23px;"
        src="@/assets/img/smoke.png">
        <div>Heavy Density Smoke</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLayerError } from '@/composables/useLayerError'

const { layerSuccess } = useLayerError()
</script>

<style lang="scss" scoped>
.legend-container {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
}

.legend-col {
  display: flex;
  flex-direction: column;
  align-items: left;
  width: 50%;
  .legend-item:not(:last-child) {
    margin-bottom: 0.5em;
  }
  padding-bottom: 10px;
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
