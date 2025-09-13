import React from 'react';

const ConfirmationModal = ({
    isOpen = false,
    title = "Επιβεβαίωση",
    message = "Είστε σίγουροι ότι θέλετε να συνεχίσετε;",
    confirmText = "Επιβεβαίωση",
    cancelText = "Ακύρωση",
    type = "warning", // warning, danger, info
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    const getModalColors = () => {
        switch (type) {
            case 'danger':
                return {
                    border: 'rgba(239, 68, 68, 0.3)',
                    accent: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    glow: 'rgba(239, 68, 68, 0.2)',
                    confirmButton: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    confirmGlow: 'rgba(239, 68, 68, 0.4)'
                };
            case 'warning':
                return {
                    border: 'rgba(245, 158, 11, 0.3)',
                    accent: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    glow: 'rgba(245, 158, 11, 0.2)',
                    confirmButton: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    confirmGlow: 'rgba(245, 158, 11, 0.4)'
                };
            case 'info':
            default:
                return {
                    border: 'rgba(102, 126, 234, 0.3)',
                    accent: 'linear-gradient(135deg, #667eea, #764ba2)',
                    glow: 'rgba(102, 126, 234, 0.2)',
                    confirmButton: 'linear-gradient(135deg, #667eea, #764ba2)',
                    confirmGlow: 'rgba(102, 126, 234, 0.4)'
                };
        }
    };

    const colors = getModalColors();

    const getIcon = () => {
        switch (type) {
            case 'danger': return '⚠️';
            case 'warning': return '❓';
            case 'info': return 'ℹ️';
            default: return '❓';
        }
    };

    return (
        <>
            <style>
                {`
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.7);
                        backdrop-filter: blur(8px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10001;
                        animation: fadeIn 0.3s ease-out;
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }

                    @keyframes modalSlideIn {
                        from {
                            opacity: 0;
                            transform: translate(-50%, -60%);
                        }
                        to {
                            opacity: 1;
                            transform: translate(-50%, -50%);
                        }
                    }

                    .confirmation-modal {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 90%;
                        max-width: 400px;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border: 1px solid ${colors.border};
                        border-radius: 20px;
                        padding: 30px;
                        box-shadow: 0 25px 50px ${colors.glow};
                        z-index: 10002;
                        animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                        position: relative;
                        overflow: hidden;
                    }

                    .confirmation-modal::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 3px;
                        background: ${colors.accent};
                    }

                    .confirmation-modal::after {
                        content: '';
                        position: absolute;
                        top: -50%;
                        left: -50%;
                        width: 200%;
                        height: 200%;
                        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                        transform: rotate(45deg);
                        animation: shimmer 3s ease-in-out infinite;
                    }

                    @keyframes shimmer {
                        0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                        50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                    }

                    .modal-header {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        margin-bottom: 20px;
                        position: relative;
                        z-index: 2;
                    }

                    .modal-icon {
                        font-size: 2rem;
                        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                    }

                    .modal-title {
                        font-size: 1.3rem;
                        font-weight: 700;
                        color: rgba(255, 255, 255, 0.9);
                        margin: 0;
                    }

                    .modal-message {
                        color: rgba(255, 255, 255, 0.85);
                        font-size: 1rem;
                        line-height: 1.6;
                        margin-bottom: 30px;
                        position: relative;
                        z-index: 2;
                    }

                    .modal-actions {
                        display: flex;
                        gap: 12px;
                        justify-content: flex-end;
                        position: relative;
                        z-index: 2;
                    }

                    .modal-button {
                        padding: 12px 24px;
                        border: none;
                        border-radius: 10px;
                        font-size: 0.95rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                        min-width: 100px;
                    }

                    .modal-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .modal-button:hover::before {
                        left: 100%;
                    }

                    .confirm-button {
                        background: ${colors.confirmButton};
                        color: white;
                        box-shadow: 0 4px 15px ${colors.confirmGlow};
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .confirm-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px ${colors.confirmGlow};
                    }

                    .cancel-button {
                        background: rgba(107, 114, 128, 0.8);
                        color: rgba(255, 255, 255, 0.9);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(10px);
                    }

                    .cancel-button:hover {
                        background: rgba(107, 114, 128, 1);
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(107, 114, 128, 0.3);
                    }

                    @media (max-width: 480px) {
                        .confirmation-modal {
                            width: 95%;
                            padding: 25px;
                            margin: 10px;
                        }

                        .modal-actions {
                            flex-direction: column;
                        }

                        .modal-button {
                            width: 100%;
                        }
                    }
                `}
            </style>

            <div className="modal-overlay" onClick={onCancel}>
                <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <span className="modal-icon">{getIcon()}</span>
                        <h3 className="modal-title">{title}</h3>
                    </div>

                    <p className="modal-message">{message}</p>

                    <div className="modal-actions">
                        <button
                            className="modal-button cancel-button"
                            onClick={onCancel}
                        >
                            {cancelText}
                        </button>
                        <button
                            className="modal-button confirm-button"
                            onClick={onConfirm}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmationModal;