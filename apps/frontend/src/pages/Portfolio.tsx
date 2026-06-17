import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BalanceCard, PositionTable, HistoryTable, EmptyState } from '@/components'
import { Button } from '@/components/ui/button'
import { useBalance, usePositions, useTradeHistory } from '@/hooks'
import { useModalStore } from '@/stores'
import { LoadingSkeleton } from '@/components'
import { PageContainer, PageHeader, ContentGrid, Stack } from '@/components/layout'

export function Portfolio() {
  const {
    data: balanceData,
    isLoading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance,
  } = useBalance()

  const {
    data: positions,
    isLoading: positionsLoading,
    refetch: refetchPositions,
  } = usePositions()

  const {
    data: history,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useTradeHistory()

  const { openModal } = useModalStore()
  const [activeTab, setActiveTab] = useState<'positions' | 'history'>('positions')

  const isLoading = balanceLoading || positionsLoading || historyLoading
  const balance = balanceData?.balance;
  const lockedBalance = balanceData?.lockedBalance

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingSkeleton />
      </PageContainer>
    )
  }

  if (balanceError) {
    return (
      <PageContainer>
        <EmptyState
          title="Portfolio unavailable"
          description="Unable to load data."
          action={{
            label: 'Retry',
            onClick: () => {
              refetchBalance()
              refetchPositions()
              refetchHistory()
            },
          }}
        />
      </PageContainer>
    )
  }

  if (balance == null) {
    return (
      <PageContainer>
        <EmptyState
          title="No portfolio data"
          description="Try again later"
        />
      </PageContainer>
    )
  }

  const balanceUsd = balance ?? 0
  const lockedBalanceUsd = lockedBalance ?? 0
  const totalBalanceUsd = balanceUsd + lockedBalanceUsd

  return (
    <PageContainer>
      <Stack spacing={8}>
        {/* Header */}
        <PageHeader
          title="Portfolio"
          description="Your positions and activity"
          actions={
            <div className="flex gap-3">
              <Button
                onClick={() => openModal('deposit')}
                className="h-10 text-xs font-medium shadow-lg shadow-accent/25 hover:shadow-accent/40"
              >
                Deposit
              </Button>

              <Button
                variant="outline"
                onClick={() => openModal('withdraw')}
                className="h-10 text-xs font-medium"
              >
                Withdraw
              </Button>
            </div>
          }
        />

        {/* Balance strip (less “dashboard cards”, more terminal blocks) */}
        <ContentGrid cols={3}>
          <BalanceCard
            title="Available"
            amount={balanceUsd}
            variant="success"
          />
          <BalanceCard
            title="Locked"
            amount={lockedBalanceUsd}
            variant="warning"
          />
          <BalanceCard
            title="Total"
            amount={totalBalanceUsd}
            variant="default"
          />
        </ContentGrid>

        {/* Main panel */}
        <div className="border border-border/60 bg-surface/95 rounded-xl shadow-lg overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Modern tab selector with cleaner design */}
            <div className="border-b border-border/40 bg-surface-2/50">
              <TabsList className="grid grid-cols-2 h-11 w-full bg-transparent border-0 shadow-none p-0">
                <TabsTrigger value="positions" className="text-sm font-medium data-[state=active]:bg-surface/80 data-[state=active]:text-text data-[state=active]:border-b-2 data-[state=active]:border-accent/60 data-[state=active]:shadow-sm rounded-none transition-all duration-200 hover:bg-surface/60">
                  Positions
                </TabsTrigger>
                <TabsTrigger value="history" className="text-sm font-medium data-[state=active]:bg-surface/80 data-[state=active]:text-text data-[state=active]:border-b-2 data-[state=active]:border-accent/60 data-[state=active]:shadow-sm rounded-none transition-all duration-200 hover:bg-surface/60">
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {activeTab === 'positions' && (
                <div key="positions" className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <PositionTable positions={positions ?? []} />
                </div>
              )}

              {activeTab === 'history' && (
                <div key="history" className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <HistoryTable trades={history ?? []} />
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </Stack>
    </PageContainer>
  )
}