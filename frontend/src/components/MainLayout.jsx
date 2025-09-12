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
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <Link to="/dashboard" style={{textDecoration: 'none', color: 'white'}}><h3>Erasmos App</h3></Link>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/dashboard">Dashboard</NavLink>
                    <NavLink to="/application/new" className="nav-button-new">Νέα Αίτηση</NavLink>
                    <NavLink to="/customers">Πελατολόγιο</NavLink>
                    <NavLink to="/renewals">Ανανεώσεις</NavLink>
                    {user?.role !== 'Secretary' && (
                        <NavLink to="/reporting">Αναφορές</NavLink>
                    )}
                    {user?.role !== 'Secretary' && (
                        <NavLink to="/payments">Πληρωμές</NavLink>
                    )}
                    <NavLink to="/notifications">Ειδοποιήσεις</NavLink>
                    {(user?.role === 'Admin' || user?.role === 'TeamLeader') && (
                      <NavLink to="/commissions">Αμοιβές</NavLink>
                    )}
                    {user?.role === 'Admin' && (
                        <NavLink to="/admin">Admin Panel</NavLink>
                    )}
                </nav>
                <div className="sidebar-footer">
                    <div className="notification-bell" onClick={() => setIsNotificationPanelOpen(prev => !prev)}>
                        🔔 {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
                        {isNotificationPanelOpen && (
                            <div className="notification-panel">
                                {notifications.length > 0 ? notifications.map(notif => (
                                    <div key={notif.id} className={`notification-item ${notif.status}`}>
                                        <p onClick={() => handleNotificationClick(notif)} style={{cursor: 'pointer'}}>{notif.message}</p>
                                        {notif.status === 'unread' &&
                                            <button onClick={() => handleMarkAsRead(notif.id)} className='button-mark-read' title="Mark as read">✓</button>
                                        }
                                    </div>
                                )) : <div className="notification-item"><p>Δεν υπάρχουν νέες ειδοποιήσεις.</p></div>}
                            </div>
                        )}
                    </div>
                    <p>Συνδεδεμένος ως: <strong>{user?.email}</strong></p>
                    <button onClick={handleLogout} className="logout-button-sidebar">Αποσύνδεση</button>
                </div>
            </aside>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;