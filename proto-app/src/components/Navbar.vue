<template>
  <nav :class="`nav-container ${navbarOpen ? 'nav-open': 'nav-closed'} ${reportVisible ? 'report-visible' : 'report-not-visible'}`">
    <div class="nav-wrapper">
      <div class="content">
        <div :class="`logo-container ${!navbarOpen && 'justify-center'}`" @click="toggleOpen">
          <img style="height: 30px; width: 21px;" src="@/assets/img/ready-mapper-logo.png">
          <p v-if="navbarOpen" class="nav-title"><span class="b">Ready</span>Mapper</p>
        </div>
        <div v-if="navbarOpen" class="disaster-selection-container">
          <DisasterArchiveFilters v-if="archiveMode" />
          <NavbarRegionSelector
            v-else
            v-for="region in regionsWithDisasters"
            :key="region.name"
            :regionName="region.name"
            :disasters="region.disasters"
          />
        </div>
        <div v-else @click="toggleOpen" class="disaster-selection-collapsed">
          <img v-if="archiveMode" src="@/assets/img/disaster-archive.svg" />
          <img v-else src="@/assets/img/main-navigation.svg" />
        </div>
      </div>
      <div :class="['footer', { collapsed: !navbarOpen }]">
        <div class="contact-info" @click="setAboutModalVisible(true)">
          <button><img src="@/assets/img/info-icon.svg" /></button>
          <a v-if="navbarOpen">About ReadyMapper</a>
        </div>
        <div v-if="navbarOpen" class="mode-tabs" style="margin-bottom: 16px">
          <button v-if="archiveMode" :class="['mode-tab', { 'mode-tab-active': !archiveMode }]" @click="archiveMode = false">
            Main Navigation
            <img src="@/assets/img/main-navigation.svg" />
          </button>
          <button v-else :class="['mode-tab', { 'mode-tab-active': archiveMode }]" @click="archiveMode = true">
            Disaster Archive
            <img src="@/assets/img/disaster-archive.svg" />
          </button>
        </div>
        <div v-else class="mode-tabs-collapsed">
          <img
            v-if="!archiveMode"
            src="@/assets/img/disaster-archive.svg"
            @click="openArchive"
          />
          <img
            v-else
            src="@/assets/img/main-navigation.svg"
            @click="openMainNavigation"
          />
        </div>

        <div class="footer-wrapper" :style="navbarOpen ? 'align-self: flex-end;' : ''">
          <button class="toggle-button" @click="toggleOpen">
            <img v-if="!navbarOpen" aria-label="Open navbar" style="height:
            20px; width: 20px;" src="@/assets/img/navbar-arrow.png">
            <img v-if="navbarOpen" aria-label="Close navbar" style="height:
            20px; width: 20px;" src="@/assets/img/navbar-arrow-close.png">
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

import NavbarRegionSelector from '../components/NavbarRegionSelector.vue'
import DisasterArchiveFilters from '../components/DisasterArchiveFilters.vue'
import { GEO_REGIONS, getDisasterRegion } from '../../constants/geoRegions'
import { useArchiveMode } from '../composables/useArchiveMode'

export default {
  name: 'Navbar',

  components: {
    NavbarRegionSelector,
    DisasterArchiveFilters,
  },

  setup() {
    const { archiveMode } = useArchiveMode()
    return { archiveMode }
  },

  data() {
    return {
      navbarOpen: false,
    }
  },

  computed: {
    ...mapState([
      'disasters',
      'reportVisible',
      'pickMapViewScreen',
    ]),
    regionsWithDisasters() {
      const publicDisasters = this.disasters.filter(d => d.isPublic && !d.isArchived)
      return GEO_REGIONS
        .map(r => ({
          name: r.name,
          disasters: publicDisasters.filter(d => getDisasterRegion(d.isoCodes) === r.name),
        }))
        .filter(r => r.disasters.length > 0)
    },
  },

  watch: {
    navbarOpen(value) {
      this.setNavbarOpen(value)
    },
    archiveMode(value) {
      if (value) {
        this.navbarOpen = true
      }
    },
  },

  methods: {
    ...mapMutations([
      'setNavbarOpen',
      'setAboutModalVisible'
    ]),

    toggleOpen() {
      this.navbarOpen = !this.navbarOpen
    },

    openNavbar() {
      this.navbarOpen = true
    },

    openArchive() {
      this.navbarOpen = true
      this.archiveMode = true
    },

    openMainNavigation() {
      this.navbarOpen = true
      this.archiveMode = false
    },
  }
}
</script>

<style lang="scss" scoped>
@use "../variables.scss";

.nav-container {
  top: 0;
  bottom: 0;
  position: fixed;
  z-index: 1000;
  background: variables.$dark-blue;
  transition: width 0.1s ease 0s;

  &.report-visible {
    display: none;
  }

  @media print {
    display: none !important;
  }
}

.nav-closed {
  width: variables.$nav-bar-closed-width;
}

.nav-open {
  width: variables.$nav-bar-width;
}

.nav-wrapper {
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding: 0 1em;
  overflow-y: auto;
}

.content {
  display: flex;
  flex-direction: column;
  justify-content: flex-start; 
  padding-top: 25px;
  gap: 15px; 
}

.footer {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 25px;
}

.footer.collapsed {
  align-items: center;
}

.footer-wrapper {
  display: flex;
}

.logo-container {
  display: flex;
  align-items: center;
  margin-bottom: 1em;
  cursor: pointer;
}

.nav-title {
  font-size: 20px;
  margin: 0 0 0 0.5em;
}

.b {
  font-weight: bold;
}

.disaster-selection-container {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.disaster-selection-collapsed img {
  width: 1.1rem;
  height: 1.1rem;
}

.subtitle {
  text-transform: uppercase;
  font-size: 12px;
  font-weight: 500;
}

.justify-center {
  justify-content: center;
}

.contact-info {
  display: flex;
  align-items: center;
  cursor: pointer;

  a {
    margin-left: 10px;
    color: white;
    text-decoration: none;
    font-size: 14px;
  }
} 

.mode-tabs {
  display: flex;
  flex-direction: column;
}

.mode-tabs-collapsed {
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}

.mode-tabs-collapsed img {
  width: 0.9rem;
  height: 0.9rem;
}


.mode-tab {
  flex: 1;
  padding: 5px 4px;
  font-size: 0.8rem;
  border-radius: 4px;
  color: white;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 400;
  transition: background 0.1s, color 0.1s;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  &:hover {
    color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.08);
  }
}

.mode-tab-active {
  background: rgba(255, 255, 255, 0.15);
  color: white;
}
</style>
