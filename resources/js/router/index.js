import { createRouter, createWebHistory } from 'vue-router'

/** Views are lazy-loaded so the initial bundle stays small as features grow. */
const routes = [
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: 'Dashboard' } },
  { path: '/players', name: 'players', component: () => import('@/views/PlayerExplorerView.vue'), meta: { title: 'Player Explorer' } },
  { path: '/players/:id', name: 'player-detail', component: () => import('@/views/PlayerDetailView.vue'), props: true, meta: { title: 'Player' } },
  { path: '/compare', name: 'compare', component: () => import('@/views/CompareView.vue'), meta: { title: 'Compare Players' } },
  { path: '/squad', name: 'squad', component: () => import('@/views/SquadBuilderView.vue'), meta: { title: 'Squad Builder' } },
  { path: '/auction', name: 'auction', component: () => import('@/views/AuctionRoomView.vue'), meta: { title: 'Auction Room' } },
  { path: '/assistant', name: 'assistant', component: () => import('@/views/AssistantView.vue'), meta: { title: 'AI Assistant' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, saved) => saved ?? { top: 0 },
})

router.afterEach((to) => {
  document.title = `${to.meta.title ?? 'IPL'} · IPL Auction Assistant`
})
