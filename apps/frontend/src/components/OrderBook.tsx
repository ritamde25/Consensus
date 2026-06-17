import { useMemo, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  formatCurrency,
  formatCents,
  cn,
} from '@/lib/utils'
import type { OrderBookData } from '@/api'
import { EmptyState } from './EmptyState'
import { ArrowUp, ArrowDown, TrendingUp, Activity } from 'lucide-react'

interface OrderBookProps {
  orderbook: OrderBookData | null
  onOrderClick?: (price: number, quantity: number, side: 'BUY' | 'SELL') => void
}

type Space = 'YES' | 'NO'

interface OrderEntry {
  price: number
  quantity: number
  totalValue: number
}

interface OrderSectionProps {
  title: string
  icon: React.ReactNode
  badge: string
  orders: OrderEntry[]
  priceClass: string
  barClass: string
  maxTotalValue: number
  onOrderClick?: (price: number, quantity: number, side: 'BUY' | 'SELL') => void
  side: 'BUY' | 'SELL'
}

function OrderSection({
  title,
  icon,
  badge,
  orders,
  priceClass,
  barClass,
  maxTotalValue,
  onOrderClick,
  side,
}: OrderSectionProps) {
  if (orders.length === 0) return null

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-xs font-medium text-muted-foreground uppercase">
          {title}
        </h3>
        <Badge variant="subtle" className="text-xs">
          {badge}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs font-medium py-2 w-16">
              Vol
            </TableHead>
            <TableHead className="text-xs font-medium py-2">
              Price
            </TableHead>
            <TableHead className="text-xs font-medium py-2">
              Avail
            </TableHead>
            <TableHead className="text-xs font-medium py-2">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {orders.slice(0, 4).map((order, index) => {
            const barWidth = maxTotalValue > 0 ? (order.totalValue / maxTotalValue) * 100 : 0

            return (
              <TableRow
                key={`${side}-${order.price}-${index}`}
                className="cursor-pointer hover:bg-surface-elevated/30 transition-colors"
                onClick={() => onOrderClick?.(order.price, order.quantity, side)}
              >
                <TableCell className="py-2 pr-2 min-w-16">
                  <div className="w-full bg-surface-2 rounded-sm h-2 overflow-hidden">
                    <div
                      className={cn("h-2 rounded-sm", barClass)}
                      style={{ width: `${Math.max(Math.min(barWidth, 100), 2)}%` }}
                    />
                  </div>
                </TableCell>

                <TableCell className={cn("font-semibold text-xs py-2 text-center", priceClass)}>
                  {formatCurrency(order.price)}
                </TableCell>

                <TableCell className="text-muted-foreground text-xs py-2 text-center">
                  {order.quantity}
                </TableCell>

                <TableCell className="text-muted-foreground text-xs py-2 text-center">
                  {formatCurrency(order.totalValue)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// Transform orderbook from YES space to NO space
// Buy Yes "k": q becomes Sell No "1-k": q
// Sell Yes "k": q becomes Buy No "1-k": q
function transformToNoSpace(orderbook: OrderBookData): OrderBookData {
  const noSpaceOrderbook: OrderBookData = {
    BUY: {},
    SELL: {},
  }

  // Transform Buy Yes to Sell No
  for (const [priceStr, quantity] of Object.entries(orderbook.BUY)) {
    const price = parseFloat(priceStr)
    const noPrice = 1 - price
    noSpaceOrderbook.SELL[noPrice.toFixed(2)] = quantity
  }

  // Transform Sell Yes to Buy No
  for (const [priceStr, quantity] of Object.entries(orderbook.SELL)) {
    const price = parseFloat(priceStr)
    const noPrice = 1 - price
    noSpaceOrderbook.BUY[noPrice.toFixed(2)] = quantity
  }

  return noSpaceOrderbook
}

// Convert orderbook entries to sorted array
function orderBookToEntries(orderBookEntry: { [price: string]: number }, sortDesc: boolean): OrderEntry[] {
  return Object.entries(orderBookEntry)
    .map(([priceStr, quantity]) => ({
      price: parseFloat(priceStr),
      quantity,
      totalValue: parseFloat(priceStr) * quantity,
    }))
    .sort((a, b) => sortDesc ? b.price - a.price : a.price - b.price)
}

export function OrderBook({
  orderbook,
  onOrderClick,
}: OrderBookProps) {
  const [space, setSpace] = useState<Space>('YES')

  const {
    buyOrders,
    sellOrders,
    spread,
    maxTotalValue,
  } = useMemo(() => {
    if (!orderbook) {
      return {
        buyOrders: [],
        sellOrders: [],
        spread: null,
        maxTotalValue: 0,
      }
    }

    // Transform to NO space if needed
    const transformedOrderbook = space === 'NO' ? transformToNoSpace(orderbook) : orderbook

    // Convert to sorted arrays
    const buyOrders = orderBookToEntries(transformedOrderbook.BUY, true) // Descending
    const sellOrders = orderBookToEntries(transformedOrderbook.SELL, false) // Ascending

    // Calculate spread
    const spread =
      buyOrders.length > 0 && sellOrders.length > 0
        ? sellOrders[0].price - buyOrders[0].price
        : null

    // Calculate max total value for volume bar scaling
    const allOrders = [...buyOrders, ...sellOrders]
    const maxTotalValue = allOrders.length > 0
      ? Math.max(...allOrders.map(order => order.totalValue))
      : 0

    return {
      buyOrders,
      sellOrders,
      spread,
      maxTotalValue,
    }
  }, [orderbook, space])

  if (!orderbook) {
    return (
      <Card className="border-border/30 h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Order Book
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          <EmptyState
            title="No orders"
            description="There are currently no orders for this market"
            size="sm"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            Order Book
          </CardTitle>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={
                space === 'YES'
                  ? 'default'
                  : 'outline'
              }
              onClick={() => setSpace('YES')}
              className={`h-8 text-xs ${space === 'YES' ? 'bg-yes hover:bg-yes/90' : ''}`}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              YES
            </Button>

            <Button
              size="sm"
              variant={
                space === 'NO'
                  ? 'default'
                  : 'outline'
              }
              onClick={() => setSpace('NO')}
              className={`h-8 text-xs ${space === 'NO' ? 'bg-no hover:bg-no/90' : ''}`}
            >
              <Activity className="h-3 w-3 mr-1" />
              NO
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {buyOrders.length === 0 &&
        sellOrders.length === 0 ? (
          <EmptyState
            title="No open orders"
            description="There are currently no open orders in the order book"
            size="sm"
          />
        ) : (
          <div className="space-y-4">
            <OrderSection
              title="Buy Orders"
              icon={
                <ArrowUp className="h-3 w-3 text-yes" />
              }
              badge={space}
              orders={buyOrders}
              priceClass="text-yes"
              barClass="bg-yes/50"
              maxTotalValue={maxTotalValue}
              onOrderClick={onOrderClick}
              side="BUY"
            />

            {spread !== null && spread > 0 && (
              <div className="py-2 border-y border-border text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-surface-2 border border-border/50">
                  <span className="text-xs font-medium text-text-muted">
                    Spread: {formatCents(spread)}
                  </span>
                </div>
              </div>
            )}

            <OrderSection
              title="Sell Orders"
              icon={
                <ArrowDown className="h-3 w-3 text-no" />
              }
              badge={space}
              orders={sellOrders}
              priceClass="text-no"
              barClass="bg-no/50"
              maxTotalValue={maxTotalValue}
              onOrderClick={onOrderClick}
              side="SELL"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
