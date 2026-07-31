import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Customer, Data, Invoice, Order, Settings, Template } from './types'
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
      saveSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      dismissBanner: () => set({ bannerDismissed: true }),
      resetDemo: () => set({ ...makeSeed() }),
    }),
    {
      name: 'bt_data_v1',
      partialize: (s) => ({
        templates: s.templates,
        customers: s.customers,
        orders: s.orders,
        invoices: s.invoices,
        settings: s.settings,
        bannerDismissed: s.bannerDismissed,
      }),
    },
  ),
)
