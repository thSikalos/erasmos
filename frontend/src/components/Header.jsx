import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../utils/api';

const Header = () => {
    const { user, logout, token } = useContext(AuthContext);
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [lastFetch, setLastFetch] = useState(null);
    const [isPolling, setIsPolling] = useState(true);

    const fetchNotifications = async (force = false) => {
        if (!token || (!force && !isPolling)) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(apiUrl('/api/notifications'), config);

            // Check if there are new notifications
            const hasNewNotifications = !lastFetch ||
                res.data.length > notifications.length ||
                (res.data.length > 0 && notifications.length > 0 && res.data[0].id !== notifications[0]?.id);

            setNotifications(res.data);
            setLastFetch(new Date());

            // If there are new notifications, briefly show they arrived
            if (hasNewNotifications && res.data.length > notifications.length) {
                console.log(`📬 ${res.data.length - notifications.length} new notification(s) received`);
            }
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    useEffect(() => {
        if (!token) return;

        // Initial fetch
        fetchNotifications(true);

        // Smart polling: more frequent when there are unread notifications
        const createPollingInterval = () => {
            const unreadCount = notifications.filter(n => n.status === 'unread').length;
            const interval = unreadCount > 0 ? 30000 : 60000; // 30s if unread, 60s otherwise

            return setInterval(() => {
                if (isPolling) {
                    fetchNotifications();
                }
            }, interval);
        };

        let intervalId = createPollingInterval();

        // Update interval when notification count changes
        const timeoutId = setTimeout(() => {
            clearInterval(intervalId);
            intervalId = createPollingInterval();
        }, 1000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [token, notifications.length, isPolling]);

    const handleMarkAsRead = async (notificationId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.patch(apiUrl(`/api/notifications/${notificationId}/read`), {}, config);

            // Optimistically update UI while refetching
            setNotifications(prev => prev.map(n =>
                n.id === notificationId ? { ...n, status: 'read' } : n
            ));

            fetchNotifications();
        } catch (err) {
            console.error("Failed to mark as read", err);
            // Revert optimistic update on error
            fetchNotifications(true);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(apiUrl('/api/notifications/mark-all-read'), {}, config);

            // Optimistically update all notifications to read
            setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));

            fetchNotifications();
        } catch (err) {
            console.error("Failed to mark all as read", err);
            // Revert optimistic update on error
            fetchNotifications(true);
        }
    };

    const handleNotificationClick = (notification) => {
        handleMarkAsRead(notification.id);
        setIsNotificationPanelOpen(false);
        if (notification.link_url) {
            navigate(notification.link_url);
        }
    };

    const handleLogout = () => {
        setIsProfileMenuOpen(false);
        logout();
        navigate('/login');
    };

    const unreadCount = notifications.filter(n => n.status === 'unread').length;

    return (
        <>
            <style>
                {`
                    .app-header {
                        position: fixed;
                        top: 0;
                        left: 280px;
                        right: 0;
                        height: 60px;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                        padding: 0 25px;
                        z-index: 999;
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    }

                    .header-actions {
                        display: flex;
                        align-items: center;
                        gap: 20px;
                    }

                    .header-notification {
                        position: relative;
                        background: rgba(255, 255, 255, 0.15);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 10px;
                        padding: 10px 15px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        color: rgba(255, 255, 255, 0.9);
                        font-size: 0.9rem;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .header-notification:hover {
                        background: rgba(255, 255, 255, 0.25);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                        color: white;
                    }

                    .notification-count-header {
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        color: white;
                        border-radius: 50%;
                        width: 18px;
                        height: 18px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.7rem;
                        font-weight: bold;
                        position: absolute;
                        top: -5px;
                        right: -5px;
                        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
                        animation: pulse 2s infinite;
                    }

                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                    }

                    .header-notification-panel {
                        position: absolute;
                        top: 100%;
                        right: 0;
                        margin-top: 10px;
                        width: 350px;
                        background: white;
                        border: 1px solid rgba(0, 0, 0, 0.1);
                        border-radius: 12px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                        max-height: 400px;
                        overflow-y: auto;
                        z-index: 10000;
                    }

                    .header-notification-item {
                        padding: 15px;
                        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                        transition: all 0.2s ease;
                    }

                    .header-notification-item:hover {
                        background: rgba(102, 126, 234, 0.05);
                    }

                    .header-notification-actions {
                        padding: 12px;
                        background: rgba(102, 126, 234, 0.02);
                        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                    }

                    .mark-all-read-button {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 8px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        width: 100%;
                        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
                    }

                    .mark-all-read-button:hover {
                        background: linear-gradient(135deg, #059669, #047857);
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                    }

                    .header-notification-item:last-child {
                        border-bottom: none;
                    }

                    .header-notification-item p {
                        margin: 0;
                        color: #374151;
                        font-size: 0.9rem;
                        cursor: pointer;
                    }

                    .header-notification-item.unread {
                        background: rgba(102, 126, 234, 0.1);
                        border-left: 3px solid #667eea;
                    }

                    .header-profile {
                        position: relative;
                        background: rgba(255, 255, 255, 0.15);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 10px;
                        padding: 10px 15px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        color: rgba(255, 255, 255, 0.9);
                        font-size: 0.9rem;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .header-profile:hover {
                        background: rgba(255, 255, 255, 0.25);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                        color: white;
                    }

                    .header-profile-menu {
                        position: absolute;
                        top: 100%;
                        right: 0;
                        margin-top: 10px;
                        width: 200px;
                        background: white;
                        border: 1px solid rgba(0, 0, 0, 0.1);
                        border-radius: 12px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                        overflow: hidden;
                        z-index: 10000;
                    }

                    .profile-menu-item {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 12px 15px;
                        color: #374151;
                        text-decoration: none;
                        transition: all 0.2s ease;
                        font-size: 0.9rem;
                        border: none;
                        background: none;
                        width: 100%;
                        cursor: pointer;
                        pointer-events: auto;
                        text-align: left;
                    }

                    .profile-menu-item:hover {
                        background: rgba(102, 126, 234, 0.05);
                        color: #667eea;
                    }

                    .profile-menu-item.logout {
                        color: #ef4444;
                        border-top: 1px solid rgba(0, 0, 0, 0.05);
                    }

                    .profile-menu-item.logout:hover {
                        background: rgba(239, 68, 68, 0.05);
                        color: #dc2626;
                    }

                    .header-user-info {
                        font-size: 0.8rem;
                        color: rgba(255, 255, 255, 0.7);
                        margin: 0 10px;
                    }

                    @media (max-width: 1200px) {
                        .app-header {
                            left: 240px;
                            padding: 0 20px;
                        }

                        .header-actions {
                            gap: 15px;
                        }
                    }

                    @media (max-width: 1024px) {
                        .app-header {
                            left: 200px;
                            padding: 0 15px;
                        }

                        .header-actions {
                            gap: 12px;
                        }

                        .header-notification, .header-profile {
                            padding: 8px 12px;
                            font-size: 0.8rem;
                        }

                        .header-user-info {
                            display: none;
                        }
                    }

                    @media (max-width: 900px) {
                        .app-header {
                            left: 70px;
                        }

                        .header-notification, .header-profile {
                            padding: 8px;
                            font-size: 0;
                        }

                        .header-notification::before {
                            content: '🔔';
                            font-size: 1.2rem;
                        }

                        .header-profile::before {
                            content: '👤';
                            font-size: 1.2rem;
                        }
                    }

                    @media (max-width: 768px) {
                        .app-header {
                            left: 0;
                            padding: 0 15px;
                        }

                        .header-notification, .header-profile {
                            padding: 10px 12px;
                            font-size: 0.8rem;
                        }

                        .header-notification::before, .header-profile::before {
                            display: none;
                        }
                    }

                    .header-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 999;
                        background: transparent;
                    }
                `}
            </style>

            {(isNotificationPanelOpen || isProfileMenuOpen) && (
                <div
                    className="header-overlay"
                    onClick={() => {
                        setIsNotificationPanelOpen(false);
                        setIsProfileMenuOpen(false);
                    }}
                />
            )}

            <header className="app-header">
                <div className="header-actions">
                    <div className="header-user-info">
                        {user?.email}
                    </div>

                    <div className="header-notification" onClick={() => setIsNotificationPanelOpen(prev => !prev)}>
                        🔔 Ειδοποιήσεις
                        {unreadCount > 0 && <span className="notification-count-header">{unreadCount}</span>}

                        {isNotificationPanelOpen && (
                            <div className="header-notification-panel" onClick={(e) => e.stopPropagation()}>
                                {notifications.length > 0 && unreadCount > 0 && (
                                    <div className="header-notification-actions">
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            className="mark-all-read-button"
                                            title="Σήμανση όλων ως διαβασμένα"
                                        >
                                            ✅ Σήμανση όλων ως διαβασμένα ({unreadCount})
                                        </button>
                                    </div>
                                )}
                                {notifications.length > 0 ? notifications.map(notif => (
                                    <div key={notif.id} className={`header-notification-item ${notif.status}`}>
                                        <p onClick={() => handleNotificationClick(notif)}>{notif.message}</p>
                                        {notif.status === 'unread' &&
                                            <button onClick={() => handleMarkAsRead(notif.id)} className='button-mark-read' title="Mark as read">✓</button>
                                        }
                                    </div>
                                )) : (
                                    <div className="header-notification-item">
                                        <p>Δεν υπάρχουν νέες ειδοποιήσεις.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="header-profile" onClick={() => setIsProfileMenuOpen(prev => !prev)}>
                        👤 Προφίλ

                        {isProfileMenuOpen && (
                            <div className="header-profile-menu" onClick={(e) => e.stopPropagation()}>
                                <Link to="/profile" className="profile-menu-item" onClick={() => setIsProfileMenuOpen(false)}>
                                    👤 Το Προφίλ μου
                                </Link>
                                <button onClick={handleLogout} className="profile-menu-item logout">
                                    🚪 Αποσύνδεση
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>
        </>
    );
};

export default Header;