<template>
  <div class="wrapper">
    <a @click="toggleMenu">
      <div :class="`open-menu-link ${menuOpen ? 'menu-open' : 'menu-closed'}`">
        <div class="title">
          <span>{{ countryName }}</span>
          <span>{{ menuOpen ? '-' : '+' }}</span>
        </div>
      </div>
    </a>
    <div v-if="menuOpen" class="disasters-list">
      <a :class="`disaster-link ${d.id === disasterId ? 'disaster-link-active' : ''}`" v-for="d in disastersLive" :key="d.id" @click="goToDisaster(d.id)">
        <div class="left">
          <img class="type-icon" :src="getTypeIcon(d.type)">
          <span class="name">{{ d.name }}</span>
        </div>
        <span class="disaster-date">{{ formatDate(d.dateStart) }}</span>
      </a>
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import * as d3 from 'd3'
import { mapState } from 'vuex'
import { settings } from '../../constants/settings'

dayjs.extend(utc)

export default {
  name: 'NavbarCountrySelector',

  props: {
    countryName: String,
    disasters: Array,
  },

  data() {
    return {
      menuOpen: this.disasters?.length > 0,
    }
  },

  computed: {
    ...mapState(['disasterId']),
    disastersLive() {
      return this.disasters
        .filter(d => !d.isArchived)
        .sort((a, b) => d3.descending(a?.dateStart, b?.dateStart))
    },
    disastersArchived() {
      return this.disasters
        .filter(d => d.isArchived)
        .sort((a, b) => d3.descending(a?.dateStart, b?.dateStart))
    },
  },

  methods: {
    toggleMenu() {
      this.menuOpen = !this.menuOpen
    },

    goToDisaster(disasterId) {
      this.$store.dispatch('switchDisaster', disasterId)
    },

    getTypeIcon(type) {
      return settings.disasterTypes.find(({ id }) => id === type)?.icon
    },

    formatDate(dateStart) {
      return dayjs.utc(dateStart).format('YYYY')
    },
  }
}
</script>

<style lang="scss" scoped>
@use "../variables.scss";
.wrapper {
  margin-bottom: 2px;
}

.title {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: space-between;
}

.open-menu-link {
  padding: 5px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.open-menu-link.menu-closed:hover {
  background: rgba(255, 255, 255, 0.15);
}

.open-menu-link.menu-open:hover {
  background: rgba(255, 255, 255, 0.25);
}

.disasters-list {
  color: white;
  display: flex;
  flex-direction: column;
  border-radius: 0 0 4px 4px;
  padding: 4px 0;
  overflow: hidden;
}

.disaster-link {
  margin-left: 1rem;
  margin-right: 0.25rem;
  display: flex;
  align-items: center;
  color: white;
  text-decoration: none;
  font-size: 0.9em;
  font-weight: 500;
  padding: 4px 4px;
  cursor: pointer;
  justify-content: space-between;
  overflow: hidden;
  border-radius: 3px;
}

.disaster-link:hover {
  background: variables.$dark-blue;
}

.disaster-link-active {
  background: variables.$dark-blue;
}

.disaster-link .left {
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
  align-items: center;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type-icon {
  height: 13px;
  width: 13px;
  flex-shrink: 0;
}

.disaster-date {
  font-size: 0.9em;
  font-weight: 300;
}

.disasters-separator {
  color: white;
  font-size: 11px;
  font-weight: normal;
  text-transform: uppercase;
  margin: 0 12px;
  padding-top: 0.5em;
}

.disasters-separator-border {
  border-bottom: 1px solid variables.$medium-blue;
}
</style>
