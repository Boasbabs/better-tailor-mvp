import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { HomeHeader, HomeShell } from '../components/shell'
import { InvoicePill } from '../components/ui'
import { fmtDate, fmtMoney, invoiceMath } from '../lib'

export default function Invoices() {
  const invoices = useStore((s) => s.invoices)
  const customers = useStore((s) => s.customers)
  const settings = useStore((s) => s.settings)

  return (
    <HomeShell active="invoices">
      <HomeHeader />
      <div className="space-y-2 flex flex-col">
        {invoices.map((inv) => {
          const cust = customers.find((c) => c.id === inv.customerId)
          const { total } = invoiceMath(inv)
          return (
            <Link key={inv.id} to={`/invoices/${inv.id}`} className="bg-card rounded-2xl shadow-sm p-4 flex items-center gap-3 active:scale-[0.98] transition">
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold">{inv.number}</div>
                <div className="text-xs text-ink/50 truncate">
                  {cust?.name ?? 'unknown'} · {fmtDate(inv.createdAt)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-display font-bold">{fmtMoney(total, settings.currency)}</div>
                <div className="mt-1">
                  <InvoicePill status={inv.status} />
                </div>
              </div>
            </Link>
          )
        })}
        {invoices.length === 0 && (
          <div className="text-center py-14 text-ink/35">
            <div className="text-3xl">🧾</div>
            <div className="font-bold lowercase mt-2 text-sm">no invoices yet</div>
            <div className="text-xs mt-1">tap + to create one</div>
          </div>
        )}
      </div>
    </HomeShell>
  )
}
