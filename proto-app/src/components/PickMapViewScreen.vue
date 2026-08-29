<template>
  <div v-if="pickMapViewScreen" :class="`modal-wrapper ${navbarOpen ? 'nav-open' : 'nav-closed'}`">
    <div class="modal-container">
      <div class="modal">
        <p class="message">Move / zoom the map to select a different view for the report</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'

export default {
  name: 'PickMapViewScreen',

  components: {
  },

  computed: {
    ...mapState([
      'navbarOpen',
      'pickMapViewScreen',
    ]),
    ...mapGetters([
    ]),
  },

  data() {
    return {
    }
  },

  props: {
  },

  methods: {
    ...mapMutations([
    ]),
  },
}
</script>

<style lang="scss" scoped>
@use "../variables.scss";
$margin: 16px;

.modal-wrapper {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: transparent;
  z-index: 2;
  border: 5px dashed variables.$orange;
  margin: $margin;
  margin-left: variables.$nav-bar-closed-width + $margin;
  pointer-events: none;

  &.nav-open {
    margin-left: variables.$nav-bar-width + $margin;
  }
}

.modal-container {
  display: flex;
  align-items: top;
  justify-content: center;
}

.modal {
  height: fit-content;
  max-width: 500px;
  min-width: 300px;
  color: variables.$orange;
  text-align: center;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.8);
  padding: 0.5em;
  margin-top: 0.25em;
  border-radius: 0.75em;

  p {
    margin: 0;
  }
}

</style>
