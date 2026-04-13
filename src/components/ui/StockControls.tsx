import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Offer } from '@/types'
import { useOfferActions } from '@/hooks/useOffers'
import { validateStockDelta } from '@/utils/offerUtils'

interface StockControlsProps {
  offer: Offer
  disabled?: boolean
}

export function StockControls({ offer, disabled = false }: StockControlsProps) {
  const [delta, setDelta] = useState(1)
  const { updateStockOptimistic } = useOfferActions()

  const handleDecrement = () => {
    if (!validateStockDelta(offer, -delta)) {
      updateStockOptimistic({ offerId: offer.id, delta: -delta })
    } else {
      updateStockOptimistic({ offerId: offer.id, delta: -delta })
    }
  }

  const handleIncrement = () => {
    updateStockOptimistic({ offerId: offer.id, delta })
  }

  const canDecrement = offer.stock - delta >= 0 && offer.status === 'active'
  const canIncrement = offer.stock + delta <= offer.maxStock && offer.status === 'active'

  return (
    <div className="stock-controls" onClick={e => e.stopPropagation()}>
      <button
        className="stock-btn"
        onClick={handleDecrement}
        disabled={disabled || !canDecrement}
        title="Decrementar estoque"
        aria-label="Decrementar estoque"
      >
        <Minus size={12} />
      </button>

      <input
        className="stock-input"
        type="number"
        min={1}
        max={100}
        value={delta}
        onChange={e => setDelta(Math.max(1, parseInt(e.target.value) || 1))}
        title="Quantidade do delta"
        aria-label="Quantidade"
      />

      <button
        className="stock-btn"
        onClick={handleIncrement}
        disabled={disabled || !canIncrement}
        title="Incrementar estoque"
        aria-label="Incrementar estoque"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}
