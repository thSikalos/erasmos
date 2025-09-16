import React, { useContext, useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Header from './Header';
import NotificationManager from './NotificationManager';
import '../App.css';

const MainLayout = () => {
    const { user, sessionTimeout } = useContext(AuthContext);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);


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
                        padding: 25px 20px;
                        text-align: center;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.15);
                        position: relative;
                        overflow: hidden;
                        flex-shrink: 0;
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
                        line-height: 1.2;
                        word-break: break-word;
                    }
                    
                    .app-logo:hover {
                        transform: scale(1.05);
                        color: white;
                        text-decoration: none;
                    }
                    
                    .modern-sidebar-nav {
                        flex: 1;
                        padding: 15px 0;
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                        min-height: 0;
                    }
                    
                    .nav-link {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        color: rgba(255, 255, 255, 0.8);
                        text-decoration: none;
                        padding: 10px 20px;
                        margin: 0 15px;
                        border-radius: 10px;
                        font-size: 0.9rem;
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
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    
                    .modern-main-content {
                        margin-left: 280px;
                        margin-top: 60px;
                        flex-grow: 1;
                        min-height: calc(100vh - 60px);
                        position: relative;
                    }
                    
                    @media (max-width: 1200px) {
                        .modern-sidebar {
                            width: 240px;
                        }

                        .modern-main-content {
                            margin-left: 240px;
                            margin-top: 60px;
                        }

                        .app-logo {
                            font-size: 1.5rem;
                        }

                        .nav-link {
                            font-size: 0.85rem;
                            padding: 8px 18px;
                            gap: 10px;
                        }

                        .modern-sidebar-header {
                            padding: 20px 18px;
                        }

                        .modern-sidebar-footer {
                            padding: 18px;
                        }

                        .modern-sidebar-nav {
                            padding: 12px 0;
                            gap: 4px;
                        }

                        .user-info {
                            font-size: 0.85rem;
                            padding: 12px;
                            margin-bottom: 12px;
                        }

                        .notification-bell {
                            font-size: 0.85rem;
                            padding: 8px 12px;
                            margin-bottom: 12px;
                        }

                        .logout-button-sidebar {
                            padding: 10px 16px;
                            font-size: 0.85rem;
                        }
                    }
                    
                    @media (max-width: 1024px) {
                        .modern-sidebar {
                            width: 200px;
                        }

                        .modern-main-content {
                            margin-left: 200px;
                            margin-top: 60px;
                        }

                        .app-logo {
                            font-size: 1.3rem;
                        }

                        .nav-link {
                            font-size: 0.8rem;
                            padding: 6px 12px;
                            margin: 0 10px;
                            gap: 8px;
                        }

                        .modern-sidebar-header {
                            padding: 15px 12px;
                        }

                        .modern-sidebar-footer {
                            padding: 12px;
                        }

                        .modern-sidebar-nav {
                            padding: 10px 0;
                            gap: 2px;
                        }

                        .user-info {
                            font-size: 0.75rem;
                            padding: 10px;
                            margin-bottom: 10px;
                        }

                        .notification-bell {
                            font-size: 0.75rem;
                            padding: 6px 10px;
                            margin-bottom: 10px;
                        }

                        .logout-button-sidebar {
                            padding: 8px 12px;
                            font-size: 0.75rem;
                        }

                        .nav-icon {
                            font-size: 1rem;
                            width: 18px;
                        }
                    }
                    
                    @media (max-width: 900px) {
                        .modern-sidebar {
                            width: 70px;
                            overflow-x: visible;
                        }
                        
                        .modern-main-content {
                            margin-left: 70px;
                            margin-top: 60px;
                        }
                        
                        .app-logo {
                            font-size: 1.1rem;
                            text-align: center;
                            line-height: 1.1;
                        }

                        .modern-sidebar-header {
                            padding: 12px 8px;
                        }

                        .modern-sidebar-footer {
                            padding: 8px;
                        }
                        
                        .nav-link {
                            justify-content: center;
                            padding: 12px 8px;
                            margin: 0 5px;
                            position: relative;
                            overflow: visible;
                        }
                        
                        .nav-link span:not(.nav-icon) {
                            position: absolute;
                            left: 100%;
                            top: 50%;
                            transform: translateY(-50%);
                            background: rgba(0, 0, 0, 0.9);
                            color: white;
                            padding: 8px 12px;
                            border-radius: 8px;
                            font-size: 0.85rem;
                            white-space: nowrap;
                            margin-left: 10px;
                            opacity: 0;
                            pointer-events: none;
                            transition: all 0.3s ease;
                            z-index: 1001;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                        }
                        
                        .nav-link:hover span:not(.nav-icon) {
                            opacity: 1;
                        }
                        
                        .modern-sidebar-header {
                            padding: 15px 5px;
                        }
                        
                        .modern-sidebar-footer {
                            padding: 6px 2px;
                        }

                        .modern-sidebar-nav {
                            padding: 8px 0;
                            gap: 1px;
                        }
                        
                        .user-info {
                            display: none;
                        }
                        
                        .notification-bell {
                            justify-content: center;
                            font-size: 0;
                            padding: 10px;
                            position: relative;
                        }
                        
                        .notification-bell::before {
                            content: '🔔';
                            font-size: 1.1rem;
                        }
                        
                        .logout-button-sidebar {
                            padding: 10px;
                            font-size: 0;
                            position: relative;
                        }
                        
                        .logout-button-sidebar::before {
                            content: '🚺';
                            font-size: 1.1rem;
                        }
                        
                        .notification-panel {
                            left: 100%;
                            bottom: 0;
                            margin-left: 10px;
                            margin-bottom: 0;
                            width: 300px;
                        }
                    }
                    
                    @media (max-width: 768px) {
                        .modern-sidebar {
                            transform: translateX(-100%);
                            transition: transform 0.3s ease;
                            width: 280px;
                            z-index: 2000;
                        }
                        
                        .modern-sidebar.mobile-open {
                            transform: translateX(0);
                        }
                        
                        .modern-main-content {
                            margin-left: 0;
                            margin-top: 60px;
                        }
                        
                        .app-logo {
                            font-size: 1.6rem;
                        }
                        
                        .nav-link {
                            font-size: 0.9rem;
                            padding: 12px 20px;
                            margin: 0 15px;
                            justify-content: flex-start;
                        }
                        
                        .nav-link span:not(.nav-icon) {
                            position: static;
                            transform: none;
                            background: transparent;
                            color: inherit;
                            padding: 0;
                            margin-left: 0;
                            opacity: 1;
                            pointer-events: auto;
                            box-shadow: none;
                        }
                        
                        .modern-sidebar-header {
                            padding: 25px 20px;
                        }
                        
                        .modern-sidebar-footer {
                            padding: 20px;
                        }
                        
                        .user-info {
                            display: block;
                            font-size: 0.9rem;
                            padding: 15px;
                        }
                        
                        .notification-bell {
                            font-size: 0.9rem;
                            padding: 10px 15px;
                            justify-content: flex-start;
                        }
                        
                        .notification-bell::before {
                            display: none;
                        }
                        
                        .logout-button-sidebar {
                            font-size: 0.9rem;
                            padding: 12px 20px;
                        }
                        
                        .logout-button-sidebar::before {
                            display: none;
                        }
                        
                        .notification-panel {
                            left: 0;
                            margin-left: 0;
                            width: auto;
                        }
                    }
                    
                    .mobile-sidebar-toggle {
                        display: none;
                        position: fixed;
                        top: 20px;
                        left: 20px;
                        z-index: 2001;
                        background: rgba(255, 255, 255, 0.9);
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(102, 126, 234, 0.2);
                        border-radius: 12px;
                        padding: 12px;
                        font-size: 1.2rem;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                        transition: all 0.3s ease;
                    }
                    
                    .mobile-sidebar-toggle:hover {
                        background: rgba(255, 255, 255, 1);
                        transform: scale(1.1);
                        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
                    }
                    
                    @media (max-width: 768px) {
                        .mobile-sidebar-toggle {
                            display: block;
                        }
                    }
                    
                    .sidebar-close-button {
                        display: none;
                        position: absolute;
                        top: 15px;
                        right: 15px;
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        border-radius: 8px;
                        padding: 8px;
                        color: white;
                        font-size: 1.2rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        z-index: 2;
                    }
                    
                    .sidebar-close-button:hover {
                        background: rgba(255, 255, 255, 0.3);
                        transform: scale(1.1);
                    }
                    
                    @media (max-width: 768px) {
                        .sidebar-close-button {
                            display: block;
                        }
                    }
                    
                    .mobile-overlay {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        z-index: 1999;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }
                    
                    .mobile-overlay.active {
                        opacity: 1;
                    }
                    
                    @media (max-width: 768px) {
                        .mobile-overlay {
                            display: block;
                        }
                    }
                `}
            </style>
            
            <button 
                className="mobile-sidebar-toggle"
                onClick={() => setIsMobileSidebarOpen(true)}
            >
                ☰
            </button>
            
            <div 
                className={`mobile-overlay ${isMobileSidebarOpen ? 'active' : ''}`}
                onClick={() => setIsMobileSidebarOpen(false)}
            ></div>
            
            <aside className={`modern-sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
                <div className="modern-sidebar-header">
                    <button 
                        className="sidebar-close-button"
                        onClick={() => setIsMobileSidebarOpen(false)}
                    >
                        ×
                    </button>
                    
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
                    
                    <NavLink to="/applications" className="nav-link">
                        <span className="nav-icon">📋</span>
                        Αιτήσεις
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

                    <NavLink to="/infoportal" className="nav-link">
                        <span className="nav-icon">ℹ️</span>
                        InfoPortal
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
                
            </aside>
            
            <Header />

            <main className="modern-main-content">
                <Outlet />
            </main>


            {/* Global Notification Manager */}
            <NotificationManager />
        </div>
    );
};

export default MainLayout;