<template>
  <template v-if="layerSuccess('heatApiData')">
    <div class="title">
      Risk Level
      <InfoTooltip tooltip-key="heat-risk-level" />
    </div>
    <div class="legend-container">
      <div class="legend-col" v-for="item in legendItems" :key="item.name">
        <div class="legend-item">
          <img class="legend-image" :src="item.icon" />
          <div>{{ item.name }}</div>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import InfoTooltip from './InfoTooltip.vue'
import { useLayerError } from '@/composables/useLayerError'
import heatMinorIcon from '@/assets/img/heat-minor.png'
import heatMajorIcon from '@/assets/img/heat-major.png'
import heatDangerIcon from '@/assets/img/heat-danger.png'
import heatExtremeIcon from '@/assets/img/heat-extreme.png'

const { layerSuccess } = useLayerError()

const legendItems = [
  {
    name: 'Minor',
    icon: heatMinorIcon,
  },
  {
    name: 'Major',
    icon: heatMajorIcon,
  },
  {
    name: 'Danger',
    icon: heatDangerIcon,
  },
  {
    name: 'Extreme',
    icon: heatExtremeIcon,
  },
];
</script>

<style lang="scss" scoped>
.legend-container {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.legend-col {
  display: flex;
  flex-direction: column;
  align-items: left;
  .legend-item:not(:last-child) {
    margin-bottom: 0.5em;
  }
}

.legend-item {
  display: flex;
  align-items: center;
  margin: 2px;
  gap: 0.25rem;
  font-size: 12px;
}

.legend-image {
  height: 15px;
  width: 15px;
}

.title {
  display: flex;
  align-items: center;
  text-align: left;
  font-weight: bold;
  font-size: 14px;
  line-height: 17px;
  color: #000;
  margin: 1em 0 0.5em 0;
  &:first-child {
    margin-top: 0px;
  }
}

.subtitle {
  margin: 8px 0px 4px 0px;
  font-size: 10px;
}
</style>
