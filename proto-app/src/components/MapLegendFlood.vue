<template>
  <div class="flood-legend">
  <template v-if="layerSuccess('floodGauges') && hasInterestingGauges">
  <div class="title">
      Flood gauge severity
      <InfoTooltip tooltip-key="flood-gauge-severity" />
    </div>
    <div class="legend-container">
      <div class="legend-col">
        <div class="legend-item">
          <div class="legend-image" style="height: 15px; width: 15px; background:#992727; border-radius: 10px;"></div>
          <div>Extreme</div>
        </div>
      </div>
      <div class="legend-col">
        <div class="legend-item">
          <div class="legend-image" style="height: 15px; width: 15px; background:#ed8b52; border-radius: 10px"></div>
          <div>Danger</div>
        </div>
      </div>
      <div class="legend-col">
        <div class="legend-item">
          <div class="legend-image" style="height: 15px; width: 15px; background:#eace14; border-radius: 10px"></div>
          <div>Warning</div>
        </div>
      </div>
      <div class="legend-col">
        <div class="legend-item">
          <div class="legend-image" style="height: 15px; width: 15px; background:#54BE56; border-radius: 10px"></div>
          <div>Normal</div>
        </div>
      </div>
      <div class="legend-col">
        <div class="legend-item">
          <div class="legend-image" style="height: 15px; width: 15px; background:lightgray; border-radius: 10px"></div>
          <div>No data</div>
        </div>
      </div>
    </div>

    <div class="subtitle">Forecasted trend</div>
    <div class="legend-container">
      <div class="legend-col">
        <div class="legend-item">
          <img class="legend-image" style="height: 15px; width: 15px;" src="@/assets/img/flood-gauge-legend-rising.png" />
          <div>Rising</div>
        </div>
      </div>
      <div class="legend-col">
        <div class="legend-item">
          <img class="legend-image" style="height: 15px; width: 15px;" src="@/assets/img/flood-gauge-legend-falling.png" />
          <div>Falling</div>
        </div>
      </div>
      <div class="legend-col">
        <div class="legend-item">
          <img class="legend-image" style="height: 15px; width: 15px;" src="@/assets/img/flood-gauge-legend-constant.png" />
          <div>Constant</div>
        </div>
      </div>
    </div>
  </template>

  <template v-if="layerSuccess('floodInundations') && floodInundationCount > 0">
  <div class="title">
      Flood inundation
      <InfoTooltip tooltip-key="flood-inundation" />
    </div>
    <div class="legend-container">
      <div class="legend-col">
        <div class="legend-item">
          <img class="legend-image" style="height: 15px; width: 15px;" src="@/assets/img/forecasted-veryhigh.png" />
          <div>High</div>
        </div>
      </div>
      <div class="legend-col">
        <div class="legend-item">
          <img class="legend-image" style="height: 15px; width: 15px;" src="@/assets/img/forecasted-high.png" />
          <div>Medium</div>
        </div>
      </div>
      <div class="legend-col">
        <div class="legend-item">
          <img class="legend-image" style="height: 15px; width: 15px;" src="@/assets/img/forecasted-moderate.png" />
          <div>Low</div>
        </div>
      </div>
    </div>

    <div class="subtitle">Data type</div>
    <div class="legend-container">
      <div class="legend-col">
        <div class="legend-item">
          <img class="legend-image" style="height: 15px; width: 15px;" src="@/assets/img/actual-high.png" />
          <div>Actual</div>
        </div>
      </div>
      <div class="legend-col">
        <div class="legend-item">
          <img class="legend-image" style="height: 15px; width: 15px;" src="@/assets/img/forecasted-high.png" />
          <div>Forecasted</div>
        </div>
      </div>
    </div>
  </template>

  <template v-if="layerSuccess('floodExtent') && extentSources.length">
    <div class="title">Flood extent</div>
    <div class="bd-control" v-if="!reportMode && extentSources.length > 1">
      <span class="bd-label">Source</span>
      <select v-model="extentSource" class="bd-select">
        <option v-for="s in extentSources" :key="s.key" :value="s.key">{{ s.label }}</option>
      </select>
    </div>
    <div class="bd-control" v-else>
      <span class="bd-label">Source</span>
      <span class="bd-single">{{ (currentExtent && currentExtent.label) || extentSources[0].label }}</span>
    </div>
    <div class="legend-container">
      <div class="legend-col">
        <div class="legend-item">
          <div class="legend-image" style="height: 15px; width: 15px; background:#2b6fb0; opacity:0.5; border:1px solid #2b6fb0;"></div>
          <div>Observed inundation{{ currentExtent && currentExtent.area ? ' (~' + currentExtent.area + ' km²)' : '' }}</div>
        </div>
      </div>
    </div>
    <div v-if="currentExtent && currentExtent.note" class="bd-note">{{ currentExtent.note }}</div>
    <div v-if="currentExtent && currentExtent.updated" class="bd-updated">Updated {{ currentExtent.updated }}</div>
  </template>

  <template v-if="layerSuccess('floodBuildingDamage') && damageSources.length">
    <div class="title">Building damage</div>
    <div class="bd-control" v-if="!reportMode && damageSources.length > 1">
      <span class="bd-label">Source</span>
      <select v-model="damageSource" class="bd-select">
        <option v-for="s in damageSources" :key="s.key" :value="s.key">{{ s.label }}</option>
      </select>
    </div>
    <div class="bd-control" v-else>
      <span class="bd-label">Source</span>
      <span class="bd-single">{{ (currentSource && currentSource.label) || damageSources[0].label }}</span>
    </div>
    <div v-if="currentUpdated" class="bd-updated">Updated {{ currentUpdated }}</div>
    <div class="bd-control">
      <span class="bd-label">View</span>
      <span v-if="reportMode" class="bd-single">{{ damageMode === 'hexagon' ? 'Hexagons (0.1 mi)' : 'Buildings' }}</span>
      <div v-else class="bd-radios">
        <label><input type="radio" value="individual" v-model="damageMode" /> Buildings</label>
        <label><input type="radio" value="hexagon" v-model="damageMode" /> Hexagons&nbsp;(0.1&nbsp;mi)</label>
      </div>
    </div>
    <template v-if="damageMode === 'individual' && currentMetric === 'density'">
      <div class="legend-item" style="margin-top:6px;">
        <div class="legend-image" style="height:14px; width:14px; background:#fde725; border:1px solid #b5b300;"></div>
        <div>{{ binaryLabel }} building</div>
      </div>
      <div class="bd-note">Binary source — each footprint is flagged {{ binaryLabel.toLowerCase() }}{{ isAffectedOnly ? ' (within the flood/analysis zone, not confirmed damaged)' : '' }}. Switch to Hexagons for density.</div>
    </template>
    <template v-else>
      <div class="viridis-bar"></div>
      <div class="viridis-labels">
        <span>{{ lowLabel }}</span>
        <span>{{ highLabel }}</span>
      </div>
      <div class="bd-note">{{ bdNote }}</div>
    </template>
  </template>

  <template v-if="layerSuccess('floodBridgeDamage') && bridgeSources.length">
    <div class="title">Bridge damage</div>
    <div class="bd-control" v-if="!reportMode && bridgeSources.length > 1">
      <span class="bd-label">Source</span>
      <select v-model="bridgeSource" class="bd-select">
        <option v-for="s in bridgeSources" :key="s.key" :value="s.key">{{ s.label }}</option>
      </select>
    </div>
    <div class="bd-control" v-else>
      <span class="bd-label">Source</span>
      <span class="bd-single">{{ (currentBridge && currentBridge.label) || bridgeSources[0].label }}</span>
    </div>
    <div class="legend-container">
      <div class="legend-col" v-for="g in bridgeGrades" :key="g.label">
        <div class="legend-item">
          <div class="legend-image" :style="`height:15px; width:15px; background:${g.color}; border:1.5px solid #fff; border-radius:10px;`"></div>
          <div>{{ g.label }}</div>
        </div>
      </div>
    </div>
    <div v-if="currentBridge && currentBridge.updated" class="bd-updated">Updated {{ currentBridge.updated }}</div>
  </template>

  <template v-if="layerSuccess('floodRoadDamage') && roadSources.length">
    <div class="title">Road damage</div>
    <div class="bd-control" v-if="!reportMode && roadSources.length > 1">
      <span class="bd-label">Source</span>
      <select v-model="roadSource" class="bd-select">
        <option v-for="s in roadSources" :key="s.key" :value="s.key">{{ s.label }}</option>
      </select>
    </div>
    <div class="bd-control" v-else>
      <span class="bd-label">Source</span>
      <span class="bd-single">{{ (currentRoad && currentRoad.label) || roadSources[0].label }}</span>
    </div>
    <div class="legend-container">
      <div class="legend-col" v-for="g in roadGrades" :key="g.label">
        <div class="legend-item">
          <div class="legend-image" :style="`height:0; width:16px; border-top:3px solid ${g.color};`"></div>
          <div>{{ g.label }}</div>
        </div>
      </div>
    </div>
    <div v-if="currentRoad && currentRoad.updated" class="bd-updated">Updated {{ currentRoad.updated }}</div>
  </template>

  <template v-if="layerSuccess('floodAoiCorridor')">
    <div class="title">Flood corridor <span style="font-weight:normal; font-size:10px; color:#777;">HOT</span></div>
    <div class="legend-container">
      <div class="legend-col">
        <div class="legend-item">
          <div class="legend-image" style="height: 0; width: 16px; border-top: 1.6px dashed #0f6e8c;"></div>
          <div>Bhotekoshi–Trishuli affected corridor</div>
        </div>
      </div>
    </div>
  </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import InfoTooltip from './InfoTooltip.vue'
import { useLayerError } from '@/composables/useLayerError'

const { layerSuccess } = useLayerError()

// In the report the legend shows the selections as static text (no dropdowns/radios).
defineProps({ reportMode: { type: Boolean, default: false } })

const store = useStore()

// hide legend blocks that have no data for this event (gauge severity when no
// gauge is elevated; inundation when there are no inundation features)
const hasInterestingGauges = computed(() => (store.state.floodGauges || []).some(g => g.isInteresting))
const floodInundationCount = computed(() => store.state.floodInundationCount || 0)

// --- flood-extent source selector ---
const extentSources = computed(() => store.state.floodExtentSources)
const extentSource = computed({
  get: () => store.state.floodExtentSource,
  set: v => store.commit('setFloodExtentSource', v),
})
const currentExtent = computed(() => extentSources.value.find(x => x.key === extentSource.value))

// --- standardized damage-grade scale, shared by bridges + roads for comparability ---
const gradeScale = [
  { label: 'Destroyed', color: '#c0392b' },
  { label: 'Damaged', color: '#e08a1e' },
  { label: 'Possibly damaged', color: '#f1c40f' },
  { label: 'No visible damage', color: '#2e8b57' },
]

// --- bridge-damage source selector ---
const bridgeSources = computed(() => store.state.bridgeDamageSources)
const bridgeSource = computed({
  get: () => store.state.bridgeDamageSource,
  set: v => store.commit('setBridgeDamageSource', v),
})
const currentBridge = computed(() => bridgeSources.value.find(x => x.key === bridgeSource.value))
// only show grades actually present in the selected source (so the legend never
// lists a category with zero features)
const bridgeGrades = computed(() => {
  const present = currentBridge.value?.grades
  return present?.length ? gradeScale.filter(g => present.includes(g.label)) : gradeScale
})

// --- road-damage source selector ---
const roadSources = computed(() => store.state.roadDamageSources)
const roadSource = computed({
  get: () => store.state.roadDamageSource,
  set: v => store.commit('setRoadDamageSource', v),
})
const currentRoad = computed(() => roadSources.value.find(x => x.key === roadSource.value))
const roadGrades = computed(() => {
  const present = currentRoad.value?.grades
  return present?.length ? gradeScale.filter(g => present.includes(g.label)) : gradeScale
})

const damageSources = computed(() => store.state.buildingDamageSources)
const damageSource = computed({
  get: () => store.state.buildingDamageSource,
  set: v => store.commit('setBuildingDamageSource', v),
})
const damageMode = computed({
  get: () => store.state.buildingDamageMode,
  set: v => store.commit('setBuildingDamageMode', v),
})
const currentSource = computed(() => damageSources.value.find(x => x.key === damageSource.value))
const currentMetric = computed(() => currentSource.value?.metric || 'severity')
const currentUpdated = computed(() => currentSource.value?.updated || null)
const binaryLabel = computed(() => currentSource.value?.binaryLabel || 'Damaged')
const isAffectedOnly = computed(() => binaryLabel.value.toLowerCase() === 'affected')
// Word labels (earlier clean style) — exact per-cell/footprint numbers are shown
// in a click popup, so the legend itself stays simple.
const lowLabel = computed(() => {
  if (damageMode.value === 'hexagon') return currentMetric.value === 'density' ? 'Fewer' : 'Lower avg'
  return 'No damage'
})
const highLabel = computed(() => {
  if (damageMode.value === 'hexagon') return currentMetric.value === 'density' ? 'More' : 'Higher avg'
  return 'Destroyed'
})
const bdNote = computed(() => {
  if (damageMode.value === 'hexagon') {
    return currentMetric.value === 'density'
      ? 'Damaged-building density per 0.1-mile cell.'
      : 'Mean damage severity per 0.1-mile cell.'
  }
  return 'Per-building damage class (viridis). Zoom in to see footprints.'
})
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

  div {
    font-size: 12px;
  }
}

.legend-image {
  height: 22px;
  margin-right: 3px;
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

/* --- building-damage controls --- */
.bd-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}
.bd-label {
  font-size: 11px;
  color: #777;
  width: 42px;
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
.bd-single {
  font-size: 12px;
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
    color: #333;
    cursor: pointer;
  }
  input { cursor: pointer; }
}
.viridis-bar {
  height: 10px;
  border-radius: 2px;
  margin: 8px 0 3px 0;
  background: linear-gradient(to right, #440154, #414487, #2a788e, #22a884, #7ad151, #fde725);
}
.viridis-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #777;
}
.bd-note {
  font-size: 10px;
  color: #999;
  margin-top: 4px;
  line-height: 1.3;
}
.bd-updated {
  font-size: 10px;
  color: #aaa;
  margin: 2px 0 0 0;
}
</style>
