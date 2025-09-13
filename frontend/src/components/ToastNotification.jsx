import React, { useEffect, useState } from 'react';

const ToastNotification = ({
    type = 'info',
    title,
    message,
    duration = 30000,
    onClose,
    showCountdown = false,
    countdownTime = 0,
    onAction = null,
    actionLabel = null,
    autoRefresh = false,
    onAutoRefreshToggle = null
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [countdown, setCountdown] = useState(countdownTime);

    useEffect(() => {
        if (showCountdown && countdownTime > 0) {
            // Set initial countdown
            setCountdown(countdownTime);

            const interval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [showCountdown, countdownTime]);

    // Update countdown when countdownTime prop changes
    useEffect(() => {
        if (showCountdown && countdownTime > 0) {
            setCountdown(countdownTime);
        }
    }, [countdownTime, showCountdown]);

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [duration]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            if (onClose) onClose();
        }, 300);
    };

    const getToastIcon = () => {
        switch (type) {
            case 'warning': return '⚠️';
            case 'success': return '✅';
            case 'error': return '❌';
            case 'info': return 'ℹ️';
            default: return 'ℹ️';
        }
    };

    const getToastColors = () => {
        switch (type) {
            case 'warning': return {
                border: 'rgba(245, 158, 11, 0.3)',
                accent: 'linear-gradient(135deg, #f59e0b, #d97706)',
                glow: 'rgba(245, 158, 11, 0.2)'
            };
            case 'success': return {
                border: 'rgba(16, 185, 129, 0.3)',
                accent: 'linear-gradient(135deg, #10b981, #059669)',
                glow: 'rgba(16, 185, 129, 0.2)'
            };
            case 'error': return {
                border: 'rgba(239, 68, 68, 0.3)',
                accent: 'linear-gradient(135deg, #ef4444, #dc2626)',
                glow: 'rgba(239, 68, 68, 0.2)'
            };
            case 'info':
            default: return {
                border: 'rgba(102, 126, 234, 0.3)',
                accent: 'linear-gradient(135deg, #667eea, #764ba2)',
                glow: 'rgba(102, 126, 234, 0.2)'
            };
        }
    };

    const colors = getToastColors();

    if (!isVisible) return null;

    return (
        <>
            <style>
                {`
                    .toast-notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        width: 400px;
                        max-width: 90vw;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border: 1px solid ${colors.border};
                        border-radius: 16px;
                        padding: 20px;
                        box-shadow: 0 20px 40px ${colors.glow};
                        z-index: 10000;
                        transform: translateX(${isVisible ? '0' : '400px'});
                        opacity: ${isVisible ? '1' : '0'};
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        position: relative;
                        overflow: hidden;
                    }

                    .toast-notification::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 3px;
                        background: ${colors.accent};
                    }

                    .toast-notification::after {
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

                    .toast-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 12px;
                        position: relative;
                        z-index: 2;
                    }

                    .toast-title-container {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .toast-icon {
                        font-size: 1.4rem;
                    }

                    .toast-title {
                        font-size: 1.1rem;
                        font-weight: 700;
                        color: rgba(255, 255, 255, 0.9);
                        margin: 0;
                    }

                    .toast-close {
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        width: 28px;
                        height: 28px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        color: rgba(255, 255, 255, 0.7);
                        transition: all 0.2s ease;
                        font-size: 14px;
                    }

                    .toast-close:hover {
                        background: rgba(255, 255, 255, 0.2);
                        color: white;
                        transform: scale(1.1);
                    }

                    .toast-content {
                        position: relative;
                        z-index: 2;
                    }

                    .toast-message {
                        color: rgba(255, 255, 255, 0.85);
                        font-size: 0.95rem;
                        line-height: 1.5;
                        margin: 0 0 15px 0;
                    }

                    .toast-countdown {
                        color: rgba(255, 255, 255, 0.9);
                        font-size: 1rem;
                        font-weight: 600;
                        margin: 10px 0;
                        text-align: center;
                        padding: 8px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                    }

                    .toast-actions {
                        display: flex;
                        gap: 15px;
                        align-items: center;
                        justify-content: space-between;
                        margin-top: 15px;
                        flex-wrap: wrap;
                    }

                    .toast-button {
                        background: ${colors.accent};
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 10px 16px;
                        font-size: 0.9rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        position: relative;
                        overflow: hidden;
                    }

                    .toast-button:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 6px 20px ${colors.glow};
                    }

                    .auto-refresh-container {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin: 0;
                        padding: 8px 12px;
                        background: rgba(255, 255, 255, 0.08);
                        border-radius: 8px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        transition: all 0.2s ease;
                    }

                    .auto-refresh-container:hover {
                        background: rgba(255, 255, 255, 0.12);
                    }

                    .auto-refresh-checkbox {
                        width: 18px;
                        height: 18px;
                        border-radius: 4px;
                        border: 2px solid rgba(255, 255, 255, 0.4);
                        background: transparent;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        appearance: none;
                        position: relative;
                    }

                    .auto-refresh-checkbox:checked {
                        background: ${colors.accent};
                        border-color: transparent;
                        box-shadow: 0 2px 8px ${colors.glow};
                    }

                    .auto-refresh-checkbox:checked::after {
                        content: '✓';
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: white;
                        font-size: 12px;
                        font-weight: bold;
                    }

                    .auto-refresh-label {
                        color: rgba(255, 255, 255, 0.9);
                        font-size: 0.85rem;
                        cursor: pointer;
                        user-select: none;
                        font-weight: 500;
                    }

                    @media (max-width: 480px) {
                        .toast-notification {
                            top: 10px;
                            right: 10px;
                            left: 10px;
                            width: auto;
                            max-width: none;
                        }

                        .toast-actions {
                            flex-direction: column;
                            align-items: stretch;
                        }

                        .toast-button {
                            width: 100%;
                            justify-content: center;
                        }
                    }
                `}
            </style>
            <div className="toast-notification">
                <div className="toast-header">
                    <div className="toast-title-container">
                        <span className="toast-icon">{getToastIcon()}</span>
                        {title && <h4 className="toast-title">{title}</h4>}
                    </div>
                    <button className="toast-close" onClick={handleClose}>
                        ✕
                    </button>
                </div>

                <div className="toast-content">
                    {message && <p className="toast-message">{message}</p>}

                    {showCountdown && countdown > 0 && (
                        <div className="toast-countdown">
                            Η συνεδρία σας λήγει σε: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                        </div>
                    )}

                    {(actionLabel || onAutoRefreshToggle) && (
                        <div className="toast-actions">
                            {actionLabel && onAction && (
                                <button className="toast-button" onClick={onAction}>
                                    {actionLabel}
                                </button>
                            )}

                            {onAutoRefreshToggle && (
                                <div className="auto-refresh-container">
                                    <input
                                        type="checkbox"
                                        id="auto-refresh"
                                        className="auto-refresh-checkbox"
                                        checked={autoRefresh}
                                        onChange={onAutoRefreshToggle}
                                    />
                                    <label htmlFor="auto-refresh" className="auto-refresh-label">
                                        Αυτόματη ανανέωση
                                    </label>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ToastNotification;