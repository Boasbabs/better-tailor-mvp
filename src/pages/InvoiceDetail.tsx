import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import html2canvas from 'html2canvas-pro'
import { useStore } from '../store'
import { SubShell } from '../components/shell'
import { Icons, InvoicePill, PillButton, useToast } from '../components/ui'
import { fmtDate, fmtMoney, invoiceMath, waPhone, whatsappInvoiceText } from '../lib'

export default function InvoiceDetail() {
  const { id } = useParams()
  const show = useToast((s) => s.show)
  const invoice = useStore((s) => s.invoices.find((i) => i.id === id))
  const customer = useStore((s) => s.customers.find((c) => c.id === invoice?.customerId))
  const settings = useStore((s) => s.settings)
  const updateInvoice = useStore((s) => s.updateInvoice)
  const cardRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  if (!invoice) {
    return (
      <SubShell title="invoice" backTo="/invoices">
        <div className="text-center text-ink/40 py-20">invoice not found</div>
      </SubShell>
    )
  }

  const math = invoiceMath(invoice)
  const cur = settings.currency
  const paid = invoice.status === 'paid'

  const shareWhatsApp = () => {
    const text = whatsappInvoiceText(invoice, customer?.name ?? 'Customer', settings)
    const phone = customer?.phone ? waPhone(customer.phone) : ''
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  const downloadPng = async () => {
    if (!cardRef.current || downloading) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#ffffff', scale: 2, useCORS: true })
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `invoice-${invoice.number}.png`
      a.click()
      show('image saved ✓')
    } catch {
      show("couldn't render the image on this browser")
    } finally {
      setDownloading(false)
    }
  }

  const markPaid = () => {
    updateInvoice(invoice.id, { status: 'paid', depositPaid: math.total })
    show('marked as paid ✓')
  }

  return (
    <SubShell title={invoice.number} backTo="/invoices" right={<InvoicePill status={invoice.status} />}>
      <div className="pb-8 space-y-3">
        {/* the shareable card */}
        <div ref={cardRef} className="bg-white rounded-2xl shadow-sm p-6" style={{ backgroundColor: '#ffffff' }}>
          <div className="text-center">
            <div className="font-display font-bold text-xl lowercase tracking-tight">{settings.businessName}</div>
            {settings.tagline && <div className="text-xs text-ink/45 font-medium mt-0.5">{settings.tagline}</div>}
          </div>

          <div className="mt-5 flex justify-between text-xs font-bold text-ink/45 uppercase tracking-widest">
            <span>invoice {invoice.number}</span>
            <span>{fmtDate(invoice.createdAt)}</span>
          </div>

          <div className="mt-4 bg-card2 rounded-xl p-3" style={{ backgroundColor: '#efefed' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-ink/40">billed to</div>
            <div className="font-bold text-sm mt-0.5">{customer?.name ?? 'Customer'}</div>
            <div className="text-xs text-ink/50">
              {customer?.phone}
              {customer?.area ? ` · ${customer.area}` : ''}
            </div>
          </div>

          <table className="w-full mt-4 text-sm">
            <tbody>
              {invoice.lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-1.5 font-medium text-ink/75">{l.label}</td>
                  <td className="py-1.5 text-right font-semibold whitespace-nowrap">{fmtMoney(l.amount, cur)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-ink/10 mt-2 pt-3 space-y-1.5 text-sm">
            <div className="flex justify-between font-semibold">
              <span className="text-ink/50">subtotal</span>
              <span>{fmtMoney(math.subtotal, cur)}</span>
            </div>
            {math.discount > 0 && (
              <div className="flex justify-between font-semibold">
                <span className="text-ink/50">
                  discount{invoice.discount?.kind === 'percent' ? ` (${invoice.discount.value}%)` : ''}
                </span>
                <span>−{fmtMoney(math.discount, cur)}</span>
              </div>
            )}
            {invoice.depositPaid > 0 && (
              <div className="flex justify-between font-semibold">
                <span className="text-ink/50">deposit paid</span>
                <span>−{fmtMoney(invoice.depositPaid, cur)}</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex justify-between items-baseline">
            <span className="text-sm font-bold uppercase tracking-wide">{paid ? 'paid' : 'balance due'}</span>
            <span className={`font-display font-bold text-3xl ${paid ? '' : ''}`} style={paid ? { color: '#30a46c' } : undefined}>
              {paid ? fmtMoney(math.total, cur) : fmtMoney(math.balance, cur)}
            </span>
          </div>

          {(settings.bankName || settings.accountNumber) && !paid && (
            <div className="mt-4 rounded-xl p-3 text-white" style={{ backgroundColor: '#111111' }}>
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">pay to</div>
              <div className="font-display font-bold text-lg mt-0.5">{settings.accountNumber}</div>
              <div className="text-xs text-white/70 font-medium">
                {settings.bankName} · {settings.accountName}
              </div>
            </div>
          )}

          <div className="text-center text-sm font-bold mt-5">thank you! 🙏</div>
        </div>

        {/* actions */}
        <button
          onClick={shareWhatsApp}
          className="w-full bg-wa text-white rounded-full font-bold text-[15px] px-6 py-3.5 active:scale-95 transition flex items-center justify-center gap-2"
        >
          {Icons.whatsapp('w-5 h-5')} share on WhatsApp
        </button>
        <button
          onClick={downloadPng}
          disabled={downloading}
          className="w-full bg-ink text-white rounded-full font-bold text-[15px] px-6 py-3.5 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {Icons.download()} {downloading ? 'rendering…' : 'download image'}
        </button>
        {!paid && (
          <PillButton variant="light" className="w-full" onClick={markPaid}>
            mark as paid ✓
          </PillButton>
        )}
      </div>
    </SubShell>
  )
}
