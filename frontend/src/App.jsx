import React, { useContext, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import FinanceProtectedRoute from './components/FinanceProtectedRoute';
import './App.css';
import './styles/Mobile.css';

// Lazy load all pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage'));
const NewApplicationPage = lazy(() => import('./pages/NewApplicationPage'));
const EditApplicationPage = lazy(() => import('./pages/EditApplicationPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AdminFieldsPage = lazy(() => import('./pages/AdminFieldsPage'));
const AdminCompaniesPage = lazy(() => import('./pages/AdminCompaniesPage'));
const AdminRecycleBinPage = lazy(() => import('./pages/AdminRecycleBinPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminBillingSettingsPage = lazy(() => import('./pages/AdminBillingSettingsPage'));
const AdminInvoicingPage = lazy(() => import('./pages/AdminInvoicingPage'));
const CommissionsPage = lazy(() => import('./pages/CommissionsPage'));
const RenewalsPage = lazy(() => import('./pages/RenewalsPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('./pages/CustomerDetailPage'));
const ReportingPage = lazy(() => import('./pages/ReportingPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const InfoPortalPage = lazy(() => import('./pages/InfoPortalPage'));

function App() {
  const { loading } = useContext(AuthContext);

  if (loading) {
      return <div>Loading Application...</div> // Οθόνη φόρτωσης για να αποφύγουμε "flashing"
  }

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Suspense fallback={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontSize: '1.2rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '15px'
            }}>
              <div style={{
                border: '3px solid rgba(255,255,255,0.3)',
                borderTop: '3px solid white',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                animation: 'spin 1s linear infinite'
              }}></div>
              Φόρτωση...
            </div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        }>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/application/new" element={<NewApplicationPage />} />
              <Route path="/application/edit/:id" element={<EditApplicationPage />} />
              <Route path="/application/:id" element={<ApplicationDetailPage />} />
              <Route path="/renewals" element={<RenewalsPage />} />
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/infoportal" element={<InfoPortalPage />} />
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
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
        </Suspense>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;