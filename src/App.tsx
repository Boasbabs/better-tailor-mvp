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
import Templates from './pages/Templates'
import TemplateEditor from './pages/TemplateEditor'

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
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/templates" element={<Templates />} />
        <Route path="/settings/templates/:id" element={<TemplateEditor />} />
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
      <Toaster />
    </HashRouter>
  )
}
