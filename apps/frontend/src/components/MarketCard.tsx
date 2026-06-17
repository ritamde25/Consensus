import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Market } from '@/api'
import { Clock, ArrowRight } from 'lucide-react'

interface MarketCardProps {
  market: Market
}

export function MarketCard({ market }: MarketCardProps) {
  const isResolved = market.isResolved
  const isExpired = new Date(market.resolutionDeadline) < new Date()

  const status = isResolved
    ? `Resolved ${market.resolvedOutcome}`
    : isExpired
      ? 'Expired'
      : 'Open'

  const getStatusColor = () => {
    if (isResolved) return 'border-border/50 text-text-muted'
    if (isExpired) return 'border-no/30 text-no bg-no/5'
    return 'border-yes/30 text-yes bg-yes/5'
  }

  return (
    <Link
      to={`/market/${market.id}`}
      className="block group"
    >
      <Card
        className="
          h-full
          border-border/60
          bg-surface/90
          hover:border-accent/40
          hover:shadow-xl
          hover:-translate-y-1
          transition-all
          duration-300
          overflow-hidden
        "
      >
        <CardContent className="p-5 flex flex-col h-full">
          {/* Status Badge */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <h3
              className="
                flex-1
                text-base
                font-semibold
                leading-snug
                text-text
                line-clamp-2
              "
            >
              {market.title}
            </h3>

            <Badge
              className={`border ${getStatusColor()} text-[11px] font-semibold px-2.5 py-1`}
            >
              {status}
            </Badge>
          </div>

          {/* Description */}
          <p
            className="
              flex-1
              text-sm
              text-text-secondary
              line-clamp-2
              leading-relaxed
              mb-5
            "
          >
            {market.description}
          </p>

          {/* Footer */}
          <div
            className="
              flex
              items-center
              justify-between
              pt-4
              border-t
              border-border/30
            "
          >
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-text-muted" />
              <div className="flex flex-col">
                <span
                  className="
                    text-[10px]
                    uppercase
                    tracking-wider
                    text-text-muted
                  "
                >
                  Resolves
                </span>
                <span
                  className="
                    text-xs
                    font-medium
                    text-text-secondary
                  "
                >
                  {formatDate(market.resolutionDeadline)}
                </span>
              </div>
            </div>

            <div
              className="
                flex
                items-center
                gap-1.5
                text-xs
                font-medium
                text-text-muted
                group-hover:text-accent
                transition-colors
              "
            >
              <span>View</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}