<template>
  <div class="settings-container">
    <div class="settings-section">
      <div class="title">Layers</div>
      <div v-if="activeLayers.length === 0" class="empty">
        No layers loaded.
      </div>
      <div
        v-for="layer in activeLayers"
        :key="layer.id"
        class="layer-row"
        :class="{ 'has-error': isLayerErrored(layer) }"
        @click="!isLayerErrored(layer) && toggleLayer(layer, !isLayerVisible(layer))"
      >
        <span
          class="visible-icon"
          :class="{ 'is-hidden': !isLayerVisible(layer) }"
          v-html="visibleSvg"
          aria-hidden="true"
        />
        <span class="layer-name">
          {{ layer.loadLabel || layer.id }}
        </span>
        <span v-if="isLayerErrored(layer)" class="layer-error">
          {{ layerErrorMessage(layer) }}
        </span>
      </div>
    </div>
    <div class="settings-section-row">
      <span class="title">Disaster status</span>
      <span class="status-badge" :class="isArchived ? 'inactive' : 'active'">
        {{ isArchived ? 'Inactive' : 'Active' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { layers, type LayerConfig } from '@/layers/index.ts'
import visibleSvg from '@/assets/img/visible.svg?raw'

const store = useStore()

const activeLayerIds = computed<string[]>(() => store.state.activeLayerIds)
const isArchived = computed(() => !!store.state.disasterConfig?.isArchived)
const hiddenMapLayerIds = computed<string[]>(() => store.state.hiddenMapLayerIds)
const loadProgress = computed(() => store.state.loadProgress)

const activeLayers = computed(() =>
  layers.filter(l => activeLayerIds.value.includes(l.id) && l.mapLayerIds?.length > 0)
)

function isLayerErrored(layer: LayerConfig): boolean {
  return !!loadProgress.value[layer.loadLabel]?.error
}

function layerErrorMessage(layer: LayerConfig): string {
  return loadProgress.value[layer.loadLabel]?.message || 'Failed to load'
}

function isLayerVisible(layer: LayerConfig): boolean {
  return !layer.mapLayerIds!.some(id => hiddenMapLayerIds.value.includes(id))
}

function toggleLayer(layer: LayerConfig, visible: boolean): void {
  layer.mapLayerIds!.forEach(mapLayerId => {
    store.commit('setMapLayerVisibility', { layerId: mapLayerId, visible })
  })
}
</script>

<style lang="scss" scoped>
@use '../variables.scss';

.settings-container {
  padding: 0px 15px;
  padding-top: 0.5rem;
  padding-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-section-row {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: center;
}

.title {
  display: flex;
  align-items: center;
  text-align: left;
  font-weight: bold;
  font-size: 14px;
  line-height: 17px;
  color: #000;
  &:first-child {
    margin-top: 0px;
  }
}

.empty {
  font-size: 13px;
  color: #888;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  cursor: pointer;
  user-select: none;

  &:last-child {
    border-bottom: none;
  }

  &.has-error {
    cursor: default;

    .visible-icon :deep(path) {
      fill: #DEDEDE;
    }
  }
}

.visible-icon {
  flex-shrink: 0;
  display: flex;

  :deep(path) {
    fill: #A6A6A6;
  }

  &.is-hidden :deep(path) {
    fill: #DEDEDE;
  }
}

.status-badge {
  display: inline-block;
  font-size: 0.9em;
  font-weight: 600;

  &.active {
    color: #2e7d32;
  }

  &.inactive {
    color: #888;
  }
}

.layer-name {
  font-size: 13px;
  color: #333;
  line-height: 1.3;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.layer-error {
  font-size: 11px;
  color: #c0392b;
}
</style>
