<template>
  <AppModal v-if="aboutModalVisible" title="About ReadyMapper" @close="setAboutModalVisible(false)">
    <div v-html="compiledAbout" />
    <h3>Get in touch</h3>
    <p>Contact us at <a href="mailto:info@crisisready.io">info@crisisready.io</a>.</p>
    <Logos />
  </AppModal>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import { marked } from 'marked'

import AppModal from './AppModal.vue'
import Logos from './Logos.vue'

export default {
  name: 'AboutModal',

  components: {
    AppModal,
    Logos,
  },

  computed: {
    ...mapState([
      'aboutModalVisible',
      'aboutData',
    ]),
    compiledAbout() {
      if (!this.aboutData) { return }
      return marked(this.aboutData)
    },
  },

  methods: {
    ...mapMutations([
      'setAboutModalVisible',
    ]),
  },
}
</script>
