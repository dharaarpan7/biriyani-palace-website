import { useEffect, useState } from 'react'
import { Loader } from './components/Loader/Loader'
import { Navigation } from './components/Navigation/Navigation'
import { CinematicStage } from './components/CinematicStage/CinematicStage'
import { Philosophy } from './components/sections/Philosophy'
import { MenuSection } from './components/sections/MenuSection'
import { Signature } from './components/sections/Signature'
import { Experience } from './components/sections/Experience'
import { FinalCTA } from './components/sections/FinalCTA'
import { Footer } from './components/sections/Footer'
import { ReservationSection } from './components/ReservationSection/ReservationSection'

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Safety net: never hold the visitor hostage on the loader — if clip
    // metadata is unusually slow, reveal the site anyway after 8 seconds.
    const fallback = setTimeout(() => setReady(true), 8000)
    return () => clearTimeout(fallback)
  }, [])

  return (
    <div id="top">
      <Loader visible={!ready} />
      <Navigation />
      <main>
        <CinematicStage onReady={() => setReady(true)} />
        <Philosophy />
        <MenuSection />
        <Signature />
        <Experience />
        <ReservationSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}
