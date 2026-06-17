import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useMarket } from '@/hooks'
import {
  LoadingSkeleton,
  EmptyState,
  MarketHeader,
  OrderBook,
  MarketPositions,
  MarketTrading,
  MarketAnalysisCard,
} from '@/components'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageContainer, Stack } from '@/components/layout'
import { formatCents } from '@/lib/utils'
import { TrendingUp, Activity, Layers, Clock } from 'lucide-react'

interface SelectedOrder {
  price: number
  quantity: number
  side: 'BUY' | 'SELL'
}

export function MarketDetails() {
  const { id } = useParams<{ id: string }>()
  const { data: marketData, isLoading, error, refetch } = useMarket(id || '')

  const [selectedOrder, setSelectedOrder] =
    useState<SelectedOrder | null>(null)
  const [activeTab, setActiveTab] = useState<'trade' | 'positions'>('trade')

  const handleOrderClick = (price: number, quantity: number, side: 'BUY' | 'SELL') => {
    setSelectedOrder({ price, quantity, side })
    setActiveTab('trade')
  }

  // Calculate market stats from orderbook - must be before early returns
  const marketStats = useMemo(() => {
    const orderbook = marketData?.orderbook

    if (!orderbook) {
      return {
        totalShares: 0,
        yesBestBid: null,
        yesBestAsk: null,
        yesSpread: null,
        noBestBid: null,
        noBestAsk: null,
        noSpread: null,
      }
    }

    // Calculate total shares (sum of all quantities)
    const calculateTotalShares = (orders: { [price: string]: number }) => {
      return Object.entries(orders).reduce((sum, [, quantity]) => sum + quantity, 0)
    }

    const totalShares = calculateTotalShares(orderbook.BUY) + calculateTotalShares(orderbook.SELL)

    // YES best bid and ask (from original orderbook)
    const yesBuyPrices = Object.entries(orderbook.BUY).map(([p]) => parseFloat(p)).sort((a, b) => b - a)
    const yesSellPrices = Object.entries(orderbook.SELL).map(([p]) => parseFloat(p)).sort((a, b) => a - b)
    const yesBestBid = yesBuyPrices.length > 0 ? yesBuyPrices[0] : null
    const yesBestAsk = yesSellPrices.length > 0 ? yesSellPrices[0] : null
    const yesSpread = yesBestBid !== null && yesBestAsk !== null ? yesBestAsk - yesBestBid : null

    // Transform to NO space for NO prices
    const transformToNoSpace = (ob: typeof orderbook) => {
      const noSpace: typeof orderbook = { BUY: {}, SELL: {} }
      for (const [priceStr, quantity] of Object.entries(ob.BUY)) {
        const noPrice = (1 - parseFloat(priceStr)).toFixed(2)
        noSpace.SELL[noPrice] = quantity
      }
      for (const [priceStr, quantity] of Object.entries(ob.SELL)) {
        const noPrice = (1 - parseFloat(priceStr)).toFixed(2)
        noSpace.BUY[noPrice] = quantity
      }
      return noSpace
    }

    const noOrderbook = transformToNoSpace(orderbook)
    const noBuyPrices = Object.entries(noOrderbook.BUY).map(([p]) => parseFloat(p)).sort((a, b) => b - a)
    const noSellPrices = Object.entries(noOrderbook.SELL).map(([p]) => parseFloat(p)).sort((a, b) => a - b)
    const noBestBid = noBuyPrices.length > 0 ? noBuyPrices[0] : null
    const noBestAsk = noSellPrices.length > 0 ? noSellPrices[0] : null
    const noSpread = noBestBid !== null && noBestAsk !== null ? noBestAsk - noBestBid : null

    return {
      totalShares,
      yesBestBid,
      yesBestAsk,
      yesSpread,
      noBestBid,
      noBestAsk,
      noSpread,
    }
  }, [marketData?.orderbook])

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingSkeleton />
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <EmptyState
          title="Error loading market"
          description="Failed to load market details."
          action={{
            label: 'Retry',
            onClick: () => refetch(),
          }}
        />
      </PageContainer>
    )
  }

  if (!marketData?.market) {
    return (
      <PageContainer>
        <EmptyState
          title="Market not found"
          description="This market does not exist."
        />
      </PageContainer>
    )
  }

  const { market, orderbook, userPositions } = marketData

  const isResolved = market.isResolved
  const isExpired =
    new Date(market.resolutionDeadline) < new Date()

  const canTrade = !isResolved && !isExpired

  return (
    <PageContainer>
      <Stack spacing={6}>
        {/* Header */}
        <MarketHeader market={market} />

        {/* Market Stats - Bento Box Style */}
        {canTrade && orderbook && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* YES Card */}
            <div className="bg-linear-to-br from-yes/10 to-yes/5 rounded-xl p-5 border border-yes/20 col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-yes" />
                <span className="text-xs font-semibold text-yes uppercase tracking-wider">YES</span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-yes">
                  {marketStats.yesBestBid !== null ? formatCents(marketStats.yesBestBid) : '-'}
                </div>
                <div className="text-xs text-text-muted">
                  Bid Price
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-yes/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Ask: {marketStats.yesBestAsk !== null ? formatCents(marketStats.yesBestAsk) : '-'}</span>
                  <span className="text-text-muted">Spread: {marketStats.yesSpread !== null && marketStats.yesSpread > 0 ? formatCents(marketStats.yesSpread) : '-'}</span>
                </div>
              </div>
            </div>

            {/* NO Card */}
            <div className="bg-linear-to-br from-no/10 to-no/5 rounded-xl p-5 border border-no/20 col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-no" />
                <span className="text-xs font-semibold text-no uppercase tracking-wider">NO</span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-no">
                  {marketStats.noBestBid !== null ? formatCents(marketStats.noBestBid) : '-'}
                </div>
                <div className="text-xs text-text-muted">
                  Bid Price
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-no/20">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Ask: {marketStats.noBestAsk !== null ? formatCents(marketStats.noBestAsk) : '-'}</span>
                  <span className="text-text-muted">Spread: {marketStats.noSpread !== null && marketStats.noSpread > 0 ? formatCents(marketStats.noSpread) : '-'}</span>
                </div>
              </div>
            </div>

            {/* Total Shares Card */}
            <div className="bg-surface-2 rounded-xl p-5 border border-border/50 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="h-4 w-4 text-text-muted" />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Total Shares
                </span>
              </div>

              <div className="flex-1" />
              <div className="flex flex-col flex-1">
                <div className="text-4xl font-bold text-text">
                  {marketStats.totalShares.toLocaleString()}
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  Available in orderbook
                </div>
              </div>
            </div>

            {/* Time to Resolve Card */}
            <div className="bg-surface-2 rounded-xl p-5 border border-border/50 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-text-muted" />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Time to Resolve
                </span>
              </div>

              <div className="flex flex-col flex-1 justify-end">
                <div className="text-4xl font-bold text-text">
                  {Math.max(
                    0,
                    Math.floor(
                      (new Date(market.resolutionDeadline).getTime() -
                        new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )}
                  <span className="text-lg font-normal text-text-muted ml-1">d</span>
                </div>

                <div className="mt-2 text-xs text-text-muted">
                  Until resolution
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Orderbook */}
          <div className="lg:col-span-2">
            <OrderBook
              orderbook={orderbook || null}
              onOrderClick={handleOrderClick}
            />
          </div>

          {/* Trading panel */}
          <div className="lg:col-span-1">
            <Stack spacing={4}>
              {canTrade ? (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  {/* Modern segmented control style */}
                  <TabsList className="grid grid-cols-2 h-11 w-full bg-surface-2/50 border border-border/40 rounded-lg p-1 gap-1">
                    <TabsTrigger value="trade" className="text-sm font-medium data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/30 transition-all duration-200 rounded-md hover:bg-surface/80">
                      Trade
                    </TabsTrigger>
                    <TabsTrigger value="positions" className="text-sm font-medium data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/30 transition-all duration-200 rounded-md hover:bg-surface/80">
                      Positions
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-4">
                    <div className="min-h-[400px]">
                      {activeTab === 'trade' && (
                        <div key="trade" className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <MarketTrading
                            marketId={market.id}
                            orderbook={orderbook || null}
                            selectedOrder={selectedOrder}
                            onOrderSelected={setSelectedOrder}
                          />
                        </div>
                      )}

                      {activeTab === 'positions' && (
                        <div key="positions" className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <MarketPositions
                            positions={userPositions || []}
                            marketId={market.id}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </Tabs>
              ) : (
                <div className="border border-border bg-surface rounded-md p-4 space-y-2">
                  <p className="text-xs text-text-secondary font-semibold">
                    Trading Closed
                  </p>

                  <p className="text-xs text-text-muted">
                    {isResolved
                      ? `Resolved: ${market.resolvedOutcome}`
                      : 'Market expired awaiting resolution'}
                  </p>

                  <MarketPositions
                    positions={userPositions || []}
                    marketId={market.id}
                  />
                </div>
              )}
            </Stack>
          </div>
        </div>

        {/* AI Analysis Section */}
        <MarketAnalysisCard marketId={market.id} />

        {/* About section */}
        <div className="border border-border bg-surface rounded-md p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold">
            About this Market
          </h2>

          <p className="text-xs text-text-muted leading-relaxed">
            {market.description}
          </p>
        </div>

        {/* Rules */}
        <div className="border border-border bg-surface rounded-md p-4 flex flex-col gap-3">
          <h2 className="text-sm font-semibold mb-3">
            Trading Rules
          </h2>

          <ul className="space-y-1 text-xs text-text-muted">
            <li>• Prices are in cents (100 = $1.00)</li>
            <li>• YES pays $1 if YES wins</li>
            <li>• NO pays $1 if NO wins</li>
            <li>• 1 YES + 1 NO = $1 (split/merge parity)</li>
            <li>• Orderbook is normalized across outcomes</li>
            <li>• Trading stops on resolution/expiry</li>
          </ul>
        </div>
      </Stack>
    </PageContainer>
  )
}