import React from 'react';
import { Link } from 'react-router-dom';

const AdminPage = () => {
    const adminSections = [
        {
            title: 'Διαχείριση Πεδίων',
            description: 'Δημιούργησε και επεξεργάσου όλα τα διαθέσιμα πεδία για τις φόρμες αιτήσεων.',
            icon: '📝',
            link: '/admin/fields',
            color: 'from-blue-500 to-purple-600'
        },
        {
            title: 'Διαχείριση Εταιρειών',
            description: 'Δημιούργησε εταιρείες και ανάθεσε πεδία στις φόρμες αιτήσεών τους.',
            icon: '🏢',
            link: '/admin/companies',
            color: 'from-emerald-500 to-cyan-600'
        },
        {
            title: 'Κάδος Ανακύκλωσης',
            description: 'Δες τους διεγραμμένους πελάτες και κάνε επαναφορά ή οριστική διαγραφή.',
            icon: '🗑️',
            link: '/admin/recycle-bin',
            color: 'from-orange-500 to-red-600'
        },
        {
            title: 'Διαχείριση Χρηστών',
            description: 'Δημιούργησε, επεξεργάσου και διαχειρίσου όλους τους χρήστες και τους ρόλους τους.',
            icon: '👥',
            link: '/admin/users',
            color: 'from-indigo-500 to-purple-600'
        },
        {
            title: 'Ρυθμίσεις Χρέωσης',
            description: 'Όρισε τη βασική χρέωση ανά αίτηση και τις κλίμακες εκπτώσεων.',
            icon: '💰',
            link: '/admin/billing-settings',
            color: 'from-yellow-500 to-orange-600'
        },
        {
            title: 'Χρέωση Ομαδαρχών',
            description: 'Δημιούργησε και δες τις ταμειακές καταστάσεις για τους ομαδάρχες.',
            icon: '🧾',
            link: '/admin/invoicing',
            color: 'from-pink-500 to-rose-600'
        },
    ];

    return (
        <div className="modern-admin-container">
            <style>
                {`
                    .modern-admin-container {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow-x: hidden;
                    }

                    .modern-admin-container::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                        pointer-events: none;
                    }

                    .modern-header {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        margin-bottom: 30px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        position: relative;
                        overflow: hidden;
                        z-index: 10;
                    }

                    .modern-header::before {
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

                    .header-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        position: relative;
                        z-index: 2;
                        flex-wrap: wrap;
                        gap: 15px;
                    }

                    .header-title {
                        font-size: 2.5rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    }

                    .modern-back-button {
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        text-decoration: none;
                        border-radius: 12px;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                    }

                    .modern-back-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .modern-back-button:hover::before {
                        left: 100%;
                    }

                    .modern-back-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                        color: white;
                        text-decoration: none;
                    }

                    .admin-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                        gap: 25px;
                        position: relative;
                        z-index: 10;
                    }

                    .admin-card {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        position: relative;
                        overflow: hidden;
                        transition: all 0.3s ease;
                        text-decoration: none;
                        color: inherit;
                    }

                    .admin-card::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        left: -50%;
                        width: 200%;
                        height: 200%;
                        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                        transform: rotate(45deg);
                        animation: shimmer 4s ease-in-out infinite;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }

                    .admin-card:hover::before {
                        opacity: 1;
                    }

                    .admin-card:hover {
                        transform: translateY(-8px);
                        box-shadow: 0 35px 70px rgba(0, 0, 0, 0.25);
                        color: inherit;
                        text-decoration: none;
                    }

                    .card-content {
                        position: relative;
                        z-index: 2;
                    }

                    .card-header {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        margin-bottom: 20px;
                    }

                    .card-icon {
                        font-size: 3rem;
                        padding: 15px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        border-radius: 15px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                    }

                    .card-title {
                        font-size: 1.4rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                        line-height: 1.3;
                    }

                    .card-description {
                        color: #6b7280;
                        font-size: 1rem;
                        line-height: 1.6;
                        margin: 0;
                    }

                    .admin-stats {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                        position: relative;
                        z-index: 10;
                    }

                    .stat-card {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(15px);
                        border-radius: 15px;
                        padding: 25px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                        text-align: center;
                        transition: all 0.3s ease;
                    }

                    .stat-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                    }

                    .stat-icon {
                        font-size: 2.5rem;
                        margin-bottom: 15px;
                    }

                    .stat-number {
                        font-size: 2rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin-bottom: 8px;
                    }

                    .stat-label {
                        color: #6b7280;
                        font-size: 0.9rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    @media (max-width: 768px) {
                        .modern-admin-container {
                            padding: 15px;
                        }

                        .modern-header {
                            padding: 25px;
                        }

                        .header-content {
                            flex-direction: column;
                            text-align: center;
                        }

                        .header-title {
                            font-size: 2rem;
                        }

                        .admin-grid {
                            grid-template-columns: 1fr;
                        }

                        .admin-card {
                            padding: 25px;
                        }

                        .card-icon {
                            font-size: 2.5rem;
                            padding: 12px;
                        }

                        .card-title {
                            font-size: 1.2rem;
                        }

                        .admin-stats {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }

                    @media (max-width: 480px) {
                        .admin-stats {
                            grid-template-columns: 1fr;
                        }
                    }
                `}
            </style>

            <div className="modern-header">
                <div className="header-content">
                    <h1 className="header-title">
                        ⚙️ Admin Panel
                    </h1>
                    <Link to="/dashboard" className="modern-back-button">
                        ← Πίσω στο Dashboard
                    </Link>
                </div>
            </div>

            <div className="admin-stats">
                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-number">7</div>
                    <div className="stat-label">Διαθέσιμες Λειτουργίες</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🎯</div>
                    <div className="stat-number">100%</div>
                    <div className="stat-label">Έλεγχος Συστήματος</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🚀</div>
                    <div className="stat-number">∞</div>
                    <div className="stat-label">Δυνατότητες</div>
                </div>
            </div>

            <div className="admin-grid">
                {adminSections.map((section, index) => (
                    <Link key={index} to={section.link} className="admin-card">
                        <div className="card-content">
                            <div className="card-header">
                                <div className="card-icon">
                                    {section.icon}
                                </div>
                                <h3 className="card-title">{section.title}</h3>
                            </div>
                            <p className="card-description">{section.description}</p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default AdminPage;