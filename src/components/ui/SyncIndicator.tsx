import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { OfferSyncState } from '@/types'
import { useOfferActions } from '@/hooks/useOffers'

interface SyncIndicatorProps {
  syncState: OfferSyncState
}

export function SyncIndicator({ syncState }: SyncIndicatorProps) {
  const { refreshOffer } = useOfferActions()
  const { status, errorMessage, conflictData, offerId } = syncState

  if (status === 'idle') return null

  if (status === 'saving') {
    return (
      <div className="sync-toast sync-toast--saving">
        <Loader2 size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
        Sincronizando...
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="sync-toast sync-toast--success fade-in">
        <CheckCircle2 size={12} />
        Salvo com sucesso
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="sync-toast sync-toast--error fade-in">
        <XCircle size={12} />
        {errorMessage ?? 'Erro ao sincronizar. Alteração desfeita.'}
      </div>
    )
  }

  if (status === 'conflict') {
    return (
      <div className="conflict-banner fade-in">
        <div className="conflict-banner__title">
          <AlertTriangle size={14} />
          Conflito de versão detectado
        </div>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
          {errorMessage}
          {conflictData && (
            <span style={{ display: 'block', marginTop: 4 }}>
              Versão atual do servidor: <strong style={{ color: 'var(--color-warning)' }}>v{conflictData.version}</strong>
            </span>
          )}
        </div>
        <div className="conflict-banner__actions">
          <button
            className="btn btn--warning"
            onClick={() => refreshOffer(offerId)}
          >
            Recarregar versão atual
          </button>
        </div>
      </div>
    )
  }

  return null
}
