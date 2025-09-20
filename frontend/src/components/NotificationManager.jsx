import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import CompactToast from './CompactToast';
import ConfirmationModal from './ConfirmationModal';

const NotificationManager = () => {
    const {
        toast,
        hideToast,
        confirmModal,
        hideConfirmModal
    } = useNotifications();

    return (
        <>
            {/* Global Toast Notifications */}
            {toast && (
                <CompactToast
                    type={toast.type}
                    title={toast.title}
                    message={toast.message}
                    duration={toast.duration}
                    onClose={hideToast}
                    showCountdown={toast.showCountdown}
                    countdownTime={toast.countdownTime}
                    onAction={toast.onAction}
                    actionLabel={toast.actionLabel}
                    autoRefresh={toast.autoRefresh}
                    onAutoRefreshToggle={toast.onAutoRefreshToggle}
                />
            )}

            {/* Global Confirmation Modals */}
            {confirmModal && (
                <ConfirmationModal
                    isOpen={true}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    type={confirmModal.type}
                    confirmText={confirmModal.confirmText}
                    cancelText={confirmModal.cancelText}
                    onConfirm={() => {
                        confirmModal.onConfirm();
                        hideConfirmModal();
                    }}
                    onCancel={hideConfirmModal}
                />
            )}
        </>
    );
};

export default NotificationManager;