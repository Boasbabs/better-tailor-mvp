export type Template = { id: string; name: string; fields: string[] }

export type MeasurementSet = { templateId: string; values: Record<string, number | string> }

export type Customer = {
  id: string
  name: string
  phone: string
  area: string
  gender?: 'male' | 'female'
  sets: MeasurementSet[]
  createdAt: string
}

export type OrderStatus = 'new' | 'sewing' | 'ready' | 'delivered'

export type Order = {
  id: string
  customerId: string
  garment: string
  templateId: string
  measurements: Record<string, number | string> // snapshot, editable per order
  styleId: string
  fabricId: string
  price: number
  deposit: number
  dueDate?: string // ISO date
  status: OrderStatus
  notes: string
  createdAt: string
}

export type InvoiceStatus = 'unpaid' | 'part-paid' | 'paid'

export type Invoice = {
  id: string
  number: string // e.g. BT-0007
  customerId: string
  lines: { label: string; amount: number; orderId?: string }[]
  discount: { kind: 'flat' | 'percent'; value: number } | null
  depositPaid: number
  status: InvoiceStatus
  createdAt: string
}

export type Currency = '₦' | '€' | '$' | '£' | 'GH₵'

// ---------- consultations ----------

/** WhatsApp needs no link — it dials the phone number we already store. */
export type CallChannel = 'whatsapp' | 'meet' | 'zoom'

/** One window for every working day. Booking horizon and notice are fixed in
 *  code (see consult.ts) so the tailor only ever answers three questions. */
export type Availability = {
  days: number[] // 0 = Sunday … 6 = Saturday
  from: string // 'HH:MM' wall clock
  to: string // 'HH:MM' wall clock
  slotMins: number
}

export type ConsultStatus = 'upcoming' | 'done' | 'cancelled'

export type Consultation = {
  id: string
  customerId: string
  name: string // snapshot — the customer may be renamed later
  phone: string
  date: string // 'YYYY-MM-DD'
  time: string // 'HH:MM', the tailor's wall clock
  durationMins: number
  channel: CallChannel
  link: string // meet/zoom room; '' for whatsapp
  styleId: string // what they want sewn — picks the template below
  templateId: string
  photo: string // data-URL thumbnail carried in the link; '' if none
  photoPending: boolean // true = too big for the link, coming over WhatsApp
  note: string
  status: ConsultStatus
  createdAt: string
}

export type Settings = {
  businessName: string
  tagline: string
  phone: string
  bankName: string
  accountNumber: string
  accountName: string
  currency: Currency
  callChannel: CallChannel
  callLink: string
  availability: Availability
}

export type Data = {
  templates: Template[]
  customers: Customer[]
  orders: Order[]
  invoices: Invoice[]
  consultations: Consultation[]
  settings: Settings
  bannerDismissed: boolean
}
