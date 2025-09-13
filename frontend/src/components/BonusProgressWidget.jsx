import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const BonusProgressWidget = () => {
    const { token } = useContext(AuthContext);
    const [bonusProgress, setBonusProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBonusProgress = async () => {
            if (!token) return;
            setLoading(true);
            setError('');
            try {
                const config = { headers: { 'Authorization': `Bearer ${token}` } };
                const response = await axios.get('http://localhost:3000/api/bonuses/my-progress', config);
                setBonusProgress(response.data);
            } catch (err) {
                console.error('Failed to fetch bonus progress:', err);
                setError('Failed to load bonus progress');
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchBonusProgress();
    }, [token]);

    if (loading) {
        return (
            <div className="bonus-progress-widget">
                <div className="widget-header">
                    <h3 className="widget-title">🎁 Τα Bonuses μου</h3>
                </div>
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <span>Φόρτωση bonuses...</span>
                </div>
            </div>
        );
    }

    if (error || bonusProgress.length === 0) {
        return (
            <div className="bonus-progress-widget">
                <div className="widget-header">
                    <h3 className="widget-title">🎁 Τα Bonuses μου</h3>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">🎯</div>
                    <p>Δεν έχεις ενεργά bonuses</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bonus-progress-widget">
            <style>
                {`
                    .bonus-progress-widget {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 20px;
                        padding: 25px;
                        position: relative;
                        overflow: hidden;
                        transition: all 0.3s ease;
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
                    }

                    .bonus-progress-widget::before {
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

                    .bonus-progress-widget:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 35px 70px rgba(0, 0, 0, 0.15);
                    }

                    .widget-header {
                        position: relative;
                        z-index: 2;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 2px solid rgba(16, 185, 129, 0.1);
                    }

                    .widget-title {
                        font-size: 1.3rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #10b981, #059669);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .loading-container,
                    .empty-state {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 30px 20px;
                        position: relative;
                        z-index: 2;
                        color: rgba(255, 255, 255, 0.8);
                        text-align: center;
                    }

                    .loading-spinner {
                        width: 30px;
                        height: 30px;
                        border: 3px solid rgba(255, 255, 255, 0.3);
                        border-top: 3px solid #10b981;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 15px;
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    .empty-icon {
                        font-size: 2.5rem;
                        margin-bottom: 10px;
                        opacity: 0.6;
                    }

                    .bonus-progress-list {
                        position: relative;
                        z-index: 2;
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }

                    .bonus-progress-item {
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(16, 185, 129, 0.2);
                        border-radius: 15px;
                        padding: 20px;
                        transition: all 0.3s ease;
                    }

                    .bonus-progress-item:hover {
                        background: rgba(16, 185, 129, 0.1);
                        border-color: rgba(16, 185, 129, 0.4);
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);
                    }

                    .bonus-header-info {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 15px;
                        flex-wrap: wrap;
                        gap: 10px;
                    }

                    .bonus-name-section {
                        flex: 1;
                        min-width: 200px;
                    }

                    .bonus-name {
                        font-size: 1.1rem;
                        font-weight: 600;
                        color: white;
                        margin-bottom: 5px;
                    }

                    .bonus-period {
                        font-size: 0.85rem;
                        color: rgba(255, 255, 255, 0.7);
                        margin-bottom: 3px;
                    }

                    .bonus-companies-info {
                        font-size: 0.8rem;
                        color: rgba(16, 185, 129, 0.8);
                        background: rgba(16, 185, 129, 0.1);
                        padding: 4px 8px;
                        border-radius: 6px;
                        border: 1px solid rgba(16, 185, 129, 0.2);
                    }

                    .bonus-stats {
                        display: flex;
                        gap: 15px;
                        align-items: center;
                        flex-wrap: wrap;
                    }

                    .bonus-target {
                        background: rgba(102, 126, 234, 0.2);
                        color: white;
                        padding: 6px 12px;
                        border-radius: 12px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        border: 1px solid rgba(102, 126, 234, 0.3);
                        white-space: nowrap;
                    }

                    .bonus-reward {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        padding: 6px 12px;
                        border-radius: 12px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        white-space: nowrap;
                    }

                    .progress-section {
                        margin-top: 15px;
                    }

                    .progress-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 8px;
                    }

                    .progress-text {
                        font-size: 0.9rem;
                        color: rgba(255, 255, 255, 0.9);
                        font-weight: 500;
                    }

                    .progress-percentage {
                        font-size: 0.9rem;
                        font-weight: 600;
                        color: #10b981;
                    }

                    .progress-bar {
                        width: 100%;
                        height: 12px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 6px;
                        overflow: hidden;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .progress-fill {
                        height: 100%;
                        background: linear-gradient(90deg, #10b981, #059669);
                        border-radius: 6px;
                        transition: width 0.8s ease-in-out;
                        position: relative;
                        overflow: hidden;
                    }

                    .progress-fill::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                        animation: progress-shine 2s ease-in-out infinite;
                    }

                    @keyframes progress-shine {
                        0% { left: -100%; }
                        100% { left: 100%; }
                    }

                    .bonus-achieved {
                        border-color: #10b981 !important;
                        background: rgba(16, 185, 129, 0.15) !important;
                    }

                    .bonus-achieved .progress-fill {
                        background: linear-gradient(90deg, #10b981, #059669);
                        box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
                    }

                    .achievement-badge {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        padding: 4px 8px;
                        border-radius: 8px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }

                    .company-breakdown {
                        margin-top: 12px;
                        padding-top: 12px;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                    }

                    .breakdown-title {
                        font-size: 0.8rem;
                        color: rgba(255, 255, 255, 0.7);
                        margin-bottom: 8px;
                        font-weight: 500;
                    }

                    .company-progress {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                    }

                    .company-stat {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 4px 10px;
                        border-radius: 8px;
                        font-size: 0.75rem;
                        color: rgba(255, 255, 255, 0.8);
                        border: 1px solid rgba(255, 255, 255, 0.15);
                    }

                    @media (max-width: 768px) {
                        .bonus-header-info {
                            flex-direction: column;
                            align-items: flex-start;
                        }

                        .bonus-stats {
                            width: 100%;
                            justify-content: flex-start;
                        }

                        .bonus-name-section {
                            width: 100%;
                            min-width: auto;
                        }
                    }

                    @media (max-width: 480px) {
                        .bonus-progress-widget {
                            padding: 20px;
                        }

                        .bonus-progress-item {
                            padding: 15px;
                        }

                        .bonus-stats {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 8px;
                        }
                    }
                `}
            </style>

            <div className="widget-header">
                <h3 className="widget-title">🎁 Τα Bonuses μου</h3>
            </div>

            <div className="bonus-progress-list">
                {bonusProgress.map((bonus) => (
                    <div
                        key={bonus.id}
                        className={`bonus-progress-item ${bonus.is_achieved ? 'bonus-achieved' : ''}`}
                    >
                        {bonus.is_achieved && (
                            <div className="achievement-badge">
                                ✨ Επιτυχία!
                            </div>
                        )}

                        <div className="bonus-header-info">
                            <div className="bonus-name-section">
                                <div className="bonus-name">{bonus.name}</div>
                                <div className="bonus-period">
                                    {bonus.current_month} • {bonus.is_active ? '✅ Ενεργό' : '❌ Ανενεργό'}
                                </div>
                                {bonus.company_breakdown && bonus.company_breakdown.length > 0 && (
                                    <div className="bonus-companies-info">
                                        {bonus.company_breakdown.map(c => c.company_name).join(', ')}
                                    </div>
                                )}
                            </div>

                            <div className="bonus-stats">
                                <div className="bonus-target">
                                    🎯 {bonus.application_count_target} αιτήσεις/μήνα
                                </div>
                                <div className="bonus-reward">
                                    💰 +{bonus.bonus_amount_per_application}€/αίτηση
                                </div>
                            </div>
                        </div>

                        <div className="progress-section">
                            <div className="progress-header">
                                <span className="progress-text">
                                    {bonus.current_applications} / {bonus.application_count_target} αιτήσεις
                                </span>
                                <span className="progress-percentage">
                                    {bonus.progress_percentage}%
                                </span>
                            </div>
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${Math.min(bonus.progress_percentage, 100)}%`
                                    }}
                                ></div>
                            </div>
                        </div>

                        {bonus.company_breakdown && bonus.company_breakdown.length > 0 && (
                            <div className="company-breakdown">
                                <div className="breakdown-title">Ανάλυση ανά εταιρεία:</div>
                                <div className="company-progress">
                                    {bonus.company_breakdown.map((company, index) => (
                                        <div key={index} className="company-stat">
                                            {company.company_name}: {company.application_count}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {bonus.is_achieved && (
                            <div style={{
                                marginTop: '12px',
                                padding: '10px',
                                background: 'rgba(16, 185, 129, 0.1)',
                                borderRadius: '8px',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                color: '#10b981',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                textAlign: 'center'
                            }}>
                                🎉 Συγχαρητήρια! Κέρδισες {bonus.earned_amount.toFixed(2)}€
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BonusProgressWidget;