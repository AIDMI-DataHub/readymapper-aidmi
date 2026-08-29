export const mapTabs = {
  tabs: [
    {
      id: 'disaster',
      name: 'Disaster',
    },
    {
      id: 'people',
      name: 'People',
    },
    {
      id: 'infrastructure',
      name: 'Infrastructure',
    },
    {
      // News Sources — shown only for disasters whose config sets hasNewsSources
      // (TabSelection filters it out otherwise). Short name so the 5-tab strip fits.
      id: 'news',
      name: 'News',
    },
    {
      id: 'custom',
      name: 'Custom',
    },
  ]
}
