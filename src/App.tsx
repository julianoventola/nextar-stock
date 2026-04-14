import { useEffect } from 'react'
import { AppHeader } from './components/layout/AppHeader'
import { Filters } from './components/layout/Filters'
import { MetricsPanel } from './components/offers/MetricsPanel'
import { OffersGrid } from './components/offers/OffersGrid'
import { useOfferActions } from './hooks/useOffers'
import { useOffersStore } from './store/offersStore'

function GlobalErrorBanner() {
  const error = useOffersStore(s => s.globalError)
  const { clearGlobalError } = useOfferActions()
  if (!error) return null
  return (
    <div style={{
      background: 'var(--color-danger-dim)',
      border: '1px solid var(--color-danger)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      color: 'var(--color-danger)',
    }}>
      {error}
      <button
        onClick={clearGlobalError}
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}
      >×</button>
    </div>
  )
}

export default function App() {
  const { fetchOffers } = useOfferActions()

  useEffect(() => {
    fetchOffers()
  }, [])

  return (
    <div className="app-shell">
      <AppHeader />
      <div className="main-content">
        <Filters />
        <main className="content-area">
          <GlobalErrorBanner />
          <div>
            <div className="section-header">
              <div>
                <h1 className="section-title">Dashboard de Ofertas</h1>
                <p className="section-subtitle">
                  Controle em tempo real · Optimistic UI com versionamento
                </p>
              </div>
            </div>
            <MetricsPanel />
          </div>
          <div>
            <div className="section-header">
              <h2 className="section-title" style={{ fontSize: 16 }}>Ofertas</h2>
            </div>
            <OffersGrid />
          </div>
        </main>
      </div>
    </div>
  )
}
