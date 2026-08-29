<template>
  <div class="logos">
    <a href="https://www.aidmi.org/" class="logo-link">
      <img class="logo logo-aidmi" src="@/assets/img/aidmi-logo.png" alt="All India Disaster Mitigation Institute">
    </a>
    <span class="logo-sep" aria-hidden="true"></span>
    <a href="https://crisisready.io/" class="logo-link">
      <img class="logo logo-cr" src="@/assets/img/crisis-ready-logo-lg.png" alt="CrisisReady">
    </a>
  </div>
</template>

<script>
export default {
}
</script>

<style lang="scss" scoped>
@use "../variables.scss";
.logos {
  display: flex;
  align-items: center;
  gap: 22px;
}

.logo-link {
  display: flex;
  align-items: center;
  height: 100%;
}

.logo-sep {
  width: 1px;
  align-self: stretch;
  min-height: 44px;
  background: variables.$light-grey;
}

.logo {
  width: auto;
}

/* the source PNG has wide margins, so it's shown taller to balance the wordmark */
.logo-aidmi {
  height: 116px;
}

.logo-cr {
  height: 48px;
  max-width: 360px;
}
</style>
