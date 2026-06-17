import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateOrder } from '@/hooks'
import { formatCurrency } from '@/lib/utils'
import type { CreateOrderRequest } from '@/api'
import { toast } from 'sonner'
import { TrendingUp, Activity, DollarSign } from 'lucide-react'

interface TradingFormProps {
  marketId: string
}

export function TradingForm({ marketId }: TradingFormProps) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY')
  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')

  const createOrder = useCreateOrder()

  const estimatedCost =
    price && quantity ? parseFloat(price) * parseFloat(quantity) : 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!price || !quantity) {
      toast.error('Please fill in all fields')
      return
    }

    const orderData: CreateOrderRequest = {
      marketId,
      side,
      outcome,
      price: parseFloat(price),
      quantity: parseFloat(quantity),
    }

    createOrder.mutate(orderData, {
      onSuccess: () => {
        toast.success('Order placed successfully')
        setPrice('')
        setQuantity('')
      },
      onError: () => {
        toast.error('Failed to place order')
      },
    })
  }

  return (
    <Card className="border-border bg-surface">
      <CardContent className="p-4">
        <div className="min-h-[400px] flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <TrendingUp className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold">Trade</h2>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
            {/* Side toggle (Kalshi-style segmented control) */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={side === 'BUY' ? 'default' : 'outline'}
                className="h-9 text-xs font-semibold"
                onClick={() => setSide('BUY')}
              >
                BUY
              </Button>

              <Button
                type="button"
                variant={side === 'SELL' ? 'default' : 'outline'}
                className="h-9 text-xs font-semibold"
                onClick={() => setSide('SELL')}
              >
                SELL
              </Button>
            </div>

            {/* Outcome toggle */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOutcome('YES')}
                className={`h-9 text-xs font-semibold ${
                  outcome === 'YES' ? 'border-yes text-yes' : ''
                }`}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                YES
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setOutcome('NO')}
                className={`h-9 text-xs font-semibold ${
                  outcome === 'NO' ? 'border-no text-no' : ''
                }`}
              >
                <Activity className="h-3 w-3 mr-1" />
                NO
              </Button>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">Price</Label>

              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted" />

                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  placeholder="0.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label className="text-xs text-text-secondary">Quantity</Label>

              <Input
                type="number"
                step="1"
                min="1"
                placeholder="10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Cost summary (no gradient, no shadow) */}
            <div className="border border-border/60 bg-surface-2/90 rounded-md p-3 flex justify-between items-center shadow-sm">
              <span className="text-xs text-text-muted">Estimated cost</span>
              <span className="text-sm font-semibold numeric">
                {formatCurrency(estimatedCost)}
              </span>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={createOrder.isPending}
              className="w-full h-9 text-xs font-semibold"
            >
              {createOrder.isPending ? 'Placing...' : `${side} ${outcome}`}
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}