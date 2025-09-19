import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { apiUrl } from '../utils/api';

const PaymentStatementModal = ({
    isOpen,
    onClose,
    statement,
    statementDetails,
    loading,
    onPaymentStatusUpdate
}) => {
    const { token } = useContext(AuthContext);
    const { showPaymentToast, showErrorToast, showConfirmModal } = useNotifications();
    const [markingAsPaid, setMarkingAsPaid] = useState(false);

    if (!isOpen) return null;

    const handleMarkAsPaid = () => {
        showConfirmModal(
            "Μαρκάρισμα ως Πληρωμένη",
            `Είστε σίγουροι ότι θέλετε να μαρκάρετε την ταμειακή κατάσταση #${statement?.id} ως πληρωμένη; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`,
            "warning",
            async () => {
                setMarkingAsPaid(true);
                try {
                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    await axios.patch(apiUrl(`/api/payments/statements/${statement.id}/mark-paid`), {}, config);
                    showPaymentToast('marked_paid', statement.id);
                    onPaymentStatusUpdate(); // Refresh the parent data
                    onClose(); // Close the modal
                } catch (error) {
                    console.error("Failed to mark as paid", error);
                    showErrorToast('Σφάλμα Ενημέρωσης', error.response?.data?.message || 'Σφάλμα κατά το μαρκάρισμα ως πληρωμένη');
                } finally {
                    setMarkingAsPaid(false);
                }
            }
        );
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'Draft': { emoji: '📝', class: 'draft', text: 'Εκκρεμής' },
            'Paid': { emoji: '✅', class: 'paid', text: 'Πληρωμένη' }
        };
        const statusInfo = statusMap[status] || { emoji: '📋', class: 'default', text: status };
        return { ...statusInfo, display: `${statusInfo.emoji} ${statusInfo.text}` };
    };

    const statusInfo = getStatusBadge(statement?.status);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <style>
                {`
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        backdrop-filter: blur(5px);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                        padding: 20px;
                    }

                    .modal-content {
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        max-width: 900px;
                        width: 100%;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        position: relative;
                    }

                    .modal-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid rgba(102, 126, 234, 0.1);
                    }

                    .modal-title {
                        font-size: 1.8rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                    }

                    .close-button {
                        background: none;
                        border: none;
                        font-size: 2rem;
                        cursor: pointer;
                        color: #6b7280;
                        transition: all 0.3s ease;
                        padding: 5px;
                        border-radius: 50%;
                    }

                    .close-button:hover {
                        color: #ef4444;
                        background: rgba(239, 68, 68, 0.1);
                    }

                    .statement-info {
                        background: rgba(102, 126, 234, 0.1);
                        border-radius: 15px;
                        padding: 25px;
                        margin-bottom: 30px;
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                    }

                    .info-item {
                        text-align: center;
                    }

                    .info-label {
                        font-size: 0.9rem;
                        color: #6b7280;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 8px;
                    }

                    .info-value {
                        font-size: 1.2rem;
                        font-weight: 700;
                        color: #374151;
                    }

                    .info-value.amount {
                        font-size: 1.4rem;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    }

                    .status-badge {
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 0.9rem;
                        font-weight: 600;
                        color: white;
                        display: inline-block;
                    }

                    .status-badge.draft {
                        background: linear-gradient(135deg, #f59e0b, #d97706);
                        box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
                    }

                    .status-badge.paid {
                        background: linear-gradient(135deg, #10b981, #059669);
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    }

                    .applications-section {
                        margin-bottom: 30px;
                    }

                    .section-title {
                        font-size: 1.4rem;
                        font-weight: 700;
                        color: #374151;
                        margin-bottom: 20px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .applications-table {
                        width: 100%;
                        background: rgba(255, 255, 255, 0.8);
                        backdrop-filter: blur(10px);
                        border-radius: 15px;
                        overflow: hidden;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                    }

                    .applications-table thead {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                    }

                    .applications-table th,
                    .applications-table td {
                        padding: 15px;
                        text-align: left;
                        border-bottom: 1px solid rgba(102, 126, 234, 0.1);
                    }

                    .applications-table th {
                        font-weight: 600;
                        font-size: 0.9rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .applications-table tbody tr {
                        transition: all 0.3s ease;
                    }

                    .applications-table tbody tr:hover {
                        background: rgba(102, 126, 234, 0.05);
                    }

                    .applications-table tbody tr:last-child td {
                        border-bottom: none;
                    }

                    .loading-state {
                        text-align: center;
                        padding: 50px;
                        color: #6b7280;
                    }

                    .loading-spinner {
                        display: inline-block;
                        width: 30px;
                        height: 30px;
                        border: 3px solid rgba(102, 126, 234, 0.3);
                        border-top: 3px solid #667eea;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 15px;
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    .empty-state {
                        text-align: center;
                        padding: 40px;
                        color: #6b7280;
                    }

                    .actions-section {
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 2px solid rgba(102, 126, 234, 0.1);
                        display: flex;
                        justify-content: center;
                        gap: 15px;
                    }

                    .mark-paid-button {
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                        font-size: 1rem;
                        position: relative;
                        overflow: hidden;
                    }

                    .mark-paid-button:disabled {
                        opacity: 0.7;
                        cursor: not-allowed;
                        transform: none !important;
                    }

                    .mark-paid-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .mark-paid-button:not(:disabled):hover::before {
                        left: 100%;
                    }

                    .mark-paid-button:not(:disabled):hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
                    }

                    .paid-date {
                        font-size: 0.9rem;
                        color: #059669;
                        font-style: italic;
                        margin-top: 5px;
                    }

                    @media (max-width: 768px) {
                        .modal-content {
                            padding: 20px;
                            margin: 10px;
                        }

                        .statement-info {
                            grid-template-columns: 1fr;
                            text-align: center;
                        }

                        .applications-table {
                            font-size: 0.9rem;
                        }

                        .applications-table th,
                        .applications-table td {
                            padding: 10px;
                        }
                    }
                `}
            </style>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        📊 Ταμειακή Κατάσταση #{statement?.id}
                    </h2>
                    <button className="close-button" onClick={onClose}>
                        ×
                    </button>
                </div>

                {statement && (
                    <div className="statement-info">
                        <div className="info-item">
                            <div className="info-label">Παραλήπτης</div>
                            <div className="info-value">{statement.recipient_name}</div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">Συνολικό Ποσό</div>
                            <div className="info-value amount">
                                {parseFloat(statement.total_amount || 0).toFixed(2)} €
                            </div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">Κατάσταση</div>
                            <div className="info-value">
                                <span className={`status-badge ${statusInfo.class}`}>
                                    {statusInfo.display}
                                </span>
                                {statement.paid_date && (
                                    <div className="paid-date">
                                        Πληρώθηκε: {new Date(statement.paid_date).toLocaleDateString('el-GR')}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="info-item">
                            <div className="info-label">Ημερομηνία Δημιουργίας</div>
                            <div className="info-value">
                                {new Date(statement.created_at).toLocaleDateString('el-GR')}
                            </div>
                        </div>
                    </div>
                )}

                <div className="applications-section">
                    <h3 className="section-title">
                        📝 Αιτήσεις Ταμειακής
                    </h3>

                    {loading ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            <p>Φόρτωση λεπτομερειών...</p>
                        </div>
                    ) : statementDetails && statementDetails.length > 0 ? (
                        <table className="applications-table">
                            <thead>
                                <tr>
                                    <th>Πελάτης</th>
                                    <th>Δυναμικό Πεδίο</th>
                                    <th>Εταιρία</th>
                                    <th>Αμοιβή</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statementDetails.map((item, index) => (
                                    <tr key={`${item.application_id}-${index}`}>
                                        <td>{item.customer_name}</td>
                                        <td>
                                            {item.dynamic_field_value || '-'}
                                            {item.dynamic_field_label && (
                                                <div style={{fontSize: '0.8rem', color: '#6b7280'}}>
                                                    ({item.dynamic_field_label})
                                                </div>
                                            )}
                                        </td>
                                        <td>{item.company_name}</td>
                                        <td>
                                            <strong>
                                                {parseFloat(item.commission_amount || 0).toFixed(2)} €
                                            </strong>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty-state">
                            <p>Δεν βρέθηκαν αιτήσεις για αυτή την ταμειακή κατάσταση.</p>
                        </div>
                    )}
                </div>

                {statement?.status === 'Draft' && (
                    <div className="actions-section">
                        <button
                            onClick={handleMarkAsPaid}
                            disabled={markingAsPaid}
                            className="mark-paid-button"
                        >
                            {markingAsPaid ? '⏳ Πληρωμή...' : '✅ Πλήρωσα τον Συνεργάτη'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentStatementModal;