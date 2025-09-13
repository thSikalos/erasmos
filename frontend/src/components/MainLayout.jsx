import React, { useContext, useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const MainLayout = () => {
    const { user, logout, token } = useContext(AuthContext);
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

    const fetchNotifications = async () => {
        if (!token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get('http://localhost:3000/api/notifications', config);
            setNotifications(res.data);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };
   
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [token]);
   
    const handleMarkAsRead = async (notificationId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.patch(`http://localhost:3000/api/notifications/${notificationId}/read`, {}, config);
            fetchNotifications();
        } catch (err) {
            console.error("Failed to mark as read", err);
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
        logout(); 
        navigate('/login'); 
    };

    const unreadCount = notifications.filter(n => n.status === 'unread').length;

    return (
        <div className="modern-app-layout">
            <style>
                {`
                    .modern-app-layout {
                        display: flex;
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .modern-app-layout::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
                        pointer-events: none;
                    }
                    
                    .modern-sidebar {
                        width: 280px;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-right: 1px solid rgba(255, 255, 255, 0.2);
                        display: flex;
                        flex-direction: column;
                        position: fixed;
                        height: 100vh;
                        z-index: 1000;
                        box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1);
                    }
                    
                    .modern-sidebar-header {
                        padding: 30px 25px;
                        text-align: center;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.15);
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .modern-sidebar-header::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        left: -50%;
                        width: 200%;
                        height: 200%;
                        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                        transform: rotate(45deg);
                        animation: shimmer 4s ease-in-out infinite;
                    }
                    
                    @keyframes shimmer {
                        0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                        50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                    }
                    
                    .app-logo {
                        font-size: 1.8rem;
                        font-weight: 700;
                        color: white;
                        text-decoration: none;
                        margin: 0;
                        position: relative;
                        z-index: 2;
                        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                        transition: all 0.3s ease;
                    }
                    
                    .app-logo:hover {
                        transform: scale(1.05);
                        color: white;
                        text-decoration: none;
                    }
                    
                    .modern-sidebar-nav {
                        flex-grow: 1;
                        padding: 20px 0;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    
                    .nav-link {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        color: rgba(255, 255, 255, 0.8);
                        text-decoration: none;
                        padding: 12px 25px;
                        margin: 0 15px;
                        border-radius: 12px;
                        font-size: 0.95rem;
                        font-weight: 500;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .nav-link::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }
                    
                    .nav-link:hover::before {
                        left: 100%;
                    }
                    
                    .nav-link:hover {
                        background: rgba(255, 255, 255, 0.15);
                        color: white;
                        transform: translateX(5px);
                        text-decoration: none;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    }
                    
                    .nav-link.active {
                        background: rgba(255, 255, 255, 0.25);
                        color: white;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                    }
                    
                    .nav-link.nav-button-new {
                        background: linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(5, 150, 105, 0.8));
                        color: white;
                        font-weight: 600;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .nav-link.nav-button-new:hover {
                        background: linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.9));
                        transform: translateY(-2px) scale(1.02);
                        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                    }
                    
                    .nav-icon {
                        font-size: 1.1rem;
                        width: 20px;
                        text-align: center;
                    }
                    
                    .modern-sidebar-footer {
                        padding: 25px;
                        border-top: 1px solid rgba(255, 255, 255, 0.15);
                        background: rgba(255, 255, 255, 0.08);
                    }
                    
                    .notification-bell {
                        position: relative;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: rgba(255, 255, 255, 0.15);
                        padding: 10px 15px;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        color: white;
                        font-size: 0.9rem;
                        margin-bottom: 15px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }
                    
                    .notification-bell:hover {
                        background: rgba(255, 255, 255, 0.2);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    }
                    
                    .notification-count {
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        color: white;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.75rem;
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
                    
                    .notification-panel {
                        position: absolute;
                        bottom: 100%;
                        left: 0;
                        right: 0;
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 12px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
                        max-height: 300px;
                        overflow-y: auto;
                        margin-bottom: 10px;
                        z-index: 1000;
                    }
                    
                    .notification-item {
                        padding: 15px;
                        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                        transition: all 0.2s ease;
                    }
                    
                    .notification-item:hover {
                        background: rgba(102, 126, 234, 0.05);
                    }
                    
                    .notification-item:last-child {
                        border-bottom: none;
                    }
                    
                    .notification-item p {
                        margin: 0;
                        color: #374151;
                        font-size: 0.9rem;
                        cursor: pointer;
                    }
                    
                    .notification-item.unread {
                        background: rgba(102, 126, 234, 0.1);
                        border-left: 3px solid #667eea;
                    }
                    
                    .button-mark-read {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        padding: 4px 8px;
                        border-radius: 6px;
                        font-size: 0.75rem;
                        cursor: pointer;
                        margin-left: 10px;
                        transition: all 0.2s ease;
                    }
                    
                    .button-mark-read:hover {
                        transform: scale(1.05);
                        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
                    }
                    
                    .user-info {
                        color: rgba(255, 255, 255, 0.9);
                        font-size: 0.9rem;
                        margin-bottom: 15px;
                        padding: 15px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 10px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        text-align: center;
                    }
                    
                    .user-info strong {
                        color: white;
                        font-weight: 600;
                    }
                    
                    .logout-button-sidebar {
                        background: linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.8));
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 10px;
                        font-size: 0.9rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        width: 100%;
                        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .logout-button-sidebar:hover {
                        background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9));
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
                    }
                    
                    .modern-main-content {
                        margin-left: 280px;
                        flex-grow: 1;
                        min-height: 100vh;
                        position: relative;
                    }
                    
                    @media (max-width: 1024px) {
                        .modern-sidebar {
                            width: 250px;
                        }
                        
                        .modern-main-content {
                            margin-left: 250px;
                        }
                    }
                    
                    @media (max-width: 768px) {
                        .modern-sidebar {
                            transform: translateX(-100%);
                            transition: transform 0.3s ease;
                        }
                        
                        .modern-sidebar.mobile-open {
                            transform: translateX(0);
                        }
                        
                        .modern-main-content {
                            margin-left: 0;
                        }
                        
                        .nav-link {
                            font-size: 0.9rem;
                            padding: 10px 20px;
                        }
                    }
                `}
            </style>
            
            <aside className="modern-sidebar">
                <div className="modern-sidebar-header">
                    <Link to="/dashboard" className="app-logo">
                        ✨ Erasmos App
                    </Link>
                </div>
                
                <nav className="modern-sidebar-nav">
                    <NavLink to="/dashboard" className="nav-link">
                        <span className="nav-icon">🏠</span>
                        Dashboard
                    </NavLink>
                    
                    <NavLink to="/application/new" className="nav-link nav-button-new">
                        <span className="nav-icon">➕</span>
                        Νέα Αίτηση
                    </NavLink>
                    
                    <NavLink to="/customers" className="nav-link">
                        <span className="nav-icon">👥</span>
                        Πελατολόγιο
                    </NavLink>
                    
                    <NavLink to="/renewals" className="nav-link">
                        <span className="nav-icon">🔄</span>
                        Ανανεώσεις
                    </NavLink>
                    
                    {user?.role !== 'Secretary' && (
                        <NavLink to="/reporting" className="nav-link">
                            <span className="nav-icon">📊</span>
                            Αναφορές
                        </NavLink>
                    )}
                    
                    {user?.role !== 'Secretary' && (
                        <NavLink to="/payments" className="nav-link">
                            <span className="nav-icon">💳</span>
                            Πληρωμές
                        </NavLink>
                    )}
                    
                    <NavLink to="/notifications" className="nav-link">
                        <span className="nav-icon">🔔</span>
                        Ειδοποιήσεις
                    </NavLink>
                    
                    {(user?.role === 'Admin' || user?.role === 'TeamLeader') && (
                        <NavLink to="/commissions" className="nav-link">
                            <span className="nav-icon">💰</span>
                            Αμοιβές
                        </NavLink>
                    )}
                    
                    {user?.role === 'Admin' && (
                        <NavLink to="/admin" className="nav-link">
                            <span className="nav-icon">⚙️</span>
                            Admin Panel
                        </NavLink>
                    )}
                </nav>
                
                <div className="modern-sidebar-footer">
                    <div className="notification-bell" onClick={() => setIsNotificationPanelOpen(prev => !prev)}>
                        🔔 Ειδοποιήσεις
                        {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
                        
                        {isNotificationPanelOpen && (
                            <div className="notification-panel">
                                {notifications.length > 0 ? notifications.map(notif => (
                                    <div key={notif.id} className={`notification-item ${notif.status}`}>
                                        <p onClick={() => handleNotificationClick(notif)}>{notif.message}</p>
                                        {notif.status === 'unread' &&
                                            <button onClick={() => handleMarkAsRead(notif.id)} className='button-mark-read' title="Mark as read">✓</button>
                                        }
                                    </div>
                                )) : (
                                    <div className="notification-item">
                                        <p>Δεν υπάρχουν νέες ειδοποιήσεις.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="user-info">
                        Συνδεδεμένος ως:<br />
                        <strong>{user?.email}</strong>
                    </div>
                    
                    <button onClick={handleLogout} className="logout-button-sidebar">
                        🚪 Αποσύνδεση
                    </button>
                </div>
            </aside>
            
            <main className="modern-main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;