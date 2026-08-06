import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from './components/ui'
import Welcome from './pages/Welcome'
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
import TemplateEditor from './pages/TemplateEditor'
import Consultations from './pages/Consultations'
import ConsultDetail from './pages/ConsultDetail'
import ConsultShare from './pages/ConsultShare'
import ConsultBook from './pages/ConsultBook'
import ConsultReview from './pages/ConsultReview'

function Home() {
  return localStorage.getItem('bt_seen_welcome') ? <Navigate to="/orders" replace /> : <Welcome />
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/orders/:id/edit" element={<OrderForm />} />
        <Route path="/order/new" element={<OrderForm />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/customers/:id/edit" element={<CustomerForm />} />
        <Route path="/customer/new" element={<CustomerForm />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/invoice/new" element={<InvoiceNew />} />
        {/* consultations — /book and /booked are the two halves of the
            WhatsApp round trip and are the only routes a customer ever sees */}
        <Route path="/consultations" element={<Consultations />} />
        <Route path="/consultations/:id" element={<ConsultDetail />} />
        <Route path="/consult/share" element={<ConsultShare />} />
        <Route path="/book/:payload" element={<ConsultBook />} />
        <Route path="/booked/:payload" element={<ConsultReview />} />
        <Route path="/settings" element={<Settings />} />
        {/* templates now live inline in settings; keep the old path working */}
        <Route path="/settings/templates" element={<Navigate to="/settings" replace />} />
        <Route path="/settings/templates/:id" element={<TemplateEditor />} />
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
      <Toaster />
    </HashRouter>
  )
}
