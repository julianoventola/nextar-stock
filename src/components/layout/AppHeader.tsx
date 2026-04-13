import { RefreshCw } from 'lucide-react'
import { useOfferActions } from '@/hooks/useOffers'
import { useOffersStore } from '@/store/offersStore'

export function AppHeader() {
  const { fetchOffers } = useOfferActions()
  const isLoading = useOffersStore(s => s.isLoading)

  return (
    <header className="app-header">
      <div className="app-header__logo">
        <span className="app-header__logo-dot" />
        OfferControl
      </div>

      <div className="app-header__spacer" />

      <div className="app-header__status">
        <span className="status-dot" />
        json-server · localhost:3001
      </div>

      <button
        className="btn btn--ghost"
        onClick={fetchOffers}
        disabled={isLoading}
        title="Recarregar dados"
        style={{ padding: '4px 10px' }}
      >
        <RefreshCw size={12} style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
        Atualizar
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </button>
    </header>
  )
}
