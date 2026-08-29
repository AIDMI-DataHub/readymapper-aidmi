import * as d3 from 'd3'

import { getAcsVariable } from '../../../constants/settings'

export const addAcsDataToFeature = (f, isInternational) => {
  if (!isInternational) {
    // 
    // Migrate legacy census property names -> new property names
    // 
    f.properties['rm_id'] = f.properties['GEOID']
    f.properties['rm_name'] = f.properties['NAME']
    f.properties['rm_total_population'] = f.properties[getAcsVariable('Total Population')]
    
    // 
    // Calculate vulnerability metrics from census data
    // 
    f.properties['rm_pop_65_and_over'] = d3.sum([
      f.properties[getAcsVariable('Population 65-69')],
      f.properties[getAcsVariable('Population 70-74')],
      f.properties[getAcsVariable('Population 75-79')],
      f.properties[getAcsVariable('Population 80-84')],
      f.properties[getAcsVariable('Population Over 85')]
    ])
    f.properties['rm_pop_14_and_under'] = d3.sum([
      f.properties[getAcsVariable('Population 10-14')],
      f.properties[getAcsVariable('Population 5-9')],
      f.properties[getAcsVariable('Population Under 5')]
    ])
    f.properties.totalHouseholds = f.properties[getAcsVariable('Total Households')]
    f.properties.popBelowPoverty = f.properties[getAcsVariable('Population Below Poverty Level')]
    const percentPopBelowPoverty = f.properties.popBelowPoverty / f.properties['rm_total_population']
    // HACK: cap percentages at 100%
    f.properties.percentPopBelowPoverty = isFinite(percentPopBelowPoverty) ? d3.min([percentPopBelowPoverty, 1]) : 0
  }

  // 
  // Calculate percentages from absolute numbers
  // 
  f.properties['rm_percent_pop_65_and_over'] = f.properties['rm_pop_65_and_over'] / f.properties['rm_total_population']
  f.properties['rm_percent_pop_14_and_under'] = f.properties['rm_pop_14_and_under'] / f.properties['rm_total_population']
  
  if (f.properties['rm_total_population'] == 0) {
    f.properties['rm_percent_pop_65_and_over'] = 0
    f.properties['rm_percent_pop_14_and_under'] = 0
  }
}
