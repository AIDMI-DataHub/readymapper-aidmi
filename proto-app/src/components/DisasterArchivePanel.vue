<template>
  <div v-if="archiveMode && navbarOpen && !reportVisible" class="archive-panel">
    <div class="panel-header">
      <span class="panel-title">Disaster Archive</span>
      <span class="result-count">
        {{ filteredDisasters.length }} result{{ filteredDisasters.length !== 1 ? 's' : '' }}
      </span>
    </div>
    <div class="disasters-list">
      <div v-if="!filteredDisasters.length" class="empty-state">
        No disasters match the current filters.
      </div>
      <a
        v-for="d in filteredDisasters"
        :key="d.id"
        class="disaster-item"
        @click="goToDisaster(d.id)"
      >
        <div class="disaster-header">
          <div class="disaster-header-left">
            <img class="type-icon" :src="getTypeIcon(d.type)" :alt="d.type" />
            <span class="disaster-name">{{ d.name }}</span>
          </div>
          <img src="@/assets/img/right-arrow.svg" />
        </div>
        <div class="disaster-info">
          <div class="info-row">
            <span class="info-label">Region</span>
            <span class="info-value">{{ getRegion(d.isoCodes) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Country</span>
            <span class="info-value">{{ getCountry(d.isoCodes) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Type</span>
            <span class="info-value type-value">
              <img class="info-type-icon" :src="getTypeIcon(d.type)" :alt="d.type" />
              {{ getTypeName(d.type) }}
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Dates</span>
            <span class="info-value">{{ formatDateRange(d.dateStart, d.dateEnd) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status</span>
            <span class="info-value">
              <span :class="['badge', d.isArchived ? 'badge-archived' : 'badge-live']">
                {{ d.isArchived ? 'Inactive' : 'Active' }}
              </span>
            </span>
          </div>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { settings } from '../../constants/settings'
import { getDisasterRegion, getCountryName } from '../../constants/geoRegions'
import { useArchiveMode } from '../composables/useArchiveMode'

dayjs.extend(utc)

interface Disaster {
  id: string
  name: string
  type: string
  dateStart: string
  dateEnd: string
  isoCodes: string
  isPublic: string | null
  isArchived: string | null
}

const store = useStore()
const { archiveMode, filters } = useArchiveMode()

const navbarOpen = computed<boolean>(() => store.state.navbarOpen)
const reportVisible = computed<boolean>(() => store.state.reportVisible)
const allDisasters = computed<Disaster[]>(() => store.state.disasters)

const filteredDisasters = computed<Disaster[]>(() => {
  return allDisasters.value
    .filter(d => d.isPublic)
    .filter(d => !filters.regions.length || filters.regions.includes(getDisasterRegion(d.isoCode) ?? ''))
    .filter(d => !filters.types.length || filters.types.includes(d.type))
    .filter(d => !filters.name || d.name.toLowerCase().includes(filters.name.toLowerCase()))
    .filter(d => !filters.dateStart || dayjs.utc(d.dateEnd) >= dayjs(filters.dateStart))
    .filter(d => !filters.dateEnd || dayjs.utc(d.dateStart) <= dayjs(filters.dateEnd))
    .filter(d => !filters.activeOnly || !d.isArchived)
    .sort((a, b) => dayjs(b.dateStart).unix() - dayjs(a.dateStart).unix())
})

function getTypeIcon(type: string): string {
  return (settings.disasterTypes as { id: string; icon: string }[]).find(t => t.id === type)?.icon ?? ''
}

function getRegion(isoCodes: string): string {
  return getDisasterRegion(isoCodes) ?? isoCodes
}

function getCountry(isoCodes: string): string {
  return isoCodes
    .split(',')
    .map(code => getCountryName(code.trim()) ?? code.trim())
    .join(', ')
}

function getTypeName(type: string): string {
  return (settings.disasterTypes as { id: string; name: string }[]).find(t => t.id === type)?.name ?? type
}

function formatDateRange(dateStart: string, dateEnd: string): string {
  const start = dayjs.utc(dateStart).format('MM/YYYY')
  const end = dayjs.utc(dateEnd).format('MM/YYYY')
  return start === end ? start : `${start} – ${end}`
}

function goToDisaster(disasterId: string) {
  store.dispatch('switchDisaster', disasterId)
}
</script>

<style lang="scss" scoped>
@use "../variables.scss";

.archive-panel {
  position: fixed;
  top: 0;
  left: variables.$nav-bar-width;
  bottom: 0;
  width: 300px;
  background: variables.$dark-blue;
  z-index: 999;
  display: flex;
  flex-direction: column;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
  padding: 1rem;
  padding-top: 2rem;
  gap: 1rem;

  @media print {
    display: none !important;
  }
}

.panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.panel-title {
  font-weight: 400;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: white;
}

.result-count {
  font-size: 0.75em;
  color: white;
}

.disasters-list {
  overflow-y: auto;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
}

.empty-state {
  padding: 32px 16px;
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
}

.disaster-item {
  border: 1px solid rgba(variables.$light-grey, 0.30);
  border-radius: 0.625rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  text-decoration: none;

  &:hover {
    border-color: white;
  }
}

.disaster-header {
  color: white;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem;
  gap: 0.5rem;
}

.disaster-header-left {
  color: white;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.type-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.disaster-info {
  display: flex;
  flex-direction: column;
  background: variables.$light-grey;
  border-bottom-left-radius: 0.625rem;
  border-bottom-right-radius: 0.625rem;
  padding: 0.5rem;
  gap: 0.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: 0.8rem;
}

.info-label {
  color: variables.$dark-blue;
  font-weight: 500;
  flex-shrink: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  color: #1e2d5a;
  text-align: right;
  font-weight: 400;
}

.type-value {
  display: flex;
  align-items: center;
  gap: 4px;
}

.info-type-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  filter: brightness(0) saturate(100%) invert(12%) sepia(98%) saturate(840%) hue-rotate(204deg)
    brightness(94%) contrast(96%);
}

.disaster-name {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 0.9rem;
}

.badge {
  flex-shrink: 0;
  font-weight: 500;
}

.badge-archived {
  font-weight: 400;
}

.badge-live {
  color: #209622;
}
</style>
