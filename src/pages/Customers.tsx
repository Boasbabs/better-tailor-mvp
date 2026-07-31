import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { HomeHeader, HomeShell } from '../components/shell'
import { Avatar, Icons, inputCls } from '../components/ui'
import { waPhone } from '../lib'

export default function Customers() {
  const customers = useStore((s) => s.customers)
  const orders = useStore((s) => s.orders)
  const [q, setQ] = useState('')

  const filtered = useMemo(
    () => customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())),
    [customers, q],
  )

  return (
    <HomeShell active="customers">
      <HomeHeader />
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/30">{Icons.search()}</span>
        <input className={`${inputCls} pl-11`} placeholder="search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="mt-3 space-y-2 flex flex-col">
        {filtered.map((c) => {
          const count = orders.filter((o) => o.customerId === c.id).length
          return (
            <div key={c.id} className="bg-card rounded-2xl shadow-sm p-3 flex items-center gap-3">
              <Link to={`/customers/${c.id}`} className="flex items-center gap-3 flex-1 min-w-0 active:scale-[0.98] transition">
                <Avatar name={c.name} />
                <div className="min-w-0">
                  <div className="font-bold truncate">{c.name}</div>
                  <div className="text-xs text-ink/50 truncate">
                    {c.phone}
                    {c.area ? ` · ${c.area}` : ''}
                  </div>
                  <div className="text-[11px] font-bold text-ink/35 mt-0.5">
                    {count} order{count === 1 ? '' : 's'}
                  </div>
                </div>
              </Link>
              {c.phone && (
                <>
                  <a href={`tel:${c.phone}`} className="w-10 h-10 rounded-full bg-card2 grid place-items-center text-ink active:scale-90 transition" aria-label="call">
                    {Icons.phone('w-4 h-4')}
                  </a>
                  <a
                    href={`https://wa.me/${waPhone(c.phone)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-10 h-10 rounded-full bg-wa text-white grid place-items-center active:scale-90 transition"
                    aria-label="whatsapp"
                  >
                    {Icons.whatsapp('w-[18px] h-[18px]')}
                  </a>
                </>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-14 text-ink/35">
            <div className="text-3xl">🧵</div>
            <div className="font-bold lowercase mt-2 text-sm">no customers yet</div>
            <div className="text-xs mt-1">tap + to add one</div>
          </div>
        )}
      </div>
    </HomeShell>
  )
}
