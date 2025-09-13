import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import NewApplicationPage from './pages/NewApplicationPage';
import EditApplicationPage from './pages/EditApplicationPage';
import PaymentsPage from './pages/PaymentsPage';
import AdminPage from './pages/AdminPage';
import AdminFieldsPage from './pages/AdminFieldsPage';
import AdminCompaniesPage from './pages/AdminCompaniesPage';
import AdminRecycleBinPage from './pages/AdminRecycleBinPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminBillingSettingsPage from './pages/AdminBillingSettingsPage';
import AdminInvoicingPage from './pages/AdminInvoicingPage';
import AdminTermsPage from './pages/AdminTermsPage';
import CommissionsPage from './pages/CommissionsPage';
import RenewalsPage from './pages/RenewalsPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import ReportingPage from './pages/ReportingPage';
import NotificationsPage from './pages/NotificationsPage';
import AdvancedApplicationsPage from './pages/AdvancedApplicationsPage';
import ProfilePage from './pages/ProfilePage';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import FinanceProtectedRoute from './components/FinanceProtectedRoute';
import TermsGuard from './components/TermsGuard';
import TermsPage from './pages/TermsPage';
import './App.css';

function App() {
  const { loading } = useContext(AuthContext);

  if (loading) {
      return <div>Loading Application...</div> // Οθόνη φόρτωσης για να αποφύγουμε "flashing"
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/terms" element={<TermsPage />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/application/new" element={<NewApplicationPage />} />
          <Route path="/application/edit/:id" element={<EditApplicationPage />} />
          <Route path="/application/:id" element={<ApplicationDetailPage />} />
          <Route path="/renewals" element={<RenewalsPage />} />
          <Route path="/applications" element={<AdvancedApplicationsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route element={<FinanceProtectedRoute />}>
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/commissions" element={<CommissionsPage />} />
            <Route path="/reporting" element={<ReportingPage />} />
          </Route>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/fields" element={<AdminFieldsPage />} />
          <Route path="/admin/companies" element={<AdminCompaniesPage />} />
          <Route path="/admin/recycle-bin" element={<AdminRecycleBinPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/billing-settings" element={<AdminBillingSettingsPage />} />
          <Route path="/admin/invoicing" element={<AdminInvoicingPage />} />
          <Route path="/admin/terms" element={<AdminTermsPage />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;