import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Consultation, Customer, Data, Invoice, Order, Settings, Template } from './types'
import { makeSeed } from './seed'

type Store = Data & {
  addCustomer: (c: Customer) => void
  updateCustomer: (id: string, patch: Partial<Customer>) => void
  deleteCustomer: (id: string) => void
  addOrder: (o: Order) => void
  updateOrder: (id: string, patch: Partial<Order>) => void
  deleteOrder: (id: string) => void
  addInvoice: (i: Invoice) => void
  updateInvoice: (id: string, patch: Partial<Invoice>) => void
  addTemplate: (t: Template) => void
  updateTemplate: (id: string, patch: Partial<Template>) => void
  deleteTemplate: (id: string) => void
  addConsultation: (c: Consultation) => void
  updateConsultation: (id: string, patch: Partial<Consultation>) => void
  saveSettings: (patch: Partial<Settings>) => void
  dismissBanner: () => void
  resetDemo: () => void
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      ...makeSeed(),
      addCustomer: (c) => set((s) => ({ customers: [c, ...s.customers] })),
      updateCustomer: (id, patch) =>
        set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCustomer: (id) =>
        set((s) => ({
          customers: s.customers.filter((c) => c.id !== id),
          orders: s.orders.filter((o) => o.customerId !== id),
        })),
      addOrder: (o) => set((s) => ({ orders: [o, ...s.orders] })),
      updateOrder: (id, patch) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
      deleteOrder: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),
      addInvoice: (i) => set((s) => ({ invoices: [i, ...s.invoices] })),
      updateInvoice: (id, patch) =>
        set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      addTemplate: (t) => set((s) => ({ templates: [...s.templates, t] })),
      updateTemplate: (id, patch) =>
        set((s) => ({ templates: s.templates.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      addConsultation: (c) => set((s) => ({ consultations: [c, ...s.consultations] })),
      updateConsultation: (id, patch) =>
        set((s) => ({ consultations: s.consultations.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      saveSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      dismissBanner: () => set({ bannerDismissed: true }),
      resetDemo: () => set({ ...makeSeed() }),
    }),
    {
      name: 'bt_data_v1',
      version: 2,
      partialize: (s) => ({
        templates: s.templates,
        customers: s.customers,
        orders: s.orders,
        invoices: s.invoices,
        consultations: s.consultations,
        settings: s.settings,
        bannerDismissed: s.bannerDismissed,
      }),
      // Repair happens in `merge`, NOT in `migrate`. migrate only fires when the
      // stored version differs, so a blob already stamped with the current
      // version but written by a half-updated build keeps its gaps forever —
      // and a `settings` with no `availability` white-screens the settings page
      // with no way for someone on a phone to recover. merge runs on every
      // rehydrate, so every load heals whatever it finds.
      merge: (persisted, current) => {
        const prev = (persisted ?? {}) as Partial<Data>
        // Seeded calls are a gift to returning users so the feature is visible
        // without a reset — but only the ones whose customer they still have.
        // A call pointing at a deleted customer has nowhere to save measurements.
        const ids = new Set((prev.customers ?? current.customers).map((c) => c.id))
        return {
          ...current,
          ...prev,
          settings: repairSettings(current.settings, prev.settings),
          consultations: prev.consultations ?? current.consultations.filter((c) => ids.has(c.customerId)),
        }
      },
    },
  ),
)

/**
 * Fills anything the saved settings are missing from the fresh seed, field by
 * field. `availability` is checked down to its own keys because it is the one
 * shape a component reads without guarding — a missing `days` array is what
 * took the page down in the first place.
 */
function repairSettings(seed: Settings, saved?: Partial<Settings>): Settings {
  const merged = { ...seed, ...saved }
  const a = saved?.availability
  const slot = Number(a?.slotMins)
  merged.availability = {
    days: Array.isArray(a?.days) ? a.days : seed.availability.days,
    from: typeof a?.from === 'string' ? a.from : seed.availability.from,
    to: typeof a?.to === 'string' ? a.to : seed.availability.to,
    slotMins: Number.isFinite(slot) && slot > 0 ? slot : seed.availability.slotMins,
  }
  if (merged.callChannel !== 'whatsapp' && merged.callChannel !== 'meet' && merged.callChannel !== 'zoom')
    merged.callChannel = seed.callChannel
  if (typeof merged.callLink !== 'string') merged.callLink = seed.callLink
  return merged
}
