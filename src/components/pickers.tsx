import { useMemo, useState } from 'react'
import type { Customer } from '../types'
import { useStore } from '../store'
import { track, uid } from '../lib'
import { Avatar, Icons, inputCls, Sheet, useToast } from './ui'
import { useCan } from './staff'
import { MASK_PHONE, masked } from '../perm'
import { FABRICS, FabricImage, STYLES, StyleImage } from '../gallery'

export function CustomerPickerSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (c: Customer) => void
}) {
  const customers = useStore((s) => s.customers)
  const addCustomer = useStore((s) => s.addCustomer)
  // Only intake roles reach this sheet at all, but the masking rule holds
  // wherever a number is drawn — one exempt surface is all it takes.
  const canSeeContacts = useCan('contacts')
  const [q, setQ] = useState('')
  const [quickAdd, setQuickAdd] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const filtered = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())),
    [customers, q],
  )

  const commitQuickAdd = () => {
    if (!name.trim()) return
    const c: Customer = {
      id: uid(),
      name: name.trim(),
      phone: phone.trim(),
      area: '',
      sets: [],
      createdAt: new Date().toISOString(),
    }
    addCustomer(c)
    track('engaged')
    setName('')
    setPhone('')
    setQuickAdd(false)
    onPick(c)
  }

  return (
    <Sheet open={open} onClose={onClose} title="choose customer">
      <input className={inputCls} placeholder="search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 space-y-2">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className="w-full bg-card rounded-2xl shadow-sm p-3 flex items-center gap-3 text-left active:scale-[0.98] transition"
          >
            <Avatar name={c.name} />
            <div className="min-w-0">
              <div className="font-bold truncate">{c.name}</div>
              <div className="text-xs text-ink/50">
                {c.phone ? masked(c.phone, canSeeContacts, MASK_PHONE) : 'no phone'}
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && <div className="text-sm text-ink/40 text-center py-4">no customers match "{q}"</div>}
      </div>
      {!quickAdd ? (
        <button
          onClick={() => setQuickAdd(true)}
          className="mt-3 w-full rounded-2xl border-2 border-dashed border-ink/15 text-ink/50 font-bold py-3.5 active:scale-[0.98] transition"
        >
          + new customer
        </button>
      ) : (
        <div className="mt-3 bg-card rounded-2xl shadow-sm p-3 space-y-2">
          <input className="w-full bg-card2 rounded-xl px-3 py-2.5 font-medium outline-none" placeholder="full name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <input className="w-full bg-card2 rounded-xl px-3 py-2.5 font-medium outline-none" placeholder="+234 phone (for WhatsApp)" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button onClick={commitQuickAdd} className="w-full bg-ink text-white rounded-full font-bold py-3 active:scale-95 transition disabled:opacity-30" disabled={!name.trim()}>
            add customer
          </button>
        </div>
      )}
    </Sheet>
  )
}

function CameraTile({ big = false }: { big?: boolean }) {
  const show = useToast((s) => s.show)
  return (
    <button
      onClick={() => show('📷 Coming in the full app!')}
      className={`rounded-2xl border-2 border-dashed border-ink/15 text-ink/40 grid place-items-center gap-1 active:scale-95 transition ${big ? 'aspect-square' : 'aspect-square'}`}
    >
      <div className="grid place-items-center gap-1 py-2">
        {Icons.camera()}
        <span className="text-[10px] font-bold">take photo</span>
      </div>
    </button>
  )
}

export function StylePickerSheet({
  open,
  onClose,
  selected,
  onPick,
}: {
  open: boolean
  onClose: () => void
  selected?: string
  onPick: (id: string) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="pick a style">
      <div className="grid grid-cols-3 gap-2">
        <CameraTile />
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className={`bg-card rounded-2xl shadow-sm p-2 flex flex-col items-center active:scale-95 transition ${selected === s.id ? 'ring-2 ring-ink' : ''}`}
          >
            <StyleImage styleId={s.id} className="w-full aspect-square rounded-xl" />
            <span className="text-[11px] font-bold lowercase mt-1">{s.name}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

export function FabricPickerSheet({
  open,
  onClose,
  selected,
  onPick,
}: {
  open: boolean
  onClose: () => void
  selected?: string
  onPick: (id: string) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="pick a fabric">
      <div className="grid grid-cols-3 gap-2">
        <CameraTile />
        {FABRICS.map((f) => (
          <button
            key={f.id}
            onClick={() => onPick(f.id)}
            className={`bg-card rounded-2xl shadow-sm p-2 flex flex-col items-center active:scale-95 transition ${selected === f.id ? 'ring-2 ring-ink' : ''}`}
          >
            <FabricImage fabricId={f.id} className="w-full aspect-square rounded-xl" />
            <span className="text-[11px] font-bold lowercase mt-1 truncate w-full text-center">{f.name}</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
