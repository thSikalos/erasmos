import React, { useEffect, useState } from 'react';

const CompactToast = ({
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
                    .compact-toast {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        width: auto;
                        max-width: 380px;
                        min-width: 300px;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border: 1px solid ${colors.border};
                        border-radius: 8px;
                        padding: 10px;
                        box-shadow: 0 15px 35px ${colors.glow};
                        z-index: 10000;
                        transform: translateX(${isVisible ? '0' : '400px'});
                        opacity: ${isVisible ? '1' : '0'};
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        position: relative;
                        overflow: hidden;
                    }

                    .compact-toast::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 3px;
                        background: ${colors.accent};
                    }

                    .compact-toast::after {
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

                    .compact-toast-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: ${title && message ? '6px' : '0'};
                        position: relative;
                        z-index: 2;
                    }

                    .compact-toast-title-container {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        flex: 1;
                    }

                    .compact-toast-icon {
                        font-size: 1.1rem;
                        flex-shrink: 0;
                    }

                    .compact-toast-title {
                        font-size: 0.9rem;
                        font-weight: 600;
                        color: rgba(255, 255, 255, 0.9);
                        margin: 0;
                        line-height: 1.2;
                    }

                    .compact-toast-close {
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 50%;
                        width: 24px;
                        height: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        color: rgba(255, 255, 255, 0.7);
                        transition: all 0.2s ease;
                        font-size: 12px;
                        flex-shrink: 0;
                        margin-left: 8px;
                    }

                    .compact-toast-close:hover {
                        background: rgba(255, 255, 255, 0.2);
                        color: white;
                        transform: scale(1.1);
                    }

                    .compact-toast-content {
                        position: relative;
                        z-index: 2;
                    }

                    .compact-toast-message {
                        color: rgba(255, 255, 255, 0.85);
                        font-size: 0.85rem;
                        line-height: 1.3;
                        margin: 0;
                    }

                    .compact-toast-countdown {
                        color: rgba(255, 255, 255, 0.9);
                        font-size: 0.85rem;
                        font-weight: 600;
                        margin: 8px 0;
                        text-align: center;
                        padding: 6px 8px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 6px;
                    }

                    .compact-toast-actions {
                        display: flex;
                        gap: 10px;
                        align-items: center;
                        justify-content: space-between;
                        margin-top: 12px;
                        flex-wrap: wrap;
                    }

                    .compact-toast-button {
                        background: ${colors.accent};
                        color: white;
                        border: none;
                        border-radius: 6px;
                        padding: 8px 12px;
                        font-size: 0.8rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        position: relative;
                        overflow: hidden;
                    }

                    .compact-toast-button:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 15px ${colors.glow};
                    }

                    .compact-auto-refresh-container {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        margin: 0;
                        padding: 6px 8px;
                        background: rgba(255, 255, 255, 0.08);
                        border-radius: 6px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        transition: all 0.2s ease;
                    }

                    .compact-auto-refresh-container:hover {
                        background: rgba(255, 255, 255, 0.12);
                    }

                    .compact-auto-refresh-checkbox {
                        width: 16px;
                        height: 16px;
                        border-radius: 3px;
                        border: 2px solid rgba(255, 255, 255, 0.4);
                        background: transparent;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        appearance: none;
                        position: relative;
                    }

                    .compact-auto-refresh-checkbox:checked {
                        background: ${colors.accent};
                        border-color: transparent;
                        box-shadow: 0 2px 6px ${colors.glow};
                    }

                    .compact-auto-refresh-checkbox:checked::after {
                        content: '✓';
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: white;
                        font-size: 10px;
                        font-weight: bold;
                    }

                    .compact-auto-refresh-label {
                        color: rgba(255, 255, 255, 0.9);
                        font-size: 0.75rem;
                        cursor: pointer;
                        user-select: none;
                        font-weight: 500;
                    }

                    @media (max-width: 480px) {
                        .compact-toast {
                            top: 10px;
                            right: 10px;
                            left: 10px;
                            width: auto;
                            max-width: none;
                            min-width: auto;
                        }

                        .compact-toast-actions {
                            flex-direction: column;
                            align-items: stretch;
                        }

                        .compact-toast-button {
                            width: 100%;
                            justify-content: center;
                        }
                    }
                `}
            </style>
            <div className="compact-toast">
                <div className="compact-toast-header">
                    <div className="compact-toast-title-container">
                        <span className="compact-toast-icon">{getToastIcon()}</span>
                        {title && <h4 className="compact-toast-title">{title}</h4>}
                    </div>
                    <button className="compact-toast-close" onClick={handleClose}>
                        ✕
                    </button>
                </div>

                <div className="compact-toast-content">
                    {message && <p className="compact-toast-message">{message}</p>}

                    {showCountdown && countdown > 0 && (
                        <div className="compact-toast-countdown">
                            Η συνεδρία σας λήγει σε: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                        </div>
                    )}

                    {(actionLabel || onAutoRefreshToggle) && (
                        <div className="compact-toast-actions">
                            {actionLabel && onAction && (
                                <button className="compact-toast-button" onClick={onAction}>
                                    {actionLabel}
                                </button>
                            )}

                            {onAutoRefreshToggle && (
                                <div className="compact-auto-refresh-container">
                                    <input
                                        type="checkbox"
                                        id="auto-refresh"
                                        className="compact-auto-refresh-checkbox"
                                        checked={autoRefresh}
                                        onChange={onAutoRefreshToggle}
                                    />
                                    <label htmlFor="auto-refresh" className="compact-auto-refresh-label">
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

export default CompactToast;