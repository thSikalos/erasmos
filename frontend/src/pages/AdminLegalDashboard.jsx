import React, { useState, useEffect, useCallback } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const AdminLegalDashboard = () => {
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    overview: {
      totalUsers: 0,
      usersWithValidAcceptance: 0,
      usersWithExpiredAcceptance: 0,
      usersPendingAcceptance: 0,
      emailVerificationRate: 0,
      overallComplianceScore: 0
    },
    recentAcceptances: [],
    pendingVerifications: [],
    rightsRequests: [],
    complianceAlerts: []
  });

  // Date range for filtering
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    to: new Date().toISOString().split('T')[0] // today
  });

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/legal/admin/dashboard?from=${dateRange.from}&to=${dateRange.to}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Αποτυχία φόρτωσης δεδομένων dashboard');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [token, dateRange.from, dateRange.to]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Refresh data
  const handleRefresh = () => {
    loadDashboardData();
  };

  // Export compliance report
  const exportComplianceReport = async () => {
    try {
      const response = await fetch(`/api/legal/admin/export?from=${dateRange.from}&to=${dateRange.to}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Αποτυχία εξαγωγής αναφοράς');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${dateRange.from}-${dateRange.to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
      setError('Αποτυχία εξαγωγής αναφοράς');
    }
  };

  // Verify pending email
  const resendVerificationEmail = async (acceptanceId) => {
    try {
      const response = await fetch(`/api/legal/admin/resend-verification/${acceptanceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Αποτυχία αποστολής email');
      }

      // Refresh data to show updated status
      loadDashboardData();
    } catch (error) {
      console.error('Error resending verification email:', error);
      setError('Αποτυχία αποστολής email επιβεβαίωσης');
    }
  };

  // Export signed contract PDF
  const exportSignedContract = async (acceptanceId, userEmail) => {
    try {
      const response = await fetch(`/api/legal/contract/${acceptanceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Αποτυχία εξαγωγής συμβολαίου');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `legal-contract-${userEmail}-${acceptanceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting signed contract:', error);
      setError('Αποτυχία εξαγωγής συμβολαίου');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <h2>Φόρτωση Legal Dashboard...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2>❌ Σφάλμα</h2>
          <p>{error}</p>
          <button onClick={handleRefresh} style={styles.retryButton}>
            🔄 Δοκιμή Ξανά
          </button>
        </div>
      </div>
    );
  }

  const { overview, recentAcceptances, pendingVerifications, rightsRequests, complianceAlerts } = dashboardData;

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>⚖️ Legal Compliance Dashboard</h1>
          <p style={styles.subtitle}>
            Πλήρη παρακολούθηση νομικής συμμόρφωσης και GDPR compliance
          </p>
        </div>
        <div style={styles.headerActions}>
          <input
            type="date"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            style={styles.dateInput}
          />
          <span style={styles.dateSeparator}>έως</span>
          <input
            type="date"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            style={styles.dateInput}
          />
          <button onClick={handleRefresh} style={styles.refreshButton}>
            🔄 Ανανέωση
          </button>
          <button onClick={exportComplianceReport} style={styles.exportButton}>
            📊 Εξαγωγή Αναφοράς
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={styles.overviewGrid}>
        <div style={styles.overviewCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>👥 Σύνολο Χρηστών</h3>
            <div style={styles.cardValue}>{overview.totalUsers}</div>
          </div>
          <div style={styles.cardFooter}>
            Συνολικοί εγγεγραμμένοι χρήστες
          </div>
        </div>

        <div style={styles.overviewCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>✅ Έγκυρες Αποδοχές</h3>
            <div style={styles.cardValue}>{overview.usersWithValidAcceptance}</div>
          </div>
          <div style={styles.cardFooter}>
            {overview.totalUsers > 0 ?
              `${((overview.usersWithValidAcceptance / overview.totalUsers) * 100).toFixed(1)}% του συνόλου` :
              'N/A'
            }
          </div>
        </div>

        <div style={styles.overviewCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>⏳ Εκκρεμείς Αποδοχές</h3>
            <div style={{...styles.cardValue, color: '#f59e0b'}}>{overview.usersPendingAcceptance}</div>
          </div>
          <div style={styles.cardFooter}>
            Χρήστες χωρίς νομική αποδοχή
          </div>
        </div>

        <div style={styles.overviewCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>📧 Επιβεβαίωση Email</h3>
            <div style={styles.cardValue}>{overview.emailVerificationRate}%</div>
          </div>
          <div style={styles.cardFooter}>
            Ποσοστό επιβεβαίωσης email
          </div>
        </div>

        <div style={styles.overviewCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>🎯 Compliance Score</h3>
            <div style={{
              ...styles.cardValue,
              color: overview.overallComplianceScore >= 90 ? '#10b981' :
                     overview.overallComplianceScore >= 70 ? '#f59e0b' : '#ef4444'
            }}>
              {overview.overallComplianceScore}/100
            </div>
          </div>
          <div style={styles.cardFooter}>
            Συνολικό σκορ συμμόρφωσης
          </div>
        </div>

        <div style={styles.overviewCard}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>⚠️ Ληγμένες Αποδοχές</h3>
            <div style={{...styles.cardValue, color: '#ef4444'}}>{overview.usersWithExpiredAcceptance}</div>
          </div>
          <div style={styles.cardFooter}>
            Απαιτείται επανα-αποδοχή
          </div>
        </div>
      </div>

      {/* Compliance Alerts */}
      {complianceAlerts.length > 0 && (
        <div style={styles.alertsSection}>
          <h2 style={styles.sectionTitle}>🚨 Ειδοποιήσεις Συμμόρφωσης</h2>
          <div style={styles.alertsList}>
            {complianceAlerts.map((alert, index) => (
              <div key={index} style={{
                ...styles.alertItem,
                borderColor: alert.severity === 'high' ? '#ef4444' :
                            alert.severity === 'medium' ? '#f59e0b' : '#6b7280'
              }}>
                <div style={styles.alertIcon}>
                  {alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🔵'}
                </div>
                <div style={styles.alertContent}>
                  <h4 style={styles.alertTitle}>{alert.title}</h4>
                  <p style={styles.alertDescription}>{alert.description}</p>
                  <span style={styles.alertTime}>{new Date(alert.created_at).toLocaleString('el-GR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Acceptances and Pending Verifications */}
      <div style={styles.tablesGrid}>
        {/* Recent Acceptances */}
        <div style={styles.tableSection}>
          <h2 style={styles.sectionTitle}>📋 Πρόσφατες Αποδοχές</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableHeaderCell}>Χρήστης</th>
                  <th style={styles.tableHeaderCell}>Email</th>
                  <th style={styles.tableHeaderCell}>Ημερομηνία</th>
                  <th style={styles.tableHeaderCell}>Κατάσταση</th>
                  <th style={styles.tableHeaderCell}>Email Verified</th>
                  <th style={styles.tableHeaderCell}>Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {recentAcceptances.map((acceptance, index) => (
                  <tr key={index} style={styles.tableRow}>
                    <td style={styles.tableCell}>{acceptance.user_name}</td>
                    <td style={styles.tableCell}>{acceptance.user_email}</td>
                    <td style={styles.tableCell}>
                      {new Date(acceptance.acceptance_timestamp).toLocaleDateString('el-GR')}
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: acceptance.is_complete ? '#10b981' : '#f59e0b'
                      }}>
                        {acceptance.is_complete ? 'Ολοκληρωμένη' : 'Εκκρεμής'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: acceptance.email_verified ? '#10b981' : '#ef4444'
                      }}>
                        {acceptance.email_verified ? '✅ Ναι' : '❌ Όχι'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      {acceptance.is_complete && acceptance.email_verified ? (
                        <button
                          onClick={() => exportSignedContract(acceptance.id, acceptance.user_email)}
                          style={{...styles.actionButton, backgroundColor: '#dc2626'}}
                          title="Εξαγωγή Υπογεγραμμένου Συμβολαίου"
                        >
                          📄 PDF
                        </button>
                      ) : (
                        <span style={{fontSize: '0.8rem', color: '#6b7280'}}>
                          {!acceptance.is_complete ? 'Ημιτελές' : 'Αναμονή Email'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Email Verifications */}
        <div style={styles.tableSection}>
          <h2 style={styles.sectionTitle}>📧 Non-Compliant Users</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableHeaderCell}>Χρήστης</th>
                  <th style={styles.tableHeaderCell}>Email</th>
                  <th style={styles.tableHeaderCell}>Ημερομηνία</th>
                  <th style={styles.tableHeaderCell}>Τύπος Προβλήματος</th>
                  <th style={styles.tableHeaderCell}>Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {pendingVerifications.map((verification, index) => (
                  <tr key={index} style={styles.tableRow}>
                    <td style={styles.tableCell}>{verification.user_name || 'N/A'}</td>
                    <td style={styles.tableCell}>{verification.email}</td>
                    <td style={styles.tableCell}>
                      {new Date(verification.sent_at).toLocaleDateString('el-GR')}
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: verification.status === 'pending_verification' ? '#f59e0b' : '#ef4444'
                      }}>
                        {verification.status === 'pending_verification' ? 'Εκκρεμής Email' : 'Χωρίς Legal Acceptance'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      {verification.status === 'pending_verification' && verification.acceptance_id ? (
                        <button
                          onClick={() => resendVerificationEmail(verification.acceptance_id)}
                          style={styles.actionButton}
                        >
                          🔄 Επαναποστολή
                        </button>
                      ) : (
                        <span style={{fontSize: '0.8rem', color: '#6b7280'}}>
                          Χρειάζεται Login
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Data Rights Requests */}
      {rightsRequests.length > 0 && (
        <div style={styles.tableSection}>
          <h2 style={styles.sectionTitle}>📝 Αιτήματα Δικαιωμάτων GDPR</h2>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableHeaderCell}>Χρήστης</th>
                  <th style={styles.tableHeaderCell}>Τύπος Αιτήματος</th>
                  <th style={styles.tableHeaderCell}>Ημερομηνία</th>
                  <th style={styles.tableHeaderCell}>Προθεσμία</th>
                  <th style={styles.tableHeaderCell}>Κατάσταση</th>
                </tr>
              </thead>
              <tbody>
                {rightsRequests.map((request, index) => (
                  <tr key={index} style={styles.tableRow}>
                    <td style={styles.tableCell}>{request.user_email}</td>
                    <td style={styles.tableCell}>{request.request_type}</td>
                    <td style={styles.tableCell}>
                      {new Date(request.request_date).toLocaleDateString('el-GR')}
                    </td>
                    <td style={styles.tableCell}>
                      {new Date(request.deadline).toLocaleDateString('el-GR')}
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: request.status === 'completed' ? '#10b981' :
                                       request.status === 'in_progress' ? '#f59e0b' : '#ef4444'
                      }}>
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    gap: '20px',
    flexWrap: 'wrap'
  },
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 8px 0'
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '1.1rem',
    margin: '0'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '0.9rem'
  },
  dateSeparator: {
    color: '#6b7280',
    fontSize: '0.9rem'
  },
  refreshButton: {
    padding: '8px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: '500'
  },
  exportButton: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.9rem',
    cursor: 'pointer',
    fontWeight: '500'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  overviewCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb'
  },
  cardHeader: {
    marginBottom: '12px'
  },
  cardTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#6b7280',
    margin: '0 0 8px 0'
  },
  cardValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0'
  },
  cardFooter: {
    fontSize: '0.8rem',
    color: '#9ca3af'
  },
  alertsSection: {
    marginBottom: '30px'
  },
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '15px'
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  alertItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '15px',
    background: 'white',
    borderRadius: '8px',
    border: '2px solid',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  alertIcon: {
    fontSize: '1.5rem'
  },
  alertContent: {
    flex: 1
  },
  alertTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    margin: '0 0 4px 0',
    color: '#1f2937'
  },
  alertDescription: {
    fontSize: '0.9rem',
    color: '#6b7280',
    margin: '0 0 4px 0'
  },
  alertTime: {
    fontSize: '0.8rem',
    color: '#9ca3af'
  },
  tablesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
    gap: '30px',
    marginBottom: '30px'
  },
  tableSection: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: '#f9fafb'
  },
  tableHeaderCell: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '0.9rem'
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6'
  },
  tableCell: {
    padding: '12px',
    fontSize: '0.9rem',
    color: '#374151'
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '500',
    color: 'white'
  },
  actionButton: {
    padding: '6px 12px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.8rem',
    cursor: 'pointer'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    gap: '20px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    gap: '20px'
  },
  retryButton: {
    padding: '10px 20px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  }
};

export default AdminLegalDashboard;