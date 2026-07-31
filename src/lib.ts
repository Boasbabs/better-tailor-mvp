import type { Invoice, InvoiceStatus, Order, Settings } from './types'

export const FORM_URL = 'https://forms.gle/bPkdLr5FuNep2W4G6'

export const uid = () => crypto.randomUUID()

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const isoDaysFromNow = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function daysUntil(dateISO: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(`${dateISO}T00:00:00`)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

export type Urgency = 'overdue' | 'soon' | 'none'

export function urgency(dueDate?: string): Urgency {
  if (!dueDate) return 'none'
  const d = daysUntil(dueDate)
  if (d < 0) return 'overdue'
  if (d <= 3) return 'soon'
  return 'none'
}

export function dueLabel(dueDate?: string): string {
  if (!dueDate) return 'no due date'
  const d = daysUntil(dueDate)
  if (d < -1) return `overdue by ${-d} days`
  if (d === -1) return 'overdue by 1 day'
  if (d === 0) return 'due today'
  if (d === 1) return 'due tomorrow'
  return `due in ${d} days`
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtMoney(n: number, symbol: string): string {
  return `${symbol}${Math.round(n).toLocaleString('en-NG')}`
}

export function fmtCompact(n: number, symbol: string): string {
  if (n >= 1_000_000) return `${symbol}${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`
  if (n >= 10_000) return `${symbol}${Math.round(n / 1000)}k`
  return fmtMoney(n, symbol)
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

export function invoiceMath(inv: Pick<Invoice, 'lines' | 'discount' | 'depositPaid'>) {
  const subtotal = inv.lines.reduce((s, l) => s + (l.amount || 0), 0)
  const discount = !inv.discount
    ? 0
    : inv.discount.kind === 'flat'
      ? inv.discount.value
      : Math.round((subtotal * inv.discount.value) / 100)
  const total = Math.max(0, subtotal - discount)
  const balance = Math.max(0, total - inv.depositPaid)
  return { subtotal, discount, total, balance }
}

export function deriveInvoiceStatus(inv: Pick<Invoice, 'lines' | 'discount' | 'depositPaid'>): InvoiceStatus {
  const { total, balance } = invoiceMath(inv)
  if (total > 0 && balance <= 0) return 'paid'
  if (inv.depositPaid > 0 && balance > 0) return 'part-paid'
  return balance <= 0 ? 'paid' : 'unpaid'
}

export function nextInvoiceNumber(invoices: Invoice[]): string {
  const max = invoices.reduce((m, i) => {
    const n = parseInt(i.number.split('-')[1] ?? '0', 10)
    return Number.isFinite(n) && n > m ? n : m
  }, 0)
  return `BT-${String(max + 1).padStart(4, '0')}`
}

export function waPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

export function whatsappInvoiceText(
  inv: Invoice,
  customerName: string,
  settings: Settings,
): string {
  const { subtotal, discount, total, balance } = invoiceMath(inv)
  const c = settings.currency
  const lines: string[] = []
  lines.push(`*INVOICE ${inv.number} — ${settings.businessName}*`)
  lines.push(`Billed to: ${customerName}`)
  lines.push('─────────────')
  for (const l of inv.lines) lines.push(`${l.label} ....... ${fmtMoney(l.amount, c)}`)
  lines.push(`Subtotal ....... ${fmtMoney(subtotal, c)}`)
  if (discount > 0) lines.push(`Discount ....... -${fmtMoney(discount, c)}`)
  if (inv.depositPaid > 0) lines.push(`Deposit paid ....... -${fmtMoney(inv.depositPaid, c)}`)
  lines.push(inv.status === 'paid' ? `*PAID ....... ${fmtMoney(total, c)}*` : `*BALANCE DUE ....... ${fmtMoney(balance, c)}*`)
  lines.push('─────────────')
  if (settings.bankName || settings.accountNumber)
    lines.push(`Pay to: ${settings.bankName} ${settings.accountNumber} (${settings.accountName})`)
  lines.push('Thank you! 🙏')
  return lines.join('\n')
}

// unpaid = money not yet collected on active (non-delivered) orders
export function dashboardStats(orders: Order[]) {
  const active = orders.filter((o) => o.status !== 'delivered')
  const dueThisWeek = active.filter((o) => {
    if (!o.dueDate) return false
    const d = daysUntil(o.dueDate)
    return d >= 0 && d <= 7
  }).length
  const overdue = active.filter((o) => o.dueDate && daysUntil(o.dueDate) < 0).length
  const unpaid = active.reduce((s, o) => s + Math.max(0, o.price - o.deposit), 0)
  return { dueThisWeek, overdue, unpaid }
}

declare global {
  interface Window {
    goatcounter?: { count: (opts: { path: string; title?: string; event: boolean }) => void }
  }
}

export function track(path: 'opened' | 'engaged' | 'waitlist-click') {
  try {
    window.goatcounter?.count({ path, event: true })
  } catch {
    // analytics must never break the demo
  }
}
