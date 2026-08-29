<template>
  <div class="report-container">

    <div class="report-buttons" v-if="reportVisible && !reportSaved">
      <button class="no-print" @click="backToMap">Back to map</button>
      <button class="no-print" @click="setGenerateReportModalVisible(true)">Options</button>
      <button class="no-print action" @click="saveReport">Save report</button>
    </div>

    <div class="report-buttons" v-if="reportSaved">
      <button class="no-print" @click="editReport()">Edit report</button>
      <button class="no-print action white-border" @click="copyReportLink()">Copy link</button>
      <button class="no-print action" @click="printReport()">Print</button>
    </div>

    <div class="report-content">
      <header>
        <div style="margin-bottom: 40px;">
          <Logos />
        </div>

        <div class="report-title">{{ selectedDisasterName }} Situation Report for {{ dateHeader }}</div>
        <div class="report-date">Data last updated on {{ lastUpdatedDateTime }}</div>

        <ul class="sections-index">
          <li
            v-for="(section, index) in sections"
            :key="section.name"
          >
            {{ String(index + 1).padStart(2, '0') }} <a href="#" @click.prevent="scrollIntoView(section.name)"> {{section.name}} </a>
          </li>
        </ul>

        <ReportNotes :id="'summary'" title='Summary'/>
      </header>

      <!-- render report components dynamically based on order -->
      <component
        v-for="section in sections"
        :key="section.name"
        :is="section.componentName"
        :id="section.name"
        :dateHeader="dateHeader"
      />

      <footer class="footer" v-if="reportCreatedOn">
        <p>CrisisReady is a research response platform at the Harvard Data Science Initiative and Direct Relief that advances data-driven decision making in emergency response. Contact us at <a href="mailto:info.crisisready.io?subject=ReadyMapper Contact">info.crisisready.io</a> to get in touch.</p>
        <p>
          Report created on {{ reportCreatedOn }}
        </p>
      </footer>
    </div>
  </div>
</template>

<script>
  import { mapState, mapGetters, mapMutations } from 'vuex'

  import dayjs from 'dayjs'
  import utc from 'dayjs/plugin/utc'
  import timezone from 'dayjs/plugin/timezone'

  import { settings } from '../../constants/settings'

  import ReportDisasterSection from './ReportDisasterSection.vue'
  import ReportVulnerabilitySection from './ReportVulnerabilitySection.vue'
  import ReportMovementSection from './ReportMovementSection.vue'
  import ReportInfrastructureSection from './ReportInfrastructureSection.vue'
  import ReportCustomSection from './ReportCustomSection.vue'
  import ReportMobilityMatrixSection from './ReportMobilityMatrixSection.vue'
  import ReportNotes from './ReportNotes.vue'
  import Logos from './Logos.vue'

  dayjs.extend(utc)
  dayjs.extend(timezone)

  export default {
    name: 'Report',

    components: {
      ReportDisasterSection,
      ReportVulnerabilitySection,
      ReportMovementSection,
      ReportInfrastructureSection,
      ReportCustomSection,
      ReportNotes,
      Logos,
    },

    data() {
      return {
        reportMapImagesStyle: settings.reportMapImages
      }
    },

    computed: {
      ...mapGetters([
        'selectedDisasterName',
        'disasterDateEnd',
        'disasterDisplayTimeZone',
      ]),
      ...mapState([
        'reportVisible',
        'selectedDateTime',
        'regionTypeSelection',
        'selectedPlaceGeoids',
        'selectedCountyFips',
        'reportNotes',
        'reportSections',
        'vulnerabilityMetric',
        'disasterId',
        'reportCreatedOn',
      ]),

      sections() {
        return this.reportSections
          .filter(d => d.display === true)
          // guard against stale saved-report links that still name the removed News section
          .filter(d => d.name !== 'NewsSources')
          .map(d => {return {name: d.name, componentName: `Report${d.name}Section`}})
      },

      reportSaved() {
        return this.$route.query?.reportSaved
      },

      dateHeader() {
        return this.formatDateForDisplay(this.selectedDateTime)
      },

      lastUpdatedDateTime() {
        return this.formatDateForDisplay(this.disasterDateEnd)
      },
    },

    methods: {
      ...mapMutations([
        'setReportVisible',
        'setGenerateReportModalVisible',
        'setReportCreatedOn',
      ]),

      formatDateForDisplay(date) {
        if (!date) return
        let datetime = dayjs(date)
        if (this.disasterDisplayTimeZone) {
          datetime = datetime.tz(this.disasterDisplayTimeZone)
        }
        const day = datetime.format('MMM D, YYYY')
        const time = datetime.format('HH:mm z')
        return `${day} at ${time}`
      },

      saveReport() {
        const map = this.$store.state.map
        const ids = this.regionTypeSelection === "counties"
          ? this.selectedCountyFips
          : this.selectedPlaceGeoids
        const reportCreatedOn = this.formatDateForDisplay(dayjs())
        this.setReportCreatedOn(reportCreatedOn)
        let query = {
          disasterId: this.disasterId,
          vulnerabilityMetric: this.vulnerabilityMetric.id,
          date: dayjs(this.selectedDateTime).format(settings.timeFormatFBMobility),
          regionTypeSelection: this.regionTypeSelection,
          ids: ids,
          lng: map.getCenter().lng,
          lat: map.getCenter().lat,
          zoom: map.getZoom(),
          reportVisible: true,
          reportSaved: true,
          sections: [],
          reportCreatedOn: reportCreatedOn,
          // flood-impact source selections + custom layer visibility, so a saved
          // report reopens with the same tables and captured maps it was made with
          buildingDamageSource: this.$store.state.buildingDamageSource,
          buildingDamageMode: this.$store.state.buildingDamageMode,
          floodExtentSource: this.$store.state.floodExtentSource,
          bridgeDamageSource: this.$store.state.bridgeDamageSource,
          roadDamageSource: this.$store.state.roadDamageSource,
          hiddenMapLayerIds: this.$store.state.hiddenMapLayerIds,
          hiddenInfraTypes: this.$store.state.hiddenInfraTypes,
        }
        Object.keys(this.reportNotes).map(n => {
          query[`notes-${n}`] = this.reportNotes[n]
        })
        query['sections'] = this.reportSections
          .filter(d => d.display === true)
          .map((d, i) => `${d.name}_${i}` )
        this.$router.replace({query: { ...query }})
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
      editReport() {
        this.setReportCreatedOn(null)
        this.$router.replace({ query: {
          disasterId: this.disasterId,
          reportVisible: true,
          reportCreatedOn: null,
        }})
      },
      copyReportLink() {
        navigator.clipboard.writeText(window.location.href)
      },
      printReport() {
        window.print()
      },
      scrollIntoView(id) {
        document.querySelector(`#${id}`).scrollIntoView({ behavior: 'smooth' })
      },
      backToMap() {
        this.$router.replace({ query: { disasterId: this.disasterId } })
      }
    }
  }
</script>

<style lang="scss">
@use "../variables.scss";
.report-container {
  position: absolute;
  top: 0px;
  left: 0px;
  background: white;
  z-index: 50;
  right: 0px;
  bottom: 0px;

  .report-buttons {
    position: fixed;
    right: 40px;
    bottom: 40px;
    display: flex;
    flex-direction: row;

    a, button {
      cursor: pointer;
      margin: 0;
      padding: 0.5em 1em;
      background: #d7e2fd;
      color: variables.$dark-blue;
      font-size: 1em;
      font-weight: bold;
      border-top: 2px solid variables.$dark-blue;
      border-bottom: 2px solid variables.$dark-blue;
      border-left: none;
    }

    :last-child {
      border-right: 2px solid variables.$dark-blue;
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
    }
    :first-child {
      border-left: 2px solid variables.$dark-blue;
      border-top-left-radius: 10px;
      border-bottom-left-radius: 10px;
    }

    a {
      text-decoration: none;
    }

    .action {
      background: variables.$dark-blue;
      color: #fff;

    }
    .white-border {
      border-right: 2px solid #fff;
    }
  }

  .report-content {
    width: 800px;
    margin: 0px auto;
    text-align: left;
    margin-top: 60px;
  }

  .report-date {
    color: variables.$grey;
    font-weight: 500;
    margin-bottom: 6px;
  }

  .report-title {
    font-size: 24px;
    font-weight: bold;
  }

  .main-section-title {
    font-size: 18px;
    border-top: 3px solid;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 20px;
    padding-top: 2px;
  }

  .chunk-title {
    font-weight: bold;
    margin-top: 16px;
  }

  .chunk-subtitle {
    font-weight: bold;
    margin-top: 12px;
    margin: 0.75em 0 0 0;
  }

  .disaster {
    .main-section-title, .chunk-title {
      color: #FF5414;
    }
  }

  .vulnerability {
    .main-section-title, .chunk-title {
      color: #276BF6;
    }
  }

  .movement {
    .main-section-title, .chunk-title {
      color: #F2A63B;
    }
  }

  .infrastructure {
    .main-section-title, .chunk-title {
      color: #51B8F9;
    }
  }

  .custom {
    .main-section-title, .chunk-title {
      color: #6B7280;
    }
  }

  .line-chart-container {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    margin: 1em 0 0;
  }

  .line-chart-wrapper {
    margin-right: 0.5em;
    margin-bottom: 1.25em;

    p {
      font-size: 0.7em;
      margin: 0;
    }

    .line-chart {
      margin-bottom: 0 !important;
    }
  }

  .map-img {
    object-fit: cover;
    margin-top: 0.5em;
    flex-shrink: 0;
  }

  .map-legend {
    widows: 100%;
    margin: auto 0 0 0.5em;
  }
  .map-legend-title {
    margin-bottom: 0.5em;
  }
  .map-legend-subtitle {
    font-size: 85%;
    margin-top: 0.5em;
    margin-bottom: 0;
  }

  .sections-index {
    list-style-type: none;
    padding: 0;
    margin: 1.5em 0 0;

    li {
      margin: 0.5em 0;
      font-weight: bold;
    }

    a {
      text-decoration: underline;
      color: inherit;
    }
  }

  .footer {
    margin-top: 3em;
    padding-bottom: 2em;
    border-top: 1px solid variables.$grey;
    color: variables.$grey;
    font-style: italic;
  }

  @media print {
    .no-print {
      display: none !important;
    }
    .chunk {
      break-inside: avoid;
    }
  }
}
</style>
