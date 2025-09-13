import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const [toast, setToast] = useState(null);
    const [confirmModal, setConfirmModal] = useState(null);

    // Toast utility functions - consistent with PaymentsPage pattern
    const showToast = useCallback((type, title, message, duration = 5000, options = {}) => {
        setToast({
            type,
            title,
            message,
            duration,
            ...options
        });
    }, []);

    const hideToast = useCallback(() => {
        setToast(null);
    }, []);

    // Modal utility functions - consistent with PaymentsPage pattern
    const showConfirmModal = useCallback((title, message, type, onConfirm, options = {}) => {
        setConfirmModal({
            title,
            message,
            type,
            onConfirm,
            confirmText: options.confirmText || "Επιβεβαίωση",
            cancelText: options.cancelText || "Ακύρωση",
            ...options
        });
    }, []);

    const hideConfirmModal = useCallback(() => {
        setConfirmModal(null);
    }, []);

    // Specific toast types for common scenarios
    const showSuccessToast = useCallback((title, message, duration) => {
        showToast('success', title, message, duration);
    }, [showToast]);

    const showErrorToast = useCallback((title, message, duration) => {
        showToast('error', title, message, duration);
    }, [showToast]);

    const showWarningToast = useCallback((title, message, duration) => {
        showToast('warning', title, message, duration);
    }, [showToast]);

    const showInfoToast = useCallback((title, message, duration) => {
        showToast('info', title, message, duration);
    }, [showToast]);

    // Specific modal types for common scenarios
    const showDeleteConfirm = useCallback((itemName, onConfirm) => {
        showConfirmModal(
            "Επιβεβαίωση Διαγραφής",
            `Είστε σίγουροι ότι θέλετε να διαγράψετε ${itemName}; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`,
            "danger",
            onConfirm
        );
    }, [showConfirmModal]);

    const showSaveConfirm = useCallback((message, onConfirm) => {
        showConfirmModal(
            "Επιβεβαίωση Αποθήκευσης",
            message,
            "warning",
            onConfirm
        );
    }, [showConfirmModal]);

    // Application-specific notification handlers
    const showApplicationStatusToast = useCallback((applicationId, status) => {
        const statusMessages = {
            'Καταχωρήθηκε': {
                title: 'Επιτυχής Καταχώρηση',
                message: `Η αίτηση #${applicationId} καταχωρήθηκε επιτυχώς!`
            },
            'Εκκρεμότητα': {
                title: 'Αίτηση σε Εκκρεμότητα',
                message: `Η αίτηση #${applicationId} τέθηκε σε εκκρεμότητα.`
            },
            'Απορρίφθηκε': {
                title: 'Αίτηση Απορρίφθηκε',
                message: `Η αίτηση #${applicationId} απορρίφθηκε.`
            }
        };

        const statusInfo = statusMessages[status];
        if (statusInfo) {
            const toastType = status === 'Καταχωρήθηκε' ? 'success' :
                            status === 'Εκκρεμότητα' ? 'warning' : 'error';
            showToast(toastType, statusInfo.title, statusInfo.message);
        }
    }, [showToast]);

    const showPaymentToast = useCallback((type, statementId, amount) => {
        const messages = {
            created: {
                title: 'Επιτυχής Δημιουργία',
                message: `Η ταμειακή κατάσταση #${statementId} δημιουργήθηκε επιτυχώς! (${amount}€)`
            },
            updated: {
                title: 'Επιτυχής Ενημέρωση',
                message: `Η ταμειακή κατάσταση #${statementId} ενημερώθηκε επιτυχώς!`
            },
            marked_paid: {
                title: 'Επιτυχής Ενημέρωση',
                message: `Η ταμειακή κατάσταση #${statementId} μαρκαρίστηκε ως πληρωμένη!`
            },
            deleted: {
                title: 'Επιτυχής Διαγραφή',
                message: `Η ταμειακή κατάσταση διαγράφηκε επιτυχώς!`
            }
        };

        const messageInfo = messages[type];
        if (messageInfo) {
            showSuccessToast(messageInfo.title, messageInfo.message);
        }
    }, [showSuccessToast]);

    const showReminderToast = useCallback((type, reminderTitle) => {
        const messages = {
            created: {
                title: 'Νέα Υπενθύμιση',
                message: `Η υπενθύμιση "${reminderTitle}" δημιουργήθηκε επιτυχώς!`
            },
            completed: {
                title: 'Υπενθύμιση Ολοκληρώθηκε',
                message: `Η υπενθύμιση "${reminderTitle}" σημειώθηκε ως ολοκληρωμένη!`
            }
        };

        const messageInfo = messages[type];
        if (messageInfo) {
            showSuccessToast(messageInfo.title, messageInfo.message);
        }
    }, [showSuccessToast]);

    // Network error handler
    const handleNetworkError = useCallback((error, context = '') => {
        const errorMessage = error.response?.data?.message ||
                           error.message ||
                           'Παρουσιάστηκε άγνωστο σφάλμα';

        showErrorToast(
            `Σφάλμα ${context}`.trim(),
            errorMessage
        );
    }, [showErrorToast]);

    const contextValue = {
        // Toast state and functions
        toast,
        showToast,
        hideToast,
        showSuccessToast,
        showErrorToast,
        showWarningToast,
        showInfoToast,

        // Modal state and functions
        confirmModal,
        showConfirmModal,
        hideConfirmModal,
        showDeleteConfirm,
        showSaveConfirm,

        // Application-specific helpers
        showApplicationStatusToast,
        showPaymentToast,
        showReminderToast,
        handleNetworkError
    };

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
        </NotificationContext.Provider>
    );
};