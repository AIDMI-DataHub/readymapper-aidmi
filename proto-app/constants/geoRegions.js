export const GEO_REGIONS = [
  {
    name: 'Africa',
    isoCodes: [
      'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD',
      'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET',
      'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG',
      'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW',
      'ST', 'SN', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN',
      'UG', 'ZM', 'ZW',
    ],
  },
  {
    name: 'Asia',
    isoCodes: [
      'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'GE',
      'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KW', 'KG',
      'LA', 'LB', 'MY', 'MV', 'MN', 'MM', 'NP', 'KP', 'OM', 'PK',
      'PH', 'QA', 'SA', 'SG', 'KR', 'LK', 'SY', 'TW', 'TJ', 'TH',
      'TL', 'TR', 'TM', 'AE', 'UZ', 'VN', 'YE',
    ],
  },
  {
    name: 'Caribbean & North America',
    isoCodes: [
      'AG', 'AI', 'AW', 'BS', 'BB', 'BM', 'BL', 'CA', 'KY', 'CU',
      'DM', 'DO', 'GD', 'GP', 'HT', 'JM', 'MQ', 'MX', 'MS', 'PR',
      'KN', 'LC', 'VC', 'MF', 'SX', 'TC', 'TT', 'US', 'VG', 'VI',
    ],
  },
  {
    name: 'Central & South America',
    isoCodes: [
      'AR', 'BZ', 'BO', 'BR', 'CL', 'CO', 'CR', 'EC', 'FK', 'GF',
      'GT', 'GY', 'HN', 'NI', 'PA', 'PY', 'PE', 'SV', 'SR', 'UY',
      'VE',
    ],
  },
  {
    name: 'Europe',
    isoCodes: [
      'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CZ', 'DK',
      'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'XK',
      'LV', 'LI', 'LT', 'LU', 'MT', 'MD', 'MC', 'ME', 'NL', 'MK',
      'NO', 'PL', 'PT', 'RO', 'RU', 'SM', 'RS', 'SK', 'SI', 'ES',
      'SE', 'CH', 'UA', 'GB', 'VA',
    ],
  },
  {
    name: 'Oceania',
    isoCodes: [
      'AU', 'FJ', 'FM', 'GU', 'KI', 'MH', 'MP', 'NC', 'NR', 'NZ',
      'PF', 'PG', 'PW', 'SB', 'TK', 'TO', 'TV', 'VU', 'WF', 'WS',
    ],
  },
]

export const getDisasterRegion = (isoCodes) => {
  const primaryCode = isoCodes?.split(',')?.[0]?.trim()
  return GEO_REGIONS.find(r => r.isoCodes.includes(primaryCode))?.name ?? null
}

const countryDisplayNames = new Intl.DisplayNames(['en'], { type: 'region' })

export const getCountryName = (isoCodes) => {
  const primaryCode = isoCodes?.split(',')?.[0]?.trim()
  try {
    return countryDisplayNames.of(primaryCode) ?? primaryCode
  } catch {
    return primaryCode
  }
}
