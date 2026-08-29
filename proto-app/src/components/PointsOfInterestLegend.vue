<template>
  <template v-if="store.getters.disasterType === 'flood'">
    <div class="title">
      Water infrastructure
      <InfoTooltip tooltip-key="water-infra" />
    </div>
    <div style="display: flex; align-items: center; flex-wrap: wrap; column-gap: 6px">
      <div :style="`display: flex; align-items: center; width: ${columnWidth};`" v-for="type in waterFacilityTypes" :key="type.slug">
        <img style="width: 25px; margin-right: 2px" :src="iconUrl(type.slug)">
        <div style="font-size: 13px;">{{type.label}}</div>
      </div>
    </div>
  </template>
  <template v-if="facilityTypes.length > 0">
    <div class="title">
      Points of interest
      <InfoTooltip tooltip-key="points-of-interest" />
    </div>
    <div style="display: flex; align-items: center; flex-wrap: wrap; column-gap: 6px">
      <div :style="`display: flex; align-items: center; width: ${columnWidth};`" v-for="type in facilityTypes" :key="type.slug">
        <img style="width: 25px; margin-right: 2px" :src="iconUrl(type.slug)">
        <div style="font-size: 13px;">{{type.label}}</div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { uniqBy } from 'es-toolkit/array'
import { useStore } from 'vuex'
import { settings } from '../../constants/settings'
import { useLayerError } from '@/composables/useLayerError'
import InfoTooltip from './InfoTooltip.vue'

interface FacilityType {
  slug: string
  label: string
}

withDefaults(defineProps<{ columnWidth?: string }>(), { columnWidth: undefined })

const { layerSuccess } = useLayerError()

const store = useStore()

function iconUrl(slug: string): string {
  return new URL(`../assets/img/poi-icons/${slug}.png`, import.meta.url).href
}

const facilityTypes = computed<FacilityType[]>(() => {
  let types: FacilityType[] = []
  if (layerSuccess('globalInfra')) {
    types = [...types, ...settings.globalInfraTypes]
  }
  if (layerSuccess('healthcareFacilities')) {
    types = [...types, ...settings.healthcareFacilityTypes]
  }
  return uniqBy(types, d => d.slug)
})

const waterFacilityTypes = computed<FacilityType[]>(() => {
  return settings.waterInfraTypes
})
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
  }
</style>
