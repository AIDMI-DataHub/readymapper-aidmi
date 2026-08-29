<template>
  <div class="compose-container">
    <div class="intro">
      Build your own view — turn any layers on or off across categories and see
      them together on one map.
      <div class="quick-actions">
        <button type="button" @click="showAll">Show all</button>
        <span class="sep">·</span>
        <button type="button" @click="hideAll">Hide all</button>
      </div>
    </div>

    <div v-if="activeLayers.length === 0" class="empty">
      No layers loaded for this event.
    </div>

    <div
      v-for="group in visibleGroups"
      :key="group.key"
      class="group"
    >
      <div class="group-title">{{ group.title }}</div>

      <template v-for="layer in group.layers" :key="layer.id">
        <div
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
          <span class="layer-name">{{ layer.loadLabel || layer.id }}</span>
          <span v-if="isLayerErrored(layer)" class="layer-error">
            {{ layerErrorMessage(layer) }}
          </span>
        </div>

        <!-- Infrastructure-type sub-filter, shown under Global infrastructure -->
        <div
          v-if="layer.id === 'globalInfra' && isLayerVisible(layer)"
          class="subfilter"
        >
          <div class="subfilter-head">
            <span>Infrastructure types</span>
            <button
              v-if="hiddenInfraTypes.length"
              type="button"
              class="link"
              @click="showAllTypes"
            >Show all</button>
          </div>
          <div
            v-for="t in infraTypes"
            :key="t.type"
            class="type-row"
            @click="toggleType(t.type, !isTypeVisible(t.type))"
          >
            <span
              class="visible-icon small"
              :class="{ 'is-hidden': !isTypeVisible(t.type) }"
              v-html="visibleSvg"
              aria-hidden="true"
            />
            <span class="type-name">{{ t.label }}</span>
          </div>
        </div>

        <!-- Flood-extent source dropdown, under Flood extent -->
        <div
          v-if="layer.id === 'floodExtent' && isLayerVisible(layer) && extentSources.length > 1"
          class="subfilter"
        >
          <div class="bd-row">
            <span class="bd-key">Source</span>
            <select v-model="extentSource" class="bd-select">
              <option v-for="s in extentSources" :key="s.key" :value="s.key">{{ s.label }}</option>
            </select>
          </div>
        </div>

        <!-- Bridge-damage source dropdown, under Bridge damage -->
        <div
          v-if="layer.id === 'floodBridgeDamage' && isLayerVisible(layer) && bridgeSources.length > 1"
          class="subfilter"
        >
          <div class="bd-row">
            <span class="bd-key">Source</span>
            <select v-model="bridgeSource" class="bd-select">
              <option v-for="s in bridgeSources" :key="s.key" :value="s.key">{{ s.label }}</option>
            </select>
          </div>
        </div>

        <!-- Building-damage source + view (buildings / hexagons), under Building damage -->
        <div
          v-if="layer.id === 'floodBuildingDamage' && isLayerVisible(layer) && damageSources.length"
          class="subfilter"
        >
          <div v-if="damageSources.length > 1" class="bd-row">
            <span class="bd-key">Source</span>
            <select v-model="damageSource" class="bd-select">
              <option v-for="s in damageSources" :key="s.key" :value="s.key">{{ s.label }}</option>
            </select>
          </div>
          <div class="bd-row">
            <span class="bd-key">View</span>
            <div class="bd-radios">
              <label><input type="radio" value="individual" v-model="damageMode" /> Buildings</label>
              <label><input type="radio" value="hexagon" v-model="damageMode" /> Hexagons</label>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import { layers, type LayerConfig } from '@/layers/index.ts'
import { settings } from '../../constants/settings'
import visibleSvg from '@/assets/img/visible.svg?raw'

const store = useStore()

// Layers whose home tab is Infrastructure (by their updater's currentTab gate).
// Everything else with disasterType 'all' is People; hazard layers are Disaster.
const INFRA_IDS = new Set([
  'globalInfra', 'healthcareFacilities', 'healthcareFacilitiesWithCapacities',
  'isochrones', 'cityPowerOutagesTimeseries', 'countyPowerOutagesTimeseries',
  'networkCoverage',
])

function categoryOf(layer: LayerConfig): 'disaster' | 'people' | 'infrastructure' | 'news' {
  // News Sources layers are disasterType 'flood' but belong in their own group,
  // not under Disaster — check the id prefix before the disasterType fallthrough.
  if (layer.id.startsWith('news')) return 'news'
  if (layer.disasterType !== 'all') return 'disaster'
  if (INFRA_IDS.has(layer.id)) return 'infrastructure'
  return 'people'
}

const GROUPS = [
  { key: 'disaster', title: 'Disaster' },
  { key: 'people', title: 'People' },
  { key: 'infrastructure', title: 'Infrastructure' },
  { key: 'news', title: 'News Sources' },
]

const infraTypes = [...settings.globalInfraTypes, ...settings.waterInfraTypes]
  .map(t => ({ type: t.type, label: t.label }))

const activeLayerIds = computed<string[]>(() => store.state.activeLayerIds)
const hiddenMapLayerIds = computed<string[]>(() => store.state.hiddenMapLayerIds)
const hiddenInfraTypes = computed<string[]>(() => store.state.hiddenInfraTypes)
const loadProgress = computed(() => store.state.loadProgress)

const extentSources = computed<any[]>(() => store.state.floodExtentSources)
const extentSource = computed<string>({
  get: () => store.state.floodExtentSource,
  set: v => store.commit('setFloodExtentSource', v),
})

const bridgeSources = computed<any[]>(() => store.state.bridgeDamageSources)
const bridgeSource = computed<string>({
  get: () => store.state.bridgeDamageSource,
  set: v => store.commit('setBridgeDamageSource', v),
})

const damageSources = computed<any[]>(() => store.state.buildingDamageSources)
const damageSource = computed<string>({
  get: () => store.state.buildingDamageSource,
  set: v => store.commit('setBuildingDamageSource', v),
})
const damageMode = computed<string>({
  get: () => store.state.buildingDamageMode,
  set: v => store.commit('setBuildingDamageMode', v),
})

const activeLayers = computed(() =>
  layers.filter(l => activeLayerIds.value.includes(l.id) && (l.mapLayerIds?.length ?? 0) > 0)
)

const visibleGroups = computed(() =>
  GROUPS
    .map(g => ({ ...g, layers: activeLayers.value.filter(l => categoryOf(l) === g.key) }))
    .filter(g => g.layers.length > 0)
)

function isLayerErrored(layer: LayerConfig): boolean {
  return !!loadProgress.value[layer.loadLabel!]?.error
}
function layerErrorMessage(layer: LayerConfig): string {
  return loadProgress.value[layer.loadLabel!]?.message || 'Failed to load'
}
function isLayerVisible(layer: LayerConfig): boolean {
  return !layer.mapLayerIds!.some(id => hiddenMapLayerIds.value.includes(id))
}
function toggleLayer(layer: LayerConfig, visible: boolean): void {
  layer.mapLayerIds!.forEach(mapLayerId => {
    store.commit('setMapLayerVisibility', { layerId: mapLayerId, visible })
  })
}

function isTypeVisible(type: string): boolean {
  return !hiddenInfraTypes.value.includes(type)
}
function toggleType(type: string, visible: boolean): void {
  store.commit('setInfraTypeVisibility', { type, visible })
}
function showAllTypes(): void {
  store.commit('setHiddenInfraTypes', [])
}

function showAll(): void {
  store.commit('setHiddenMapLayerIds', [])
}
function hideAll(): void {
  const ids = activeLayers.value.flatMap(l => l.mapLayerIds!)
  store.commit('setHiddenMapLayerIds', [...new Set(ids)])
}
</script>

<style lang="scss" scoped>
@use '../variables.scss';

.compose-container {
  padding: 0.5rem 15px 1rem 15px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.intro {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.quick-actions {
  margin-top: 6px;
  font-size: 12px;

  button {
    background: none;
    border: none;
    padding: 0;
    color: variables.$orange;
    font-weight: 600;
    cursor: pointer;
    font-size: 12px;
  }
  .sep { color: #ccc; margin: 0 6px; }
}

.empty {
  font-size: 13px;
  color: #888;
}

.group + .group {
  border-top: 1px solid #eee;
  padding-top: 0.75rem;
}

.group-title {
  font-weight: bold;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #999;
  margin-bottom: 0.4rem;
}

.layer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  cursor: pointer;
  user-select: none;

  &.has-error { cursor: default; }
  &.has-error .visible-icon :deep(path) { fill: #DEDEDE; }
}

.visible-icon {
  flex-shrink: 0;
  display: flex;

  :deep(path) { fill: #A6A6A6; }
  &.is-hidden :deep(path) { fill: #DEDEDE; }
  &.small :deep(svg) { width: 13px; height: 13px; }
}

.layer-name {
  font-size: 13px;
  color: #333;
  line-height: 1.3;
}

.layer-error {
  font-size: 11px;
  color: #c0392b;
}

.subfilter {
  margin: 2px 0 6px 26px;
  padding-left: 10px;
  border-left: 2px solid #eee;
}

.bd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 5px 0;
}
.bd-key {
  font-size: 11px;
  color: #999;
  width: 44px;
  flex-shrink: 0;
}
.bd-select {
  flex: 1;
  font-size: 12px;
  padding: 2px 4px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: #fff;
  color: #333;
}
.bd-radios {
  display: flex;
  gap: 12px;
  label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #444;
    cursor: pointer;
  }
  input { cursor: pointer; }
}

.subfilter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #999;
  margin: 4px 0;

  .link {
    background: none;
    border: none;
    padding: 0;
    color: variables.$orange;
    font-weight: 600;
    cursor: pointer;
    font-size: 11px;
  }
}

.type-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 3px 0;
  cursor: pointer;
  user-select: none;
}

.type-name {
  font-size: 12px;
  color: #444;
}
</style>
