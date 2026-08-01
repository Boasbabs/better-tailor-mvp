import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Avatar, Confirm, Icons, PillButton, Sheet } from '../components/ui'
import { MeasurementGrid } from '../components/measure'
import { OrderCard } from '../components/cards'
import { waPhone } from '../lib'
import { agoLabel } from '../measure-link'
import type { MeasurementSet } from '../types'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const customer = useStore((s) => s.customers.find((c) => c.id === id))
  const templates = useStore((s) => s.templates)
  const allOrders = useStore((s) => s.orders)
  const orders = useMemo(() => allOrders.filter((o) => o.customerId === id), [allOrders, id])
  const updateCustomer = useStore((s) => s.updateCustomer)
  const deleteCustomer = useStore((s) => s.deleteCustomer)
  const requests = useStore((s) => s.requests)
  const clearRequest = useStore((s) => s.clearRequest)
  const pending = requests.find((r) => r.customerId === id)
  const [openSet, setOpenSet] = useState<string | null>(null)
  const [addSet, setAddSet] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!customer) {
    return (
      <SubShell title="customer" backTo="/customers">
        <div className="text-center text-ink/40 py-20">customer not found</div>
      </SubShell>
    )
  }

  const setsByTemplate = new Set(customer.sets.map((s) => s.templateId))
  const available = templates.filter((t) => !setsByTemplate.has(t.id))
  // gender-relevant templates first
  const genderRank = (tid: string) => {
    if (customer.gender === 'female') return ['t-gown', 't-blouse', 't-skirt'].includes(tid) ? 0 : 1
    if (customer.gender === 'male') return ['t-agbada', 't-trouser'].includes(tid) ? 0 : 1
    return 0
  }
  const sortedAvailable = [...available].sort((a, b) => genderRank(a.id) - genderRank(b.id))

  const patchSets = (sets: MeasurementSet[]) => updateCustomer(customer.id, { sets })

  const setValue = (templateId: string, field: string, value: string) => {
    const n = Number(value)
    const v: number | string = value.trim() !== '' && Number.isFinite(n) ? n : value
    patchSets(
      customer.sets.map((s) => (s.templateId === templateId ? { ...s, values: { ...s.values, [field]: v } } : s)),
    )
  }

  const addFieldToSet = (templateId: string, name: string) => {
    patchSets(
      customer.sets.map((s) => (s.templateId === templateId ? { ...s, values: { ...s.values, [name]: '' } } : s)),
    )
  }

  const attachSet = (templateId: string) => {
    patchSets([...customer.sets, { templateId, values: {} }])
    setAddSet(false)
    setOpenSet(templateId)
  }

  const removeSet = (templateId: string) => {
    patchSets(customer.sets.filter((s) => s.templateId !== templateId))
  }

  return (
    <SubShell
      title={customer.name}
      backTo="/customers"
      right={
        <Link to={`/customers/${customer.id}/edit`} className="p-2 text-ink/60 active:scale-90 transition" aria-label="edit">
          {Icons.edit()}
        </Link>
      }
    >
      <div className="space-y-3 pb-8">
        {/* info card */}
        <div className="bg-card rounded-2xl shadow-sm p-5 flex items-center gap-4">
          <Avatar name={customer.name} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-lg leading-tight truncate">{customer.name}</div>
            <div className="text-sm text-ink/50 font-medium">{customer.phone || 'no phone'}</div>
            {customer.area && <div className="text-xs text-ink/40">{customer.area}</div>}
          </div>
        </div>
        {customer.phone && (
          <div className="grid grid-cols-2 gap-2">
            <a href={`tel:${customer.phone}`} className="bg-card shadow-sm rounded-full font-bold py-3 text-center text-sm active:scale-95 transition flex items-center justify-center gap-2">
              {Icons.phone('w-4 h-4')} call
            </a>
            <a
              href={`https://wa.me/${waPhone(customer.phone)}`}
              target="_blank"
              rel="noreferrer"
              className="bg-wa text-white rounded-full font-bold py-3 text-center text-sm active:scale-95 transition flex items-center justify-center gap-2"
            >
              {Icons.whatsapp('w-[18px] h-[18px]')} whatsapp
            </a>
          </div>
        )}

        {/* waiting on them — Lyft's "invite pending" beat */}
        {pending && (
          <div className="bg-[#FFF1DC] rounded-2xl p-4 mt-2">
            <div className="flex items-center gap-2 text-[#9A5B00] font-bold text-sm">
              <span className="w-2 h-2 rounded-full bg-[#E89100]" />
              waiting for their measurements
            </div>
            <p className="text-[13px] text-[#9A5B00]/75 mt-1">
              link sent {agoLabel(pending.sentAt)} · {pending.templateIds.length} set
              {pending.templateIds.length === 1 ? '' : 's'} requested
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate(`/ask?customer=${customer.id}`)}
                className="flex-1 bg-ink text-white rounded-full text-xs font-bold py-2.5 active:scale-95 transition"
              >
                send again
              </button>
              <button
                onClick={() => clearRequest(pending.id)}
                className="px-4 text-[#9A5B00]/70 text-xs font-bold active:scale-95 transition"
              >
                cancel
              </button>
            </div>
          </div>
        )}

        {/* measurement sets */}
        <div className="flex items-center justify-between mt-2 gap-2">
          <h2 className="font-display font-bold lowercase">measurements</h2>
          <div className="flex gap-2 shrink-0">
            {!pending && (
              <button
                onClick={() => navigate(`/ask?customer=${customer.id}`)}
                className="text-xs font-bold bg-card shadow-sm rounded-full px-4 py-2 active:scale-95 transition"
              >
                ask them
              </button>
            )}
            <button onClick={() => setAddSet(true)} className="text-xs font-bold bg-ink text-white rounded-full px-4 py-2 active:scale-95 transition">
              + add set
            </button>
          </div>
        </div>
        {customer.sets.length === 0 && (
          <div className="bg-card2 rounded-2xl p-5 text-center">
            <div className="text-sm text-ink/45 font-medium">
              no measurements saved yet — add a set so orders can auto-fill.
            </div>
            {!pending && (
              <button
                onClick={() => navigate(`/ask?customer=${customer.id}`)}
                className="mt-3 text-xs font-bold text-ink underline underline-offset-4 active:scale-95 transition"
              >
                or send {customer.name.split(' ')[0]} a link to fill in their own
              </button>
            )}
          </div>
        )}
        {customer.sets.map((set) => {
          const t = templates.find((x) => x.id === set.templateId)
          const fields = t?.fields ?? Object.keys(set.values)
          const filled = fields.filter((f) => set.values[f] !== undefined && set.values[f] !== '').length
          const open = openSet === set.templateId
          return (
            <div key={set.templateId} className="bg-card rounded-2xl shadow-sm">
              <button className="w-full p-4 flex items-center justify-between" onClick={() => setOpenSet(open ? null : set.templateId)}>
                <div className="text-left">
                  <div className="font-bold">{t?.name ?? 'Custom set'}</div>
                  <div className="text-xs text-ink/45">
                    {filled}/{Math.max(fields.length, Object.keys(set.values).length)} measurements filled
                  </div>
                </div>
                <span className="text-ink/30">{open ? Icons.up() : Icons.down()}</span>
              </button>
              {open && (
                <div className="px-4 pb-4">
                  <MeasurementGrid
                    fields={fields}
                    values={set.values}
                    onChange={(f, v) => setValue(set.templateId, f, v)}
                    onAddField={(name) => addFieldToSet(set.templateId, name)}
                  />
                  <button onClick={() => removeSet(set.templateId)} className="mt-3 text-danger text-xs font-bold active:scale-95 transition">
                    remove this set
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* orders */}
        <div className="flex items-center justify-between mt-2">
          <h2 className="font-display font-bold lowercase">their orders</h2>
          <span className="text-xs font-bold text-ink/35">{orders.length}</span>
        </div>
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
        {orders.length === 0 && (
          <div className="bg-card2 rounded-2xl p-5 text-center text-sm text-ink/40 font-medium">no orders yet.</div>
        )}

        <PillButton className="w-full" onClick={() => navigate(`/order/new?customer=${customer.id}`)}>
          new order for {customer.name.split(' ')[0]}
        </PillButton>
        <button onClick={() => setConfirmDelete(true)} className="w-full text-danger font-bold text-sm py-3 active:scale-95 transition">
          delete customer
        </button>
      </div>

      <Sheet open={addSet} onClose={() => setAddSet(false)} title="add measurement set">
        <div className="space-y-2">
          {sortedAvailable.map((t) => (
            <button
              key={t.id}
              onClick={() => attachSet(t.id)}
              className="w-full bg-card rounded-2xl shadow-sm p-4 flex items-center justify-between active:scale-[0.98] transition text-left"
            >
              <div>
                <div className="font-bold">{t.name}</div>
                <div className="text-xs text-ink/45">{t.fields.length} fields</div>
              </div>
              {Icons.chevron('w-5 h-5 text-ink/30')}
            </button>
          ))}
          {sortedAvailable.length === 0 && (
            <div className="text-sm text-ink/40 text-center py-4">all templates already added.</div>
          )}
        </div>
      </Sheet>

      <Confirm
        open={confirmDelete}
        title="delete this customer?"
        body={`${customer.name} and their orders will be removed.`}
        onConfirm={() => {
          deleteCustomer(customer.id)
          navigate('/customers', { replace: true })
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </SubShell>
  )
}
