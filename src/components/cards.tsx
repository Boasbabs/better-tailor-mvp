import { Link } from 'react-router-dom'
import type { Order } from '../types'
import { useStore } from '../store'
import { DuePill, StatusPill } from './ui'
import { FabricImage } from '../gallery'

export function OrderCard({ order }: { order: Order }) {
  const customer = useStore((s) => s.customers.find((c) => c.id === order.customerId))
  return (
    <Link
      to={`/orders/${order.id}`}
      className="bg-card rounded-2xl shadow-sm p-3 flex items-center gap-3 active:scale-[0.98] transition"
    >
      <FabricImage fabricId={order.fabricId} className="w-14 h-14 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">{order.garment}</div>
        <div className="text-xs text-ink/50 truncate">{customer?.name ?? 'unknown customer'}</div>
        <div className="mt-1.5 flex gap-1.5 flex-wrap">
          <StatusPill status={order.status} />
          {order.status !== 'delivered' && <DuePill dueDate={order.dueDate} />}
        </div>
      </div>
    </Link>
  )
}
