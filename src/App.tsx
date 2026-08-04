import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from './components/ui'
import { useMe } from './components/staff'
import { can, type Ability } from './perm'
import Welcome from './pages/Welcome'
import Lock from './pages/Lock'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import OrderForm from './pages/OrderForm'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import CustomerForm from './pages/CustomerForm'
import Invoices from './pages/Invoices'
import InvoiceNew from './pages/InvoiceNew'
import InvoiceDetail from './pages/InvoiceDetail'
import Settings from './pages/Settings'
import StaffDetail from './pages/StaffDetail'
import TemplateEditor from './pages/TemplateEditor'
import Consultations from './pages/Consultations'
import ConsultDetail from './pages/ConsultDetail'
import ConsultShare from './pages/ConsultShare'
import ConsultBook from './pages/ConsultBook'
import ConsultReview from './pages/ConsultReview'

function Home() {
  return localStorage.getItem('bt_seen_welcome') ? <Navigate to="/orders" replace /> : <Welcome />
}

/**
 * Hiding a button is a courtesy; this is the actual gate. Every blocked screen
 * is also unreachable by typing its URL, because the first thing anyone does
 * with a hash router is edit the hash.
 */
function Only({ ability, children }: { ability: Ability; children: ReactNode }) {
  return can(useMe(), ability) ? <>{children}</> : <Navigate to="/orders" replace />
}

/**
 * Nothing renders until somebody is signed in. A one-person shop is signed in
 * permanently (the store keeps `currentStaffId` pointed at them), so this is
 * invisible until the owner actually hires someone.
 */
function Shop() {
  if (!useMe()) return <Lock />
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/orders/:id" element={<OrderDetail />} />
      <Route path="/orders/:id/edit" element={<Only ability="editRecords"><OrderForm /></Only>} />
      <Route path="/order/new" element={<Only ability="editRecords"><OrderForm /></Only>} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/customers/:id" element={<CustomerDetail />} />
      <Route path="/customers/:id/edit" element={<Only ability="editRecords"><CustomerForm /></Only>} />
      <Route path="/customer/new" element={<Only ability="editRecords"><CustomerForm /></Only>} />
      <Route path="/invoices" element={<Only ability="invoices"><Invoices /></Only>} />
      <Route path="/invoices/:id" element={<Only ability="invoices"><InvoiceDetail /></Only>} />
      <Route path="/invoice/new" element={<Only ability="invoices"><InvoiceNew /></Only>} />
      {/* consultations — /booked is the tailor's half of the WhatsApp round
          trip and carries the customer's phone, so it needs the same gate as
          the rest of intake. /book is the customer's half and lives outside. */}
      <Route path="/consultations" element={<Consultations />} />
      <Route path="/consultations/:id" element={<ConsultDetail />} />
      <Route path="/consult/share" element={<Only ability="editRecords"><ConsultShare /></Only>} />
      <Route path="/booked/:payload" element={<Only ability="editRecords"><ConsultReview /></Only>} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/staff/:id" element={<Only ability="manageStaff"><StaffDetail /></Only>} />
      {/* templates now live inline in settings; keep the old path working */}
      <Route path="/settings/templates" element={<Navigate to="/settings" replace />} />
      <Route path="/settings/templates/:id" element={<Only ability="editRecords"><TemplateEditor /></Only>} />
      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* The customer's booking page. It belongs to whoever was sent the
            link, not to the shop, so it must never meet a lock screen. */}
        <Route path="/book/:payload" element={<ConsultBook />} />
        <Route path="*" element={<Shop />} />
      </Routes>
      <Toaster />
    </HashRouter>
  )
}
