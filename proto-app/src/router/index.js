import { createRouter, createWebHashHistory } from 'vue-router'
import Main from '../views/Main.vue'
import LandingPage from '../views/LandingPage.vue'

const routes = [
  {
    path: '/',
    name: 'LandingPage',
    component: LandingPage
  },
  {
    path: '/disaster',
    name: 'Main',
    component: Main
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (to.hash) {
      return { el: to.hash }
    }
  },
  routes
})

// 
// Force a full browser reload whenever we change from one disaster
// to another.
// 
// We do this because there's tons of state that needs
// to be reset (the map, the store, etc.), and also so that pressing
// back/forward during a loading screen cancels all the ongoing requests.
// 
router.beforeEach(async (to, from) => {
  // switchDisaster uses history.replaceState (bypassing Vue router), so from.query may
  // be stale. Read the actual current URL's disasterId from the hash fragment instead.
  const hashSearch = window.location.hash.includes('?')
    ? window.location.hash.split('?')[1]
    : ''
  const actualCurrentDisasterId = new URLSearchParams(hashSearch).get('disasterId') || from.query.disasterId

  let changingDisasters = (
    actualCurrentDisasterId && to.query.disasterId &&
    actualCurrentDisasterId !== to.query.disasterId
  )
  if (changingDisasters) {
    window.location.href = to.fullPath
    window.location.reload()
  }
})

export default router
