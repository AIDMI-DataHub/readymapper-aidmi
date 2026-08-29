<template>
  <div class="archive-filters">
    <div class="filter-group checkbox-group">
      <span class="group-label">
        Region
        <img src="@/assets/img/filter.svg" />
      </span>
      <div class="checkbox-list">
        <label v-for="r in regions" :key="r.name" class="checkbox-item">
          {{ r.name }}
          <input type="checkbox" :value="r.name" v-model="filters.regions" />
        </label>
      </div>
    </div>
    <div class="filter-group checkbox-group">
      <span class="group-label">
        Disaster Type
        <img src="@/assets/img/filter.svg" />
      </span>
      <div class="checkbox-list">
        <label v-for="t in disasterTypes" :key="t.id" class="checkbox-item">
          <div class="checkbox-item-left">
            <img class="type-icon" :src="t.icon" :alt="t.name" />
            {{ t.name }}
          </div>
          <input type="checkbox" :value="t.id" v-model="filters.types" />
        </label>
      </div>
    </div>
    <div class="filter-group">
      <span class="group-label">Name</span>
      <input v-model="filters.name" type="text" placeholder="Search…" />
    </div>
    <div class="filter-group">
      <span class="group-label">Dates</span>
      <div class="date-range">
        <input v-model="filters.dateStart" type="date" :max="filters.dateEnd || undefined" />
        <span class="date-sep">to</span>
        <input v-model="filters.dateEnd" type="date" :min="filters.dateStart || undefined" />
      </div>
    </div>
    <div class="filter-group">
      <span class="group-label">Status</span>
      <label class="active-only-item">
        Active disasters only
        <input type="checkbox" v-model="filters.activeOnly" />
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useStore } from 'vuex'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
import { GEO_REGIONS } from '../../constants/geoRegions'
import { settings } from '../../constants/settings'
import { useArchiveMode } from '../composables/useArchiveMode'

const store = useStore()
const { filters } = useArchiveMode()
const regions = GEO_REGIONS
const disasterTypes: { id: string; name: string; icon: string }[] = settings.disasterTypes

watch(
  () => store.state.disasters as { dateStart: string; isPublic: string | null }[],
  (disasters) => {
    if (!disasters?.length || filters.dateStart) return
    const start = disasters.filter(d => d.isPublic).map(d => d.dateStart).sort()[0]
    filters.dateStart = dayjs.utc(start).format('YYYY-MM-DD')
    filters.dateEnd = dayjs.utc().format('YYYY-MM-DD')
  },
  { immediate: true },
)
</script>

<style lang="scss" scoped>
@use "../variables.scss";
.archive-filters {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
}

.filter-group.checkbox-group {
  border: 1px solid rgba(variables.$light-grey, 0.30);
  border-radius: 0.625rem;
}

.group-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: white;
  font-weight: 500;
  padding: 0.5rem;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(variables.$light-grey, 0.30);
  border-bottom-left-radius: 0.625rem;
  border-bottom-right-radius: 0.625rem;
}

.type-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.checkbox-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  font-size: 13px;
  color: white;
  cursor: pointer;

  input[type='checkbox'] {
    appearance: none;
    width: 14px;
    margin: 0;
    height: 14px;
    flex-shrink: 0;
    border: 2px solid white;
    border-radius: 3px;
    background: white;
    cursor: pointer;
    position: relative;

    &:checked {
      background: variables.$dark-blue;
    }
  }
}

.active-only-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  font-size: 13px;
  padding-left: 0.5rem;
  color: white;
  cursor: pointer;

  input[type='checkbox'] {
    appearance: none;
    position: relative;
    width: 32px;
    height: 18px;
    flex-shrink: 0;
    margin: 0;
    border-radius: 9999px;
    background: variables.$light-grey;
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 0.2s;

    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #A6A6A6;
      transition: transform 0.2s;
    }

    &:checked {
      &::after {
        background: variables.$dark-blue;
        transform: translateX(14px);
      }
    }
  }
}

.checkbox-item-left {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.date-sep {
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
  font-size: 0.75rem;
  padding-left: 0.5rem;
}

select,
input[type='text'],
input[type='number'],
input[type='date'] {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  font-size: 13px;
  font-family: inherit;
  padding: 5px 8px;
  width: 100%;
  box-sizing: border-box;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  option {
    background: variables.$dark-blue;
    color: white;
  }

  &:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
  }
}

input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  opacity: 0.4;
}

input[type='date']::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: 0.5;
  cursor: pointer;
}
</style>
