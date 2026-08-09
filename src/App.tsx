import { useEffect, useState } from 'react'
import { StoreProvider, useStore } from './store'
import TopBar from './components/TopBar'
import Rail from './components/Rail'
import Plans from './components/Plans'
import PlanMap from './components/PlanMap'
import Explore from './components/Explore'
import Overview from './components/Overview'
import Itinerary from './components/Itinerary'
import ToDo from './components/ToDo'
import Budget from './components/Budget'
import Gate from './components/Gate'
import MapPane from './components/MapPane'
import Snackbar from './components/Snackbar'

// This deployment is the Albania trip. The root URL loads it directly; no hub,
// no hash needed. (Other trip slugs still work as #/<slug> if ever needed.)
const DEFAULT_SLUG = 'albania-2026'

function useRouteSlug(): string {
  const read = () => {
    const h = window.location.hash.replace(/^#\/?/, '').trim()
    return h || DEFAULT_SLUG
  }
  const [slug, setSlug] = useState<string>(read)
  useEffect(() => {
    const on = () => setSlug(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return slug
}

// Leaflet crashes if it initializes inside a display:none container (mobile,
// map closed) — it computes NaN coords and throws. So only mount the map when
// it is actually visible: always on desktop, on mobile only when opened.
function useIsMobile() {
  const [m, setM] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return m
}

function Shell() {
  const { view, mapMobileOpen } = useStore()
  const isMobile = useIsMobile()
  const showMap = !isMobile || mapMobileOpen

  return (
    <div className="shell">
      <div className="left">
        <TopBar />
        <div className="left-body">
          <Rail />
          <div className="panel">
            {/* All views are variant-driven now; no wait for the DB. */}
            {view === 'plans' && <Plans />}
            {view === 'planmap' && <PlanMap />}
            {view === 'explore' && <Explore />}
            {view === 'overview' && <Overview />}
            {view === 'itinerary' && <Itinerary />}
            {view === 'todo' && <ToDo />}
            {view === 'budget' && <Budget />}
          </div>
        </div>
      </div>

      <div className={mapMobileOpen ? 'map-col map-col-open' : 'map-col'}>
        {showMap && <MapPane />}
      </div>

      <Snackbar />
    </div>
  )
}

export default function App() {
  const slug = useRouteSlug()
  return (
    <Gate>
      <StoreProvider slug={slug} key={slug}>
        <Shell />
      </StoreProvider>
    </Gate>
  )
}
