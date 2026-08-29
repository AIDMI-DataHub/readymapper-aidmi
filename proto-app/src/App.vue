<template>
  <router-view/>
</template>

<style lang="scss">
@use './variables.scss';

html, body {
  margin: 0px;

  // This is important for making div background colors show up when printing the report
  -webkit-print-color-adjust: exact !important;

  --font-family-primary: Rubik, Helvetica, Arial, sans-serif;
}

#app {
  font-family: var(--font-family-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.mapboxgl-canvas {
  outline: none !important;
}

#nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}

button {
  background: none;
  border: none;
  color: variables.$vibrant-blue;
  cursor: pointer;
  font-weight: bold;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    color: rgba(variables.$vibrant-blue, 0.9);
  }
}

// ---- News Sources popup (mapbox popup DOM is outside Vue scope, so global) ----
.news-popup-wrap .mapboxgl-popup-content {
  padding: 12px 13px 11px 13px;
  border-radius: 7px;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.22);
}
.news-popup {
  text-align: left;
  max-height: 340px;
  overflow-y: auto;

  .nf-head {
    font-weight: 700;
    font-size: 13px;
    color: #111;
    margin-bottom: 6px;
    padding-bottom: 5px;
    border-bottom: 1px solid #eee;
  }
  .nf-sep { height: 1px; background: #eee; margin: 9px 0; }
  .nf-geo { font-size: 11px; color: #666; font-style: italic; margin-bottom: 5px; line-height: 1.35; }
  .nf-fact {
    display: flex; align-items: baseline; gap: 6px;
    font-size: 13px; font-weight: 600; color: #1a1a1a; line-height: 1.35; margin-bottom: 5px;
  }
  .nf-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; position: relative; top: 1px; }
  .nf-meta { font-size: 11px; color: #555; margin-bottom: 4px; }
  .nf-warn { font-size: 11px; color: #8a5a00; background: #fff4d6; border-radius: 4px; padding: 3px 6px; margin: 4px 0; line-height: 1.35; }
  .nf-origin { font-size: 11.5px; color: #444; margin-bottom: 4px; }
  .nf-conf { font-size: 11.5px; color: #444; margin-bottom: 5px; line-height: 1.35; b { color: #222; } }
  .nf-quote {
    font-size: 12px; color: #333; line-height: 1.4;
    margin: 5px 0; padding: 4px 0 4px 9px; border-left: 3px solid #ddd;
  }
  .nf-orig { font-size: 11px; color: #666; line-height: 1.4; margin: 0 0 5px 9px; }
  .nf-badge {
    font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.04em;
    color: #777; background: #f0f0f0; border-radius: 3px; padding: 1px 4px; white-space: nowrap;
  }
  .nf-src { font-size: 11px; color: #888; margin-top: 5px; }
}

.circle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 100%;
  width: 20px;
  height: 20px;
  flex-shrink: 0;

  &.solid {
    background: variables.$vibrant-blue;
    &:hover {
      background: #0064DA;
    }
  }

  &.empty {
    border: 1px solid variables.$vibrant-blue;
    &:hover {
      background: rgba(variables.$vibrant-blue, 0.1);
    }
  }

  &.grey {
    background: variables.$grey;
  }
}

</style>
