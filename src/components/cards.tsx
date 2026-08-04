import { Link } from 'react-router-dom'
import type { Order } from '../types'
import { useStore } from '../store'
import { DuePill, StatusPill } from './ui'
import { useIsTeam, useMe } from './staff'
import { FabricImage } from '../gallery'

export function OrderCard({ order }: { order: Order }) {
  const customer = useStore((s) => s.customers.find((c) => c.id === order.customerId))
  const assignee = useStore((s) => s.staff.find((x) => x.id === order.assignedTo))
  const me = useMe()
  const isTeam = useIsTeam()

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
        {/* Only a shop with staff has an assignment worth naming — and only an
            unfinished order still needs somebody at the machine. */}
        {isTeam && order.status !== 'delivered' && (
          <div className="text-[11px] font-bold text-ink/35 mt-1.5 truncate">
            {assignee
              ? assignee.id === me?.id
                ? '● assigned to you'
                : `● ${assignee.name}`
              : '○ nobody assigned'}
          </div>
        )}
      </div>
    </Link>
  )
}
