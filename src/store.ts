import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Consultation, Customer, Data, Invoice, Order, Settings, Staff, Template } from './types'
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
  addStaff: (s: Staff) => void
  updateStaff: (id: string, patch: Partial<Staff>) => void
  deleteStaff: (id: string) => void
  signIn: (id: string) => void
  signOut: () => void
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
      addStaff: (st) => set((s) => ({ staff: [...s.staff, st] })),
      updateStaff: (id, patch) =>
        set((s) => ({ staff: s.staff.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      // Their orders stay put and simply go back to unassigned — deleting a
      // person must never delete the shop's work.
      deleteStaff: (id) =>
        set((s) => ({
          staff: s.staff.filter((x) => x.id !== id),
          orders: s.orders.map((o) => (o.assignedTo === id ? { ...o, assignedTo: undefined } : o)),
          currentStaffId: s.currentStaffId === id ? '' : s.currentStaffId,
        })),
      signIn: (id) =>
        set((s) => ({
          currentStaffId: id,
          staff: s.staff.map((x) => (x.id === id ? { ...x, lastActiveAt: new Date().toISOString() } : x)),
        })),
      signOut: () => set({ currentStaffId: '' }),
      saveSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      dismissBanner: () => set({ bannerDismissed: true }),
      resetDemo: () => set({ ...makeSeed() }),
    }),
    {
      name: 'bt_data_v1',
      version: 3,
      partialize: (s) => ({
        templates: s.templates,
        customers: s.customers,
        orders: s.orders,
        invoices: s.invoices,
        consultations: s.consultations,
        staff: s.staff,
        currentStaffId: s.currentStaffId,
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
        const staff = repairStaff(current.staff, prev.staff)
        return {
          ...current,
          ...prev,
          settings: repairSettings(current.settings, prev.settings),
          consultations: prev.consultations ?? current.consultations.filter((c) => ids.has(c.customerId)),
          staff,
          currentStaffId: repairCurrentStaff(staff, prev.currentStaffId),
        }
      },
    },
  ),
)

/**
 * Everyone who saved data before staff existed comes back as a one-person shop
 * with themselves as owner — the same state a brand-new visitor gets, so the
 * app behaves exactly as it did for them until they add somebody.
 */
function repairStaff(seed: Staff[], saved?: Staff[]): Staff[] {
  if (!Array.isArray(saved) || saved.length === 0) return seed
  const cleaned = saved.filter((s) => s && typeof s.id === 'string' && typeof s.name === 'string')
  if (cleaned.length === 0) return seed
  // A shop with no owner can never be administered again, so promote the first
  // person rather than leaving the staff page permanently unreachable.
  return cleaned.some((s) => s.role === 'owner')
    ? cleaned
    : cleaned.map((s, i) => (i === 0 ? { ...s, role: 'owner' as const } : s))
}

/**
 * A saved session pointing at somebody who no longer exists must fall back to
 * the lock screen, not to an undefined user with no permissions at all. The
 * one-person shop signs itself straight in — there is nobody to choose between.
 */
function repairCurrentStaff(staff: Staff[], saved?: string): string {
  if (staff.length === 1) return staff[0]!.id
  return typeof saved === 'string' && staff.some((s) => s.id === saved) ? saved : ''
}

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
