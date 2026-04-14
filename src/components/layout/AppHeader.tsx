import { RefreshCw } from 'lucide-react'
import { useOfferActions } from '../../hooks/useOffers'
import { useOffersStore } from '../../store/offersStore'
import NextarIcon from "../../assets/nextar.svg";
import "./AppHeader.css"

export function AppHeader() {
  const { fetchOffers } = useOfferActions()
  const isLoading = useOffersStore(s => s.isLoading)

  return (
    <header className="app-header">
      <div className="app-header__logo">
        <img src={NextarIcon} alt="" />
      </div>

      <button
        className="btn btn--ghost"
        onClick={fetchOffers}
        disabled={isLoading}
        title="Recarregar dados"
        style={{ padding: '12px 16px' }}
      >
        <RefreshCw size={12} style={isLoading ? { animation: 'spin 1s linear infinite' } : {}} />
        Atualizar
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </button>
    </header>
  )
}
