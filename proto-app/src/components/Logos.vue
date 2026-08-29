<template>
  <div class="logos">
    <a href="https://crisisready.io/">
      <img class="logo" src="@/assets/img/crisis-ready-logo-lg.png">
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

  a {
    height: 100%;
  }

  img {
    max-width: 400px;
  }
}

.logos-sub {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-left: 2px solid variables.$light-grey;
  margin-left: 1em;
  padding-left: 1em;

  a {
    &:last-child {
      padding-top: 8px;
    }
  }
}

.logo {
  height: 100%;
}
</style>
