import React, { useState, useEffect } from 'react';
import './ClawbackModal.css';

const ClawbackModal = ({
    isOpen,
    onClose,
    onConfirm,
    applicationId,
    fieldId,
    fieldLabel,
    commissionAmount = 0,
    loading = false
}) => {
    const [percentage, setPercentage] = useState(12);
    const [reason, setReason] = useState('');
    const [calculatedAmount, setCalculatedAmount] = useState(0);

    useEffect(() => {
        // Calculate the clawback amount based on percentage
        const amount = (commissionAmount * percentage / 12).toFixed(2);
        setCalculatedAmount(amount);
    }, [percentage, commissionAmount]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!reason.trim()) {
            alert('Παρακαλώ εισάγετε λόγο για το clawback');
            return;
        }

        onConfirm({
            percentage: parseInt(percentage),
            reason: reason.trim(),
            amount: parseFloat(calculatedAmount)
        });
    };

    const handleClose = () => {
        if (!loading) {
            setPercentage(12);
            setReason('');
            setCalculatedAmount(0);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="clawback-modal-overlay" onClick={handleClose}>
            <div className="clawback-modal" onClick={e => e.stopPropagation()}>
                <div className="clawback-modal-header">
                    <h3>Δημιουργία Clawback</h3>
                    <button
                        className="clawback-modal-close"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="clawback-modal-form">
                    <div className="clawback-field-info">
                        <p><strong>Πεδίο:</strong> {fieldLabel}</p>
                        <p><strong>Αμοιβή Πεδίου:</strong> €{commissionAmount.toFixed(2)}</p>
                    </div>

                    <div className="clawback-form-group">
                        <label htmlFor="clawback-percentage">
                            Ποσοστό Clawback (δωδέκατα):
                        </label>
                        <select
                            id="clawback-percentage"
                            value={percentage}
                            onChange={(e) => setPercentage(parseInt(e.target.value))}
                            disabled={loading}
                            required
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                                <option key={num} value={num}>
                                    {num}/12 {((num / 12) * 100).toFixed(1)}%
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="clawback-amount-preview">
                        <p><strong>Ποσό Clawback:</strong> €{calculatedAmount}</p>
                        <small>
                            Θα αφαιρεθεί από μελλοντικές ταμειακές καταστάσεις
                        </small>
                    </div>

                    <div className="clawback-form-group">
                        <label htmlFor="clawback-reason">
                            Λόγος Clawback:
                        </label>
                        <textarea
                            id="clawback-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Εισάγετε τον λόγο για το clawback..."
                            rows={4}
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="clawback-modal-actions">
                        <button
                            type="button"
                            className="clawback-modal-cancel"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Ακύρωση
                        </button>
                        <button
                            type="submit"
                            className="clawback-modal-confirm"
                            disabled={loading}
                        >
                            {loading ? 'Δημιουργία...' : 'Δημιουργία Clawback'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClawbackModal;