<template>
  <div class="wrapper">
    <a @click="toggleMenu">
      <div :class="`open-menu-link ${menuOpen ? 'menu-open' : 'menu-closed'}`">
        <div class="title">
          <span style="font-weight: 500;">{{ regionName }}</span>
          <span style="font-weight: 500;">{{ menuOpen ? '-' : '+' }}</span>
        </div>
      </div>
    </a>
    <div v-if="menuOpen" class="countries-list">
      <NavbarCountrySelector
        v-for="country in countries"
        :key="country.isoCode"
        :countryName="country.name"
        :disasters="country.disasters"
      />
    </div>
  </div>
</template>

<script>
import { getCountryName } from '../../constants/geoRegions'
import NavbarCountrySelector from './NavbarCountrySelector.vue'
import { mapGetters } from 'vuex'

export default {
  name: 'NavbarRegionSelector',

  components: {
    NavbarCountrySelector,
  },

  props: {
    regionName: String,
    disasters: Array,
  },

  data() {
    return {
      menuOpen: true,
    }
  },

  computed: {
    ...mapGetters([
      'getDisasterPrimaryIsoCode',
    ]),
    countries() {
      const groups = {}
      for (const d of this.disasters) {
        const primaryCode = this.getDisasterPrimaryIsoCode(d)
        if (!groups[primaryCode]) {
          groups[primaryCode] = { isoCode: primaryCode, name: getCountryName(d.isoCodes), disasters: [] }
        }
        groups[primaryCode].disasters.push(d)
      }
      return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))
    },
  },

  methods: {
    toggleMenu() {
      this.menuOpen = !this.menuOpen
    },
  },
}
</script>

<style lang="scss" scoped>
.wrapper {
  margin-bottom: 0.5em;
  --border-radius: 8px;
}

.title {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: space-between;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.open-menu-link {
  padding: 0.5rem;
  border-radius: var(--border-radius);
  cursor: pointer;
}

.open-menu-link.menu-open {
  border-radius: var(--border-radius) var(--border-radius) 0 0;
  border: 1px solid rgba(214, 221, 235, 0.30);
}

.open-menu-link.menu-open:hover {
  background: rgba(214, 221, 235, 0.5);
}

.countries-list {
  background: rgba(214, 221, 235, 0.30);
  border-radius: 0 0 var(--border-radius) var(--border-radius);
}
</style>
