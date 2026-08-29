<template>
  <AppModal v-if="dataSourcesModalVisible" title="Data & sources" @close="setDataSourcesModalVisible(false)">
    <div class="ds">
      <p class="lead">
        Every layer here comes from a different organisation, method, and moment in time.
        This is rapid-response data compiled while the event was still unfolding — figures change,
        sources disagree, and <b>absence of data is not absence of impact</b>. Use it to prioritise
        assessment and cross-check field reports, not as ground truth.
      </p>

      <section>
        <h3>Observed flood extent</h3>
        <ul>
          <li><b>HOT — observed</b> (27 Aug): corridor-wide inundation ribbon from satellite imagery.</li>
          <li><b>Copernicus EMSR927</b> (28 Aug): rapid mapping over two areas (Syabrubesi, Timure).</li>
          <li><b>UNOSAT (Charter #1052)</b> (imagery 27 Aug, publ. 28 Aug): mudflow/rockflow extent across Rasuwa &amp; Nuwakot.</li>
        </ul>
        <p class="caveat">Each source maps a different footprint by a different method, so the extents don't match. "Observed" means where imagery happened to catch water or mud — not the full reach of the flood.</p>
      </section>

      <section>
        <h3>Building damage</h3>
        <ul>
          <li><b>HOT fAIr (AI damage)</b> (28 Aug): automated, per-building damage class from AI.</li>
          <li><b>Copernicus EMSR927</b> (28 Aug): rapid-mapping damage grades.</li>
          <li><b>Microsoft / UNOSAT</b> (27 Aug): Microsoft building footprints tagged with UNOSAT's damage read (~4,977).</li>
          <li><b>UNOSAT (affected)</b> (27 Aug): UNOSAT's own affected-buildings layer (~4,983).</li>
          <li><b>OSM destroyed</b> (29 Aug): buildings tagged destroyed in OpenStreetMap.</li>
        </ul>
        <p class="caveat"><b>"Microsoft / UNOSAT" and "UNOSAT (affected)" are near-duplicates of the same UNOSAT assessment</b> — they differ mainly in whose building geometry sits underneath, so don't add them together. Each source uses its own damage vocabulary; the HOT fAIr layer is AI-generated and unverified. Totals vary by source and method — compare, don't sum across sources.</p>
      </section>

      <section>
        <h3>Bridges &amp; roads</h3>
        <ul>
          <li><b>Bridges — ICIMOD</b> (27 Aug, field-reported) and <b>Copernicus EMSR927</b> (28 Aug).</li>
          <li><b>Roads — Copernicus EMSR927</b> (28 Aug): damaged length by grade; undamaged stretches excluded.</li>
        </ul>
        <p class="caveat">Statuses are normalised to one scale so sources can be compared; each source's original wording is kept in the marker pop-up.</p>
      </section>

      <section>
        <h3>Flood gauges — Google FloodHub</h3>
        <p class="caveat">FloodHub models <i>riverine</i> flooding from gauge forecasts. This disaster was a <b>glacial-lake outburst flash flood (GLOF)</b>, which those models don't capture — so the gauges show little inundation despite severe impact on the ground. Treat as directional context only.</p>
      </section>

      <section>
        <h3>Population movement — Meta</h3>
        <p class="caveat">Aggregated, privacy-preserving mobility and population-density estimates from Meta (Facebook) app users — a sample, not the whole population, with gaps where data is sparse. Read as relative change, not headcount.</p>
      </section>

      <section>
        <h3>News Sources</h3>
        <p>Facts extracted from news media — casualties &amp; displacement, infrastructure, access, shelters, aid, hazards and damage — each attributed to its outlet(s), with location drawn only as precisely as the source allowed (an exact place, or a whole district/province).</p>
        <p class="caveat"><b>Coverage is not impact.</b> The most-reported places are not the worst-hit — here the hardest-hit areas often went dark. Figures are what outlets reported (with the number of independent sources shown), never verified counts. Use to prioritise assessment and cross-check field reports — never as the sole basis for allocating relief.</p>
      </section>

      <section>
        <h3>Base layers</h3>
        <p class="caveat">Administrative boundaries: geoBoundaries / Common Operational Datasets (COD). Basemap: OpenFreeMap / OpenStreetMap.</p>
      </section>

      <p class="foot">Questions or corrections: <a href="mailto:support@aidmi.org">support@aidmi.org</a></p>
    </div>
  </AppModal>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import AppModal from './AppModal.vue'

export default {
  name: 'DataSourcesModal',
  components: { AppModal },
  computed: {
    ...mapState(['dataSourcesModalVisible']),
  },
  methods: {
    ...mapMutations(['setDataSourcesModalVisible']),
  },
}
</script>

<style lang="scss" scoped>
.ds {
  text-align: left;
  font-size: 14px;
  line-height: 1.5;
  color: #222;

  .lead { margin: 0 0 18px; }

  section { margin-bottom: 18px; }

  h3 {
    font-size: 15px;
    margin: 0 0 6px;
    color: #111;
  }

  ul { margin: 0 0 6px; padding-left: 20px; }
  li { margin-bottom: 3px; }

  .caveat {
    font-size: 13px;
    color: #555;
    background: #f6f6f4;
    border-left: 3px solid #d8d3c4;
    border-radius: 0 4px 4px 0;
    padding: 7px 10px;
    margin: 4px 0 0;
  }

  .foot {
    border-top: 1px solid #eee;
    padding-top: 12px;
    margin-top: 6px;
    font-size: 13px;
    color: #444;
  }
}
</style>
