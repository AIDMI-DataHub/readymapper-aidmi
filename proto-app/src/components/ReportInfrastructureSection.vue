<template>
  <section class="section infrastructure">
    <div class="chunk">
      <div class="main-section-title">Infrastructure</div>

      <div class="chunk-title">Infrastructure in and Around Place Selections on {{ dateHeader }}</div>
      <div style="display: flex;">
        <img class="map-img" v-bind:style="reportMapImagesStyle" :src="reportMapViews['infrastructure']" />
        <div class="map-legend">
          <PointsOfInterestLegend :columnWidth="'100%'" />
          <p class="map-legend-subtitle">Infrastructure in and around {{ selectedDisasterName }} on {{ dateHeader }} with place selections.</p>
        </div>
      </div>
    </div>

    <div class="chunk" v-if="globalInfra">
      <div class="chunk-title">Types of Infrastructure in Place Selections</div>
      <ReportTable
        :titleStyle="'width: 250px !important;'"
        :columnNames="globalInfraColumns"
        :rows="globalInfraRows"
      />
    </div>

    <div class="chunk" v-if="floodPerimeterInfraRows.length">
      <div class="chunk-title">
        Infrastructure within the Flood Perimeter — {{ floodPerimeterSource && floodPerimeterSource.label }}<span v-if="floodPerimeterSource && floodPerimeterSource.area"> (~{{ floodPerimeterSource.area }} km²)</span>
      </div>
      <ReportTable
        :titleStyle="'width: 250px !important;'"
        :columnNames="['Type', 'Within perimeter']"
        :rows="floodPerimeterInfraRows"
      />
      <div v-if="floodPerimeterCriticalRows.length">
        <h5 class="county-subtitle">Critical facilities in the perimeter (excl. schools)</h5>
        <ReportTable
          :titleStyle="'width: 330px !important;'"
          :columnNames="['Facility', 'Type']"
          :rows="floodPerimeterCriticalRows"
        />
      </div>
      <p style="font-style: italic; font-size: 0.85em;">Mapped infrastructure whose location falls inside the selected observed flood extent.</p>
    </div>

    <div class="chunk" v-if="healthcareFacilities">
      <div class="chunk-title">Types of Healthcare Facilities in Place Selections</div>
      <ReportTable
        :titleStyle="'width: 250px !important;'"
        :columnNames="healthcareFacilitiesColumns"
        :rows="healthcareFacilitiesRows"
      />
    </div>

    <div class="chunk" v-if="healthcareFacilities">
      <div class="chunk-title">Healthcare Facility Details in Place Selections</div>
      <div v-for="table in healthcareDetailsTables" :key="table.county_name">
        <h5 class="county-subtitle">{{table.county_name}} County</h5>
        <ReportTable
          :titleStyle="'width: 250px !important;'"
          :columnNames="healthcareDetailsColumns"
          :rows="table.rows"
        />
      </div>
    </div>

    <div class="chunk" v-if="healthcareFacilities">
      <div class="chunk-title">Number of Hospitals Reachable in &#60; 60 min by Car</div>
      <ReportTable
        :titleStyle="'width: 250px !important;'"
        :columnNames="hospitalsReachableColumns"
        :rows="hospitalsReachableRows"
      />
      <p style="font-style: italic;">Note: driving times might not reflect actual conditions during a disaster event.</p>
    </div>

    <!-- <div class="chunk">
      <div class="chunk-title">Places with Healthcare Facilities within 60 min Driving Time</div>
    </div> -->

    <!-- <div class="chunk">
      <div class="chunk-title">Healthcare Facility Details within 60 min Driving Time</div>
    </div> -->

    <!-- <div class="chunk">
      <div class="chunk-title">Places Reachable within 60 min Driving Time</div>
    </div> -->

    <div class="chunk">
      <ReportNotes :id="'infrastructure'"/>
    </div>
  </section>
</template>

<script>
  import { mapState, mapGetters, mapMutations } from 'vuex'

  import * as d3 from 'd3'
  import { groupBy } from 'es-toolkit/array';
  import * as turf from '@turf/turf'

  import { settings } from '../../constants/settings'
  import { toTitleCase } from './utils/toTitleCase'
  import { getIsochroneForPlace } from './utils/getIsochroneForPlace'

  import ReportTable from './ReportTable.vue'
  import PointsOfInterestLegend from './PointsOfInterestLegend.vue'
  import ReportNotes from './ReportNotes.vue'


  export default {
    name: 'ReportInfrastructureSection',

    components: {
      ReportTable,
      PointsOfInterestLegend,
      ReportNotes,
    },

    props: {
      dateHeader: String,
    },

    data() {
      return {
        reportMapImagesStyle: settings.reportMapImages,
        hospitalsReachableRows: [],
      }
    },

    watch: {
      async reportPlaces(places) {
        const rows = await this.generateHospitalsReachableRows(places)
        this.hospitalsReachableRows = rows
      },
    },

    mounted: async function() {
      const rows = await this.generateHospitalsReachableRows(this.reportPlaces)
      this.hospitalsReachableRows = rows
    },

    computed: {
      ...mapGetters([
        'selectedDisasterName',
        'reportPlaces',
        'reportCounties',
        'selectedHealthcare',
        'selectedGlobalInfra',
        'allInfraTypes',
      ]),
      ...mapState([
        'reportMapViews',
        'regionTypeSelection',
        'isochronesData',
        'healthcareFacilities',
        'disasterConfig',
        'globalInfra',
        'floodExtentData',
        'floodExtentSource',
        'floodExtentSources',
      ]),

      // ---- infrastructure within the selected flood perimeter ----
      floodPerimeterSource() {
        return (this.floodExtentSources || []).find(s => s.key === this.floodExtentSource)
      },
      floodPerimeterInfra() {
        const fc = (this.floodExtentData || {})[this.floodExtentSource]
        if (!fc?.features?.length || !this.globalInfra?.features?.length) return []
        // pointsWithinPolygon is very slow on vue proxies — deep-clone the polygon first
        const poly = JSON.parse(JSON.stringify(fc))
        return turf.pointsWithinPolygon(
          turf.featureCollection(this.globalInfra.features),
          turf.featureCollection(poly.features)
        ).features
      },
      floodPerimeterInfraRows() {
        const rolled = d3.rollup(this.floodPerimeterInfra, v => v.length, d => d.properties['rm_type'])
        return this.allInfraTypes
          .map(t => ({ title: t.label, values: [rolled.get(t.type) || 0] }))
          .filter(r => r.values[0] > 0)
      },
      floodPerimeterCriticalRows() {
        const critical = new Set(['hospital', 'dam', 'hydropower', 'airport'])
        const labelOf = t => (this.allInfraTypes.find(x => x.type === t) || {}).label || t
        return this.floodPerimeterInfra
          .filter(f => critical.has(f.properties['rm_type']))
          .map(f => ({
            title: f.properties['rm_name'] || f.properties['alt_name'] || '(unnamed)',
            values: [labelOf(f.properties['rm_type']) + (f.properties['source'] && f.properties['source'] !== 'OSM infrastructure' ? ` · ${f.properties['source']}` : '')],
          }))
          .sort((a, b) => a.title.localeCompare(b.title))
      },

      globalInfraColumns() {
        return [
          'Location',
          ...this.allInfraTypes.map(d => d.label)
        ]
      },

      globalInfraRows() {
        const generateGlobalInfraRows = (features, placeType) => {
          return features.map(feature => {
            const facilities = this.selectedGlobalInfra([feature])
            const rolledUp = d3.rollup(facilities, v => v.length, d => d.properties['rm_type'])
            const values = this.allInfraTypes.map(d => rolledUp.get(d.type) || 0)

            return {
              title: feature.properties['rm_name'],
              placeType: placeType,
              values: [
                ...values,
              ]
            }
          })
          .sort((a, b) => {
            return d3.descending(a.values[0], b.values[0])
          })
        }

        const counties = generateGlobalInfraRows(this.reportCounties, 'counties')
        const places = generateGlobalInfraRows(this.reportPlaces, 'places')
        return [
          ...counties,
          ...places,
        ]
      },

      healthcareFacilityTypes() {
        return settings.healthcareFacilityTypes.map(d => d.general_type)
      },

      healthcareFacilitiesColumns() {
        return [
          'Location',
          'All ▼',
          ...this.healthcareFacilityTypes,
        ]
      },

      healthcareFacilitiesRows() {
        const generateHealthcareFacilitiesRows = (features, placeType) => {
          return features.map(feature => {
            const facilities = this.selectedHealthcare([feature])
            const rolledUp = d3.rollup(facilities, v => v.length, d => d.properties['general_type'])
            const values = this.healthcareFacilityTypes.map(d => rolledUp.get(d) || 0)

            return {
              title: feature.properties['rm_name'],
              placeType: placeType,
              values: [
                d3.sum(values),
                ...values,
              ]
            }
          })
          .sort((a, b) => {
            return d3.descending(a.values[0], b.values[0])
          })
        }

        const counties = generateHealthcareFacilitiesRows(this.reportCounties, 'counties')
        const places = generateHealthcareFacilitiesRows(this.reportPlaces, 'places')
        return [
          ...counties,
          ...places,
        ]
      },

      healthcareDetailsColumns() {
        return [
          'Facility Name ▼',
          'Beds',
          'Category',
          'Facility Type',
          // 'County',
          'Place',
        ]
      },

      healthcareDetailsTables() {
        const locations = this.regionTypeSelection === 'counties'
          ? this.reportCounties
          : [
            // ...this.reportCounties,
            ...this.reportPlaces,
          ]
        const facilities = this.selectedHealthcare(locations)
          .sort((a, b) => {
            return d3.ascending(a.properties['name'], b.properties['name'])
          })

        if (!facilities.length) return []

        const facilitiesByCounty = groupBy(facilities, (d) => d.properties.county_name)
        const tables = Object.keys(facilitiesByCounty).map(county => {
          const countyData = facilitiesByCounty[county]
          return {county_name: county, rows: this.generateFacilitiesTable(countyData)}
        })

        return tables
      },

      hospitalsReachableColumns() {
        return [
          'From',
          '< 15 min',
          '< 30 min',
          '< 45 min',
          '< 60 min',
        ]
      },

    },

    methods: {
      ...mapMutations([
        'setReportVisible',
        'setIsochronesData',
      ]),
      generateFacilitiesTable(facilities) {
        return facilities
          .map(feature => {
            const props = feature.properties

            return {
              title: toTitleCase(props['name']),
              values: [
                props['beds'] || 'N/A',
                props['general_type'],
                toTitleCase(props['type']),
                // props['county_name'],
                props['place_name'],
              ],
              rawValues: [
                Number(props['beds']),
              ],
            }
          })
          // .sort((a, b) => {
          //   return d3.descending(a.rawValues[0], b.rawValues[0])
          // })
      },

      async generateHospitalsReachableRows(features) {
        // don't generate isochrone rows for international disasters
        if (this.disasterConfig?.isInternational) return []
        // pointsWithinPolygon is extremely slow if the shapes are all vue proxy objects, so we
        // use this dirty hack to convert it all to a real object before passing to pointsWithinPolygon.
        const hospitals = turf.featureCollection(
            JSON.parse(JSON.stringify(this.healthcareFacilities))
            .features
            .filter(f => f.properties.general_type === "Hospitals")
          )

        const rows = await Promise.all(
          features.map(async feature => {
            const placeId = this.feature?.properties?.GEOID
            const isochrones = await getIsochroneForPlace(feature, placeId, this.isochronesData, this.setIsochronesData)

            for (let iso of isochrones.features) {
              const hospitalsWithin = turf.pointsWithinPolygon(
                hospitals,
                iso
              )
              iso['hospitalsWithin'] = Number(hospitalsWithin.features.length)
              iso['hospitalsWithinDetails'] = hospitalsWithin.features
            }

            const metrics = isochrones.features.map(d => {
                return {'minutes': d.properties.contour, 'hospitalsWithin': d['hospitalsWithin']}
              })
              .sort((a, b) => {
                return d3.ascending(a.minutes, b.minutes)
              })

            const rows = {
              title: feature.properties['rm_name'],
              values: [
                ...metrics.map(d => d['hospitalsWithin']),
              ]
            }
            return rows
          })
          .sort((a, b) => {
            return d3.descending(a.title, b.title)
          })
        )

        return rows
      },
    }
  }
</script>

<style lang="scss">
.county-subtitle {
  font-weight: bold;
  font-size: 1em;
  margin: 1.25em 0 0;
  padding-bottom: 0.25em;
  border-bottom: 2px solid #2c3e50;
}
</style>
