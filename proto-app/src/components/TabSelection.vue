<template>
  <div class="tab-group">
    <div
      v-for="tab in mapTabs.tabs"
      :key="tab.name"
      class="tab-container"
      :style="{ flexGrow: tab.id === 'people' ? 1 : 0 }"
      :class="{ toggled: currentTab === tab.id }"
      @click="setTab(tab.id)">
      <div class="tab">{{ tab.name }}</div>
    </div>
    <div class="tab-container" @click="setTab('settings')" :class="{ toggled: currentTab === 'settings' }">
      <div class="tab" v-show="currentTab !== 'settings'"><img style="width: 14px" src="@/assets/img/settings.png" /></div>
      <div class="tab" v-show="currentTab === 'settings'"><img style="width: 14px" src="@/assets/img/settings-selected.png" /></div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

import { mapTabs } from '../../constants/mapTabs'

export default {
  name: 'TabSelection',

  components: {
  },

  data() {
    return {
    }
  },

  computed: {
    ...mapState([
      'currentTab',
      'disasterConfig',
    ]),
    ...mapGetters([
      'disasterType',
    ]),
    mapTabs() {
      // The News tab only exists for disasters whose config opts in (hasNewsSources).
      // Every other event would show an empty tab, so filter it out.
      const base = this.disasterConfig?.hasNewsSources
        ? mapTabs.tabs
        : mapTabs.tabs.filter(tab => tab.id !== 'news')
      if (this.disasterType === 'heat') {
        return {
          tabs: base.map(tab => {
            if (tab.id === 'movement') return { id: 'heat', name: 'Heat' }
            return tab
          })
        }
      }
      return { tabs: base }
    },
  },

  watch: {

  },

  methods: {
    ...mapMutations([
      'setTab',
    ]),
  }
}
</script>

<style lang="scss" scoped>
@use '../variables.scss';

.tab-group {
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  padding: 0px 10px;
  height: variables.$tabs-height;
}

.tab-container {
  text-align: center;
  font-weight: 600;
  font-size: 13px;
  white-space: nowrap;
  text-transform: uppercase;
  color: variables.$grey;
  cursor: pointer;
  border-bottom: 1px solid #D8D8D8;

  &:not(:first-child), &:not(:last-child) {
    padding: 0px 6px;
  }

  .tab {
    display: inline-block;
    padding-bottom: 7px;
    padding-top: 11px;
  }

  &.toggled {
    .tab {
      color: variables.$orange;
      border-bottom: 2px solid variables.$orange;  
    }
  }

  &:hover {
    color: variables.$orange;
  }
}
</style>
