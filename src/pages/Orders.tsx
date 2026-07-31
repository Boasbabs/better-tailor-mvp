import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { HomeHeader, HomeShell } from '../components/shell'
import { OrderCard } from '../components/cards'
import { Icons, inputCls } from '../components/ui'
import { WaitlistBanner } from '../components/WaitlistBanner'
import { dashboardStats, fmtCompact } from '../lib'
import type { OrderStatus } from '../types'

const FILTERS: ('all' | OrderStatus)[] = ['all', 'new', 'sewing', 'ready', 'delivered']

export default function Orders() {
  const orders = useStore((s) => s.orders)
  const customers = useStore((s) => s.customers)
  const settings = useStore((s) => s.settings)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | OrderStatus>('all')

  const stats = useMemo(() => dashboardStats(orders), [orders])

  const filtered = useMemo(() => {
    const ql = q.toLowerCase()
    return orders.filter((o) => {
      if (filter !== 'all' && o.status !== filter) return false
      if (!ql) return true
      const cust = customers.find((c) => c.id === o.customerId)
      return o.garment.toLowerCase().includes(ql) || (cust?.name.toLowerCase().includes(ql) ?? false)
    })
  }, [orders, customers, q, filter])

  return (
    <HomeShell active="orders">
      <HomeHeader />

      {/* dashboard strip */}
      <div className="bg-card rounded-2xl shadow-sm p-5 flex items-center gap-4">
        <div className="flex-1">
          <div className="font-display font-bold text-[64px] leading-none tracking-tight">{stats.dueThisWeek}</div>
          <div className="text-xs font-bold text-ink/45 lowercase mt-1">due this week</div>
        </div>
        <div className="space-y-3 text-right">
          <div>
            <div className={`font-display font-bold text-2xl leading-none ${stats.overdue > 0 ? 'text-danger' : ''}`}>
              {stats.overdue}
            </div>
            <div className="text-[11px] font-bold text-ink/45 lowercase">overdue</div>
          </div>
          <div>
            <div className="font-display font-bold text-2xl leading-none">{fmtCompact(stats.unpaid, settings.currency)}</div>
            <div className="text-[11px] font-bold text-ink/45 lowercase">unpaid</div>
          </div>
        </div>
      </div>

      <WaitlistBanner source="orders" className="mt-3" />

      {/* search + filters */}
      <div className="mt-4 relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30">{Icons.search()}</span>
        <input className={`${inputCls} pl-11`} placeholder="search garment or customer…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-3 flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-xs font-bold lowercase whitespace-nowrap transition ${
              filter === f ? 'bg-ink text-white' : 'bg-card text-ink/60 shadow-sm'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* order cards */}
      <div className="mt-3 space-y-2 flex flex-col">
        {filtered.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-14 text-ink/35">
            <div className="text-3xl">🪡</div>
            <div className="font-bold lowercase mt-2 text-sm">no orders here</div>
            <div className="text-xs mt-1">tap + to add your first order</div>
          </div>
        )}
      </div>
    </HomeShell>
  )
}
