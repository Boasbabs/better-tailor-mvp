import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icons, Sheet } from './ui'

export function Wordmark({ className = 'text-lg' }: { className?: string }) {
  return <span className={`font-display font-bold lowercase tracking-tight ${className}`}>better tailor</span>
}

export function HomeShell({ active, children }: { active: 'orders' | 'customers' | 'invoices'; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <div className="max-w-md mx-auto px-4 pt-5 pb-36">{children}</div>
      <TabBar active={active} />
    </div>
  )
}

export function HomeHeader() {
  return (
    <div className="flex items-center justify-between mb-4">
      <Wordmark />
      <Link to="/settings" className="p-2 -mr-2 text-ink/70 active:scale-90 transition" aria-label="settings">
        {Icons.gear('w-6 h-6')}
      </Link>
    </div>
  )
}

export function SubShell({
  title,
  right,
  children,
  backTo,
}: {
  title: string
  right?: ReactNode
  children: ReactNode
  backTo?: string
}) {
  const navigate = useNavigate()
  return (
    <div className="min-h-dvh">
      <div className="max-w-md mx-auto px-4 pb-16">
        <div className="sticky top-0 z-20 bg-bg/90 backdrop-blur -mx-4 px-4 py-4 flex items-center gap-2">
          <button
            className="p-1.5 -ml-2 active:scale-90 transition"
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            aria-label="back"
          >
            {Icons.back()}
          </button>
          <h1 className="font-display font-bold text-xl lowercase flex-1 truncate">{title}</h1>
          {right}
        </div>
        {children}
      </div>
    </div>
  )
}

function Tab({ to, label, icon, active }: { to: string; label: string; icon: ReactNode; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-0.5 px-2 pt-1 transition ${active ? 'text-ink' : 'text-ink/30'}`}
    >
      {icon}
      <span className="text-[10px] font-bold lowercase">{label}</span>
    </Link>
  )
}

export function TabBar({ active }: { active: 'orders' | 'customers' | 'invoices' }) {
  const [fabOpen, setFabOpen] = useState(false)
  const navigate = useNavigate()
  const go = (path: string) => {
    setFabOpen(false)
    navigate(path)
  }
  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-30">
        <div className="max-w-md mx-auto bg-card rounded-t-3xl shadow-[0_-6px_24px_rgba(17,17,17,0.08)] flex items-center justify-around px-4 pt-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Tab to="/orders" label="orders" icon={Icons.shirt()} active={active === 'orders'} />
          <Tab to="/customers" label="customers" icon={Icons.people()} active={active === 'customers'} />
          <button
            onClick={() => setFabOpen(true)}
            aria-label="add"
            className="w-14 h-14 -mt-9 rounded-full bg-ink text-white grid place-items-center shadow-lg active:scale-90 transition"
          >
            {Icons.plus()}
          </button>
          <Tab to="/invoices" label="invoices" icon={Icons.receipt()} active={active === 'invoices'} />
        </div>
      </nav>

      <Sheet open={fabOpen} onClose={() => setFabOpen(false)} title="create">
        <div className="space-y-2">
          {[
            { label: 'new order', sub: 'garment, measurements & due date', path: '/order/new', icon: Icons.shirt() },
            { label: 'new customer', sub: 'name, phone & measurement sets', path: '/customer/new', icon: Icons.people() },
            { label: 'new invoice', sub: 'line items, deposit & balance due', path: '/invoice/new', icon: Icons.receipt() },
          ].map((a) => (
            <button
              key={a.path}
              onClick={() => go(a.path)}
              className="w-full bg-card rounded-2xl shadow-sm p-4 flex items-center gap-4 active:scale-[0.98] transition text-left"
            >
              <div className="w-11 h-11 rounded-full bg-ink text-white grid place-items-center">{a.icon}</div>
              <div>
                <div className="font-bold lowercase">{a.label}</div>
                <div className="text-xs text-ink/50">{a.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  )
}
