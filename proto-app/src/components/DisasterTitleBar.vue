<template>
  <div class="disaster-title">
    <div class="left">
      <img :src="disasterIconByType(disasterType)">
      <h1>{{ selectedDisasterShortName }}</h1>  
    </div>
    <div class="right">
      <div class="countries">{{ countries }}</div>
      <div class="date-type">{{ dateRange }} · {{ disasterTypeName }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from 'vuex'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { settings } from '../../constants/settings'

dayjs.extend(utc)

const store = useStore()

const disasterType = computed<string>(() => store.getters.disasterType)
const selectedDisasterShortName = computed<string>(() => store.getters.selectedDisasterShortName)
const disasterIconByType = store.getters.disasterIconByType as (type: string) => string

const countries = computed<string>(() => {
  const codes: string[] = store.getters.disasterIsoCodes ?? []
  if (codes.length <= 3) return codes.join(', ')
  return `${codes[0]} +${codes.length - 1}`
})

const disasterTypeName = computed<string>(() =>
  settings.disasterTypes.find((t: { id: string }) => t.id === disasterType.value)?.name ?? ''
)

const dateRange = computed<string>(() => {
  const end = dayjs.utc(store.getters.disasterDateEnd)
  if (!end.isValid()) return ''
  return end.format('MMM YYYY')
})
</script>

<style lang="scss" scoped>
@use '../variables.scss';

.disaster-title {
  border-radius: 6px 6px 0 0;
  height: variables.$disaster-title-bar-height;
  color: white;
  background: variables.$dark-blue;
  padding: 0px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h1 {
    font-size: 20px;
    margin-left: 10px;
  }
}

.left {
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
}

.right {
  font-size: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  text-align: right;
}
</style>
