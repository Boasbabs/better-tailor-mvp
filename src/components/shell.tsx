import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icons, Sheet, TabIcon, type TabName } from './ui'

export function Wordmark({ className = 'text-lg' }: { className?: string }) {
  return <span className={`font-display font-bold lowercase tracking-tight ${className}`}>better tailor</span>
}

export function HomeShell({ active, children }: { active: TabName; children: ReactNode }) {
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
      <Link
        to="/settings"
        className="w-10 h-10 rounded-full bg-card shadow-sm grid place-items-center text-ink/70 active:scale-90 transition"
        aria-label="settings"
      >
        {Icons.gear('w-[22px] h-[22px]')}
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

function Tab({ to, label, name, active }: { to: string; label: string; name: TabName; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center gap-1 py-1 transition ${active ? 'text-ink' : 'text-ink/35'}`}
      aria-current={active ? 'page' : undefined}
    >
      <TabIcon name={name} active={active} />
      <span className={`text-[10px] lowercase ${active ? 'font-bold' : 'font-semibold'}`}>{label}</span>
    </Link>
  )
}

export function TabBar({ active }: { active: TabName }) {
  const [fabOpen, setFabOpen] = useState(false)
  const navigate = useNavigate()
  const go = (path: string) => {
    setFabOpen(false)
    navigate(path)
  }
  return (
    <>
      {/* Four equal tabs; the + still floats clear of the row so it reads as a
          primary action rather than a fifth, oddly-shaped tab — the arrangement
          Jobber and Squarespace both use at this count. */}
      <nav className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
        <div className="max-w-md mx-auto relative">
          <button
            onClick={() => setFabOpen(true)}
            aria-label="create"
            className="pointer-events-auto absolute right-5 -top-[4.5rem] w-14 h-14 rounded-full bg-ink text-white grid place-items-center shadow-[0_8px_24px_rgba(17,17,17,0.28)] active:scale-90 transition"
          >
            {Icons.plus()}
          </button>
          <div className="pointer-events-auto bg-card rounded-t-3xl shadow-[0_-6px_24px_rgba(17,17,17,0.08)] grid grid-cols-4 px-1 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <Tab to="/orders" label="orders" name="orders" active={active === 'orders'} />
            <Tab to="/customers" label="customers" name="customers" active={active === 'customers'} />
            <Tab to="/invoices" label="invoices" name="invoices" active={active === 'invoices'} />
            <Tab to="/consultations" label="calls" name="calls" active={active === 'calls'} />
          </div>
        </div>
      </nav>

      <Sheet open={fabOpen} onClose={() => setFabOpen(false)} title="create">
        <div className="space-y-2">
          {[
            { label: 'book a fitting call', sub: 'send a link — measure them on a call', path: '/consult/share', icon: Icons.video() },
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
