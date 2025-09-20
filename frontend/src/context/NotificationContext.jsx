import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import NotificationManager from '../components/NotificationManager';
import sseService from '../services/sseService';

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
    const [sseConnected, setSseConnected] = useState(false);

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

    // Modal utility functions - accepting object parameter
    const showConfirmModal = useCallback((modalConfig) => {
        setConfirmModal({
            title: modalConfig.title,
            message: modalConfig.message,
            type: modalConfig.type,
            onConfirm: modalConfig.onConfirm,
            confirmText: modalConfig.confirmText || "Επιβεβαίωση",
            cancelText: modalConfig.cancelText || "Ακύρωση",
            ...modalConfig
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

    const showTeamActionConfirm = useCallback((action, itemName, onConfirm, affectedCount = null) => {
        const isActivating = action === 'activate';
        const actionText = isActivating ? 'ενεργοποιήσετε' : 'απενεργοποιήσετε';
        const title = isActivating ? 'Επιβεβαίωση Ενεργοποίησης' : 'Επιβεβαίωση Απενεργοποίησης';

        let message = `Είστε σίγουροι ότι θέλετε να ${actionText} ${itemName}`;

        if (affectedCount && affectedCount > 1) {
            message += ` (${affectedCount} άτομα - θα τους ${actionText} όλους)`;
        }

        message += '?\n\nΑυτή η ενέργεια μπορεί να αναιρεθεί ανά πάσα στιγμή.';

        if (!isActivating) {
            message += ' Οι επηρεαζόμενοι χρήστες δεν θα μπορούν να συνδεθούν στο σύστημα.';
        } else {
            message += ' Οι επηρεαζόμενοι χρήστες θα αποκτήσουν ξανά πλήρη πρόσβαση.';
        }

        showConfirmModal(
            title,
            message,
            isActivating ? "success" : "warning",
            onConfirm,
            {
                confirmText: isActivating ? "✅ Ενεργοποίηση" : "⚠️ Απενεργοποίηση",
                cancelText: "❌ Ακύρωση"
            }
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

    // Initialize SSE connection and handle real-time toasts
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('📡 No auth token found, skipping SSE connection');
            return;
        }

        // Connect to SSE
        sseService.connect(token);

        // Handle SSE connection events
        const handleConnected = () => {
            console.log('📡 SSE connected');
            setSseConnected(true);
        };

        const handleDisconnected = () => {
            console.log('📡 SSE disconnected');
            setSseConnected(false);
        };

        const handleError = (error) => {
            console.error('📡 SSE error:', error);
            setSseConnected(false);
        };

        // Handle real-time toast notifications
        const handleToastNotification = (data) => {
            console.log('📡 Received real-time toast:', data);

            // Map backend notification types to frontend toast types
            const typeMapping = {
                'system_success': 'success',
                'system_error': 'error',
                'system_warning': 'warning',
                'system_info': 'info'
            };

            const toastType = typeMapping[data.notification_type] || 'info';

            // Show toast using existing context method
            showToast(
                toastType,
                data.title || 'Ειδοποίηση',
                data.message,
                data.duration || 5000,
                {
                    linkUrl: data.linkUrl
                }
            );
        };

        // Register event listeners
        sseService.on('connected', handleConnected);
        sseService.on('disconnected', handleDisconnected);
        sseService.on('error', handleError);
        sseService.on('toast', handleToastNotification);

        // Cleanup on unmount
        return () => {
            sseService.off('connected', handleConnected);
            sseService.off('disconnected', handleDisconnected);
            sseService.off('error', handleError);
            sseService.off('toast', handleToastNotification);
            sseService.disconnect();
        };
    }, [showToast]); // Add showToast as dependency

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
        showTeamActionConfirm,

        // Application-specific helpers
        showApplicationStatusToast,
        showPaymentToast,
        showReminderToast,
        handleNetworkError,

        // SSE connection status
        sseConnected,
        sseService
    };

    return (
        <NotificationContext.Provider value={contextValue}>
            {children}
            <NotificationManager />
        </NotificationContext.Provider>
    );
};