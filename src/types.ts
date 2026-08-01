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

// An outstanding "fill in your own measurements" link. Only unanswered
// requests live here — saving a submission removes it.
export type MeasurementRequest = {
  id: string
  customerId: string // '' = open link, not tied to anyone yet
  templateIds: string[]
  sentAt: string // ISO datetime
}

export type Currency = '₦' | '€' | '$' | '£' | 'GH₵'

export type Settings = {
  businessName: string
  tagline: string
  phone: string
  bankName: string
  accountNumber: string
  accountName: string
  currency: Currency
}

export type Data = {
  templates: Template[]
  customers: Customer[]
  orders: Order[]
  invoices: Invoice[]
  requests: MeasurementRequest[]
  settings: Settings
  bannerDismissed: boolean
}
