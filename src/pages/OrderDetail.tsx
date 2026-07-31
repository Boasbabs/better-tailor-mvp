import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Avatar, Celebration, Confirm, DuePill, Icons, PillButton } from '../components/ui'
import { MeasurementGrid } from '../components/measure'
import { FabricSwatch, StyleIcon, fabricName } from '../gallery'
import { fmtMoney } from '../lib'
import type { OrderStatus } from '../types'

const STATUSES: OrderStatus[] = ['new', 'sewing', 'ready', 'delivered']

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const order = useStore((s) => s.orders.find((o) => o.id === id))
  const customer = useStore((s) => s.customers.find((c) => c.id === order?.customerId))
  const template = useStore((s) => s.templates.find((t) => t.id === order?.templateId))
  const settings = useStore((s) => s.settings)
  const updateOrder = useStore((s) => s.updateOrder)
  const deleteOrder = useStore((s) => s.deleteOrder)
  const [celebrate, setCelebrate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!order) {
    return (
      <SubShell title="order" backTo="/orders">
        <div className="text-center text-ink/40 py-20">order not found</div>
      </SubShell>
    )
  }

  const setStatus = (s: OrderStatus) => {
    if (s === order.status) return
    updateOrder(order.id, { status: s })
    if (s === 'delivered') setCelebrate(true)
  }

  const balance = Math.max(0, order.price - order.deposit)
  const cur = settings.currency

  return (
    <SubShell
      title={order.garment}
      backTo="/orders"
      right={
        <Link to={`/orders/${order.id}/edit`} className="p-2 text-ink/60 active:scale-90 transition" aria-label="edit">
          {Icons.edit()}
        </Link>
      }
    >
      <div className="space-y-3 pb-8">
        {/* hero */}
        <div className="bg-card rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-center relative">
            <StyleIcon styleId={order.styleId || 'shirt'} className="h-40" />
            <FabricSwatch fabricId={order.fabricId} className="w-14 h-14 rounded-xl absolute right-0 bottom-0 shadow-md" />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="font-display font-bold text-xl leading-tight">{order.garment}</div>
            <DuePill dueDate={order.dueDate} delivered={order.status === 'delivered'} />
          </div>
          <div className="text-xs text-ink/40 font-semibold mt-0.5">{fabricName(order.fabricId)}</div>
          {customer && (
            <Link to={`/customers/${customer.id}`} className="mt-3 bg-card2 rounded-full pl-1.5 pr-4 py-1.5 inline-flex items-center gap-2 active:scale-95 transition">
              <div className="w-7 h-7 rounded-full bg-ink text-white grid place-items-center text-[10px] font-bold">
                {customer.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('')}
              </div>
              <span className="text-sm font-bold">{customer.name}</span>
              {Icons.chevron('w-4 h-4 text-ink/30')}
            </Link>
          )}
        </div>

        {/* status stepper */}
        <div className="bg-card rounded-2xl shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink/40 mb-3">status — tap to update</div>
          <div className="grid grid-cols-4 gap-1.5">
            {STATUSES.map((s) => {
              const idx = STATUSES.indexOf(order.status)
              const i = STATUSES.indexOf(s)
              const isCurrent = s === order.status
              const done = i < idx
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-full py-2 text-[11px] font-bold lowercase transition active:scale-95 ${
                    isCurrent
                      ? s === 'delivered'
                        ? 'bg-ok text-white'
                        : 'bg-ink text-white'
                      : done
                        ? 'bg-card2 text-ink'
                        : 'bg-card2 text-ink/35'
                  }`}
                >
                  {done ? '✓ ' : ''}
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {/* money */}
        <div className="bg-card rounded-2xl shadow-sm p-4 space-y-2">
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-ink/50">price</span>
            <span>{fmtMoney(order.price, cur)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span className="text-ink/50">deposit paid</span>
            <span>−{fmtMoney(order.deposit, cur)}</span>
          </div>
          <div className="border-t border-ink/5 pt-2 flex justify-between items-baseline">
            <span className="text-sm font-bold">balance</span>
            <span className={`font-display font-bold text-2xl ${balance > 0 ? '' : 'text-ok'}`}>{fmtMoney(balance, cur)}</span>
          </div>
        </div>

        {/* measurements */}
        <div className="bg-card rounded-2xl shadow-sm p-4">
          <div className="text-[11px] font-bold uppercase tracking-widest text-ink/40 mb-3">
            measurements — {template?.name ?? 'custom'} (this order's copy)
          </div>
          <MeasurementGrid fields={template?.fields ?? Object.keys(order.measurements)} values={order.measurements} readOnly />
        </div>

        {order.notes && (
          <div className="bg-card rounded-2xl shadow-sm p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-ink/40 mb-2">notes</div>
            <p className="text-sm font-medium text-ink/70">{order.notes}</p>
          </div>
        )}

        <PillButton className="w-full" onClick={() => navigate(`/invoice/new?order=${order.id}`)}>
          create invoice for this order
        </PillButton>
        <button onClick={() => setConfirmDelete(true)} className="w-full text-danger font-bold text-sm py-3 active:scale-95 transition">
          delete order
        </button>
      </div>

      <Celebration open={celebrate} onClose={() => setCelebrate(false)} />
      <Confirm
        open={confirmDelete}
        title="delete this order?"
        body={`"${order.garment}" will be removed. This can't be undone.`}
        onConfirm={() => {
          deleteOrder(order.id)
          navigate('/orders', { replace: true })
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </SubShell>
  )
}
