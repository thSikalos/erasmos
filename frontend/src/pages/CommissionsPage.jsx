import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const CommissionsPage = () => {
    const { token, user } = useContext(AuthContext);
    const { showErrorToast } = useNotifications();
    const [team, setTeam] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [fields, setFields] = useState([]);
    const [commissions, setCommissions] = useState({});
    const [bonuses, setBonuses] = useState({});
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [expandedAssociates, setExpandedAssociates] = useState(new Set());

    // Bonus form states
    const [bonusFormData, setBonusFormData] = useState({
        targetUserId: '',
        name: '',
        targetCount: '',
        bonusAmount: '',
        selectedCompanies: []
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [teamRes, companiesRes, fieldsRes, commissionsRes, bonusesRes] = await Promise.all([
                    axios.get(user.role === 'Admin' ? 'http://localhost:3000/api/users' : 'http://localhost:3000/api/users/my-team', config),
                    axios.get('http://localhost:3000/api/companies', config),
                    axios.get('http://localhost:3000/api/fields', config),
                    axios.get('http://localhost:3000/api/commissions', config),
                    axios.get('http://localhost:3000/api/bonuses/all', config)
                ]);

                setTeam(teamRes.data.filter(u => u.role === 'Associate'));
                setCompanies(companiesRes.data);
                setFields(fieldsRes.data.filter(f => f.is_commissionable));

                const commissionsMap = {};
                commissionsRes.data.company_commissions.forEach(c => {
                    commissionsMap[`${c.associate_id}-company-${c.company_id}`] = c.amount;
                });
                commissionsRes.data.field_commissions.forEach(c => {
                    commissionsMap[`${c.associate_id}-field-${c.field_id}`] = c.amount;
                });
                setCommissions(commissionsMap);

                // Group bonuses by target user id
                const bonusesMap = {};
                bonusesRes.data.forEach(bonus => {
                    if (!bonusesMap[bonus.target_user_id]) {
                        bonusesMap[bonus.target_user_id] = [];
                    }
                    bonusesMap[bonus.target_user_id].push(bonus);
                });
                setBonuses(bonusesMap);

            } catch(err) {
                console.error("Failed to load data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token, user]);

    const handleCommissionChange = (key, amount) => {
        setCommissions(prev => ({ ...prev, [key]: amount }));
    };

    const handleSaveCommission = async (type, associateId, entityId) => {
        const key = `${associateId}-${type}-${entityId}`;
        const amount = commissions[key] || 0;
        setSuccessMessage('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = { associate_id: associateId, amount: parseFloat(amount) };
            let url = 'http://localhost:3000/api/commissions/';

            if (type === 'company') {
                payload.company_id = entityId;
                url += 'company';
            } else {
                payload.field_id = entityId;
                url += 'field';
            }

            await axios.post(url, payload, config);
            setSuccessMessage('Η αμοιβή αποθηκεύτηκε!');
        } catch (error) {
            console.error("Failed to save commission", error);
            showErrorToast('Σφάλμα', 'Σφάλμα κατά την αποθήκευση.');
        }
    };

    const handleBonusFormChange = (field, value) => {
        setBonusFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleCompanyToggle = (associateId, companyId) => {
        setBonusFormData(prev => {
            if (prev.targetUserId !== associateId.toString()) {
                return {
                    ...prev,
                    targetUserId: associateId.toString(),
                    selectedCompanies: [companyId]
                };
            }

            const isSelected = prev.selectedCompanies.includes(companyId);
            const newSelected = isSelected
                ? prev.selectedCompanies.filter(id => id !== companyId)
                : [...prev.selectedCompanies, companyId];

            return { ...prev, selectedCompanies: newSelected };
        });
    };

    const handleCreateBonus = async (associateId) => {
        setSuccessMessage('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const bonusData = {
                target_user_id: parseInt(associateId),
                name: bonusFormData.name,
                application_count_target: parseInt(bonusFormData.targetCount),
                bonus_amount_per_application: parseFloat(bonusFormData.bonusAmount),
                company_ids: bonusFormData.selectedCompanies
            };

            await axios.post('http://localhost:3000/api/bonuses', bonusData, config);
            setSuccessMessage('🎉 Το bonus δημιουργήθηκε με επιτυχία!');

            // Reset form
            setBonusFormData({
                targetUserId: '',
                name: '',
                targetCount: '',
                bonusAmount: '',
                selectedCompanies: []
            });

            // Refresh bonuses data
            const bonusesRes = await axios.get('http://localhost:3000/api/bonuses/all', config);
            const bonusesMap = {};
            bonusesRes.data.forEach(bonus => {
                if (!bonusesMap[bonus.target_user_id]) {
                    bonusesMap[bonus.target_user_id] = [];
                }
                bonusesMap[bonus.target_user_id].push(bonus);
            });
            setBonuses(bonusesMap);

            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Failed to create bonus", error);
            showErrorToast('Σφάλμα', 'Σφάλμα κατά τη δημιουργία του bonus.');
        }
    };
    
    if (loading) return (
        <div className="modern-commissions-container">
            <div className="modern-loading">
                <div className="loading-spinner"></div>
                <p>Φόρτωση αμοιβών...</p>
            </div>
        </div>
    );

    const getTotalCommissions = (associateId) => {
        let total = 0;
        Object.keys(commissions).forEach(key => {
            if (key.startsWith(`${associateId}-`)) {
                total += parseFloat(commissions[key] || 0);
            }
        });
        return total.toFixed(2);
    };

    const toggleAssociate = (associateId) => {
        setExpandedAssociates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(associateId)) {
                newSet.delete(associateId);
            } else {
                newSet.add(associateId);
            }
            return newSet;
        });
    };

    return (
        <div className="modern-commissions-container">
            <style>
                {`
                    .modern-commissions-container {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow-x: hidden;
                    }

                    .modern-commissions-container::before {
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
                        margin-bottom: 25px;
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
                        font-size: 2.2rem;
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

                    .success-message {
                        background: rgba(16, 185, 129, 0.1);
                        color: #065f46;
                        padding: 15px 20px;
                        border-radius: 12px;
                        margin-bottom: 25px;
                        border: 1px solid rgba(16, 185, 129, 0.3);
                        backdrop-filter: blur(10px);
                        text-align: center;
                        font-weight: 600;
                        position: relative;
                        z-index: 10;
                    }

                    .commissions-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
                        gap: 25px;
                        position: relative;
                        z-index: 10;
                    }

                    .associate-card {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        position: relative;
                        overflow: hidden;
                        transition: all 0.3s ease;
                    }

                    .associate-card.collapsed {
                        padding: 20px 30px;
                        cursor: pointer;
                    }

                    .associate-card.collapsed:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }

                    .associate-card::before {
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

                    .associate-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 35px 70px rgba(0, 0, 0, 0.2);
                    }

                    .card-content {
                        position: relative;
                        z-index: 2;
                    }

                    .associate-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 25px;
                        padding-bottom: 15px;
                        border-bottom: 2px solid rgba(102, 126, 234, 0.1);
                        position: relative;
                    }

                    .associate-header.collapsed {
                        margin-bottom: 0;
                        padding-bottom: 0;
                        border-bottom: none;
                        cursor: pointer;
                    }

                    .expand-indicator {
                        font-size: 1.2rem;
                        transition: transform 0.3s ease;
                        color: #667eea;
                        margin-left: 10px;
                    }

                    .expand-indicator.expanded {
                        transform: rotate(90deg);
                    }

                    .associate-content {
                        transition: all 0.3s ease;
                        overflow: hidden;
                    }

                    .associate-content.collapsed {
                        max-height: 0;
                        opacity: 0;
                        margin-top: 0;
                    }

                    .associate-content.expanded {
                        max-height: none;
                        opacity: 1;
                        margin-top: 25px;
                    }

                    .associate-name {
                        font-size: 1.5rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .total-commission {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 0.9rem;
                        font-weight: 600;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    }

                    .commission-section {
                        margin-bottom: 30px;
                    }

                    .section-title {
                        font-size: 1.2rem;
                        font-weight: 600;
                        color: #374151;
                        margin-bottom: 15px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .commission-item {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        margin-bottom: 15px;
                        padding: 15px;
                        background: rgba(255, 255, 255, 0.7);
                        border-radius: 12px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                    }

                    .commission-item:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
                    }

                    .commission-label {
                        flex: 1;
                        font-weight: 600;
                        color: #374151;
                        min-width: 150px;
                    }

                    .commission-input {
                        flex: 1.5;
                        padding: 12px 18px;
                        border: 2px solid rgba(102, 126, 234, 0.1);
                        border-radius: 8px;
                        font-size: 1.1rem;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                        text-align: right;
                        min-width: 120px;
                    }

                    .commission-input:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                        background: rgba(255, 255, 255, 1);
                    }

                    .save-button {
                        padding: 6px 10px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border: none;
                        border-radius: 6px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        flex: 0 0 auto;
                        font-size: 0.8rem;
                        white-space: nowrap;
                        max-width: 110px;
                    }

                    .save-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                    }

                    .section-divider {
                        margin: 25px 0;
                        padding: 20px;
                        background: rgba(102, 126, 234, 0.05);
                        border-radius: 12px;
                        border: 2px dashed rgba(102, 126, 234, 0.2);
                        text-align: center;
                        color: #667eea;
                        font-weight: 600;
                        backdrop-filter: blur(10px);
                    }

                    .modern-loading {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 50vh;
                        color: white;
                    }

                    .loading-spinner {
                        display: inline-block;
                        width: 40px;
                        height: 40px;
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    .stats-grid {
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
                        font-size: 1.8rem;
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
                        .modern-commissions-container {
                            padding: 15px;
                        }

                        .modern-header, .associate-card {
                            padding: 25px;
                        }

                        .header-content {
                            flex-direction: column;
                            text-align: center;
                        }

                        .header-title {
                            font-size: 1.8rem;
                        }

                        .commissions-grid {
                            grid-template-columns: 1fr;
                        }

                        .commission-item {
                            flex-direction: column;
                            gap: 10px;
                        }

                        .commission-input {
                            text-align: center;
                        }

                        .associate-header {
                            flex-direction: column;
                            gap: 15px;
                            text-align: center;
                        }

                        .stats-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }

                    @media (max-width: 480px) {
                        .stats-grid {
                            grid-template-columns: 1fr;
                        }
                    }

                    /* Bonus Styles */
                    .bonus-item {
                        background: rgba(255, 255, 255, 0.15);
                        border: 1px solid rgba(16, 185, 129, 0.3);
                        border-radius: 12px;
                        padding: 15px;
                        margin-bottom: 15px;
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                    }

                    .bonus-item:hover {
                        background: rgba(16, 185, 129, 0.1);
                        border-color: rgba(16, 185, 129, 0.5);
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.15);
                    }

                    .bonus-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                    }

                    .bonus-name {
                        font-weight: 600;
                        color: #374151;
                        font-size: 1rem;
                    }

                    .bonus-amount {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        padding: 4px 12px;
                        border-radius: 15px;
                        font-size: 0.85rem;
                        font-weight: 600;
                    }

                    .bonus-details {
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                        color: #6b7280;
                        font-size: 0.9rem;
                        margin-bottom: 8px;
                    }

                    .bonus-companies {
                        color: #4b5563;
                        font-size: 0.85rem;
                        background: rgba(102, 126, 234, 0.1);
                        padding: 8px;
                        border-radius: 8px;
                        border: 1px solid rgba(102, 126, 234, 0.2);
                    }

                    .no-bonuses {
                        text-align: center;
                        color: #9ca3af;
                        font-style: italic;
                        padding: 20px;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        border: 2px dashed rgba(156, 163, 175, 0.3);
                    }

                    .bonus-form {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 20px;
                        border-radius: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        margin-top: 15px;
                    }

                    .bonus-form-row {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 15px;
                    }

                    .bonus-input,
                    .bonus-input-half {
                        padding: 12px 16px;
                        border: 2px solid rgba(102, 126, 234, 0.1);
                        border-radius: 8px;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                        color: #374151;
                        font-size: 0.95rem;
                    }

                    .bonus-input {
                        flex: 1;
                    }

                    .bonus-input-half {
                        flex: 1;
                    }

                    .bonus-input:focus,
                    .bonus-input-half:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                        background: rgba(255, 255, 255, 0.25);
                    }

                    .bonus-input::placeholder,
                    .bonus-input-half::placeholder {
                        color: rgba(55, 65, 81, 0.6);
                    }

                    .bonus-companies-section {
                        margin: 20px 0;
                    }

                    .section-subtitle {
                        font-weight: 600;
                        color: #374151;
                        margin-bottom: 10px;
                        font-size: 0.95rem;
                    }

                    .companies-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 10px;
                        margin-bottom: 10px;
                    }

                    .company-checkbox {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 8px 12px;
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        font-size: 0.9rem;
                    }

                    .company-checkbox:hover {
                        background: rgba(255, 255, 255, 0.15);
                        border-color: rgba(102, 126, 234, 0.3);
                    }

                    .company-checkbox input[type="checkbox"] {
                        accent-color: #667eea;
                        transform: scale(1.1);
                    }

                    .company-checkbox span {
                        color: #374151;
                        font-weight: 500;
                    }

                    .companies-note {
                        font-size: 0.8rem;
                        color: #6b7280;
                        font-style: italic;
                        background: rgba(251, 191, 36, 0.1);
                        padding: 8px 12px;
                        border-radius: 6px;
                        border: 1px solid rgba(251, 191, 36, 0.2);
                    }

                    .create-bonus-button {
                        width: 100%;
                        padding: 14px 20px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        border-radius: 10px;
                        font-weight: 600;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    }

                    .create-bonus-button:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                        background: linear-gradient(135deg, #059669, #047857);
                    }

                    .create-bonus-button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                        transform: none;
                        box-shadow: none;
                    }

                    @media (max-width: 768px) {
                        .bonus-form-row {
                            flex-direction: column;
                        }

                        .bonus-input-half {
                            width: 100%;
                        }

                        .companies-grid {
                            grid-template-columns: 1fr;
                        }

                        .bonus-header {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 8px;
                        }
                    }
                `}
            </style>

            <div className="modern-header">
                <div className="header-content">
                    <h1 className="header-title">
                        💰 Ορισμός Αμοιβών
                    </h1>
                    <Link to="/dashboard" className="modern-back-button">
                        ← Πίσω στο Dashboard
                    </Link>
                </div>
            </div>

            {successMessage && (
                <div className="success-message">
                    ✅ {successMessage}
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-number">{team.length}</div>
                    <div className="stat-label">Συνεργάτες</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🏢</div>
                    <div className="stat-number">{companies.length}</div>
                    <div className="stat-label">Εταιρείες</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-number">{fields.length}</div>
                    <div className="stat-label">Πεδία Αμοιβής</div>
                </div>
            </div>

            <div className="commissions-grid">
                {team.map(associate => {
                    const isExpanded = expandedAssociates.has(associate.id);
                    return (
                        <div key={associate.id} className={`associate-card ${!isExpanded ? 'collapsed' : ''}`}>
                            <div className="card-content">
                                <div
                                    className={`associate-header ${!isExpanded ? 'collapsed' : ''}`}
                                    onClick={() => !isExpanded && toggleAssociate(associate.id)}
                                >
                                    <h3 className="associate-name">
                                        👤 {associate.name}
                                        {!isExpanded && (
                                            <span className="expand-indicator">
                                                ▶
                                            </span>
                                        )}
                                    </h3>
                                    <div className="total-commission">
                                        Σύνολο: €{getTotalCommissions(associate.id)}
                                        {isExpanded && (
                                            <span
                                                className="expand-indicator expanded"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAssociate(associate.id);
                                                }}
                                                style={{ marginLeft: '15px', cursor: 'pointer' }}
                                            >
                                                ▼
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className={`associate-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
                                    <div className="commission-section">
                                        <div className="section-title">
                                            🏢 Βασικές Αμοιβές Εταιρειών
                                        </div>
                                        {companies.map(company => {
                                            const key = `${associate.id}-company-${company.id}`;
                                            return (
                                                <div key={key} className="commission-item">
                                                    <div className="commission-label">{company.name}</div>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="commission-input"
                                                        value={commissions[key] || ''}
                                                        onChange={e => handleCommissionChange(key, e.target.value)}
                                                        placeholder="0.00€"
                                                    />
                                                    <button
                                                        onClick={() => handleSaveCommission('company', associate.id, company.id)}
                                                        className="save-button"
                                                    >
                                                        💾 Αποθήκευση
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="section-divider">
                                        🎯 Έξτρα Αμοιβές Πεδίων
                                    </div>

                                    <div className="commission-section">
                                        <div className="section-title">
                                            📝 Αμοιβές Ειδικών Πεδίων
                                        </div>
                                        {fields.map(field => {
                                            const key = `${associate.id}-field-${field.id}`;
                                            return (
                                                <div key={key} className="commission-item">
                                                    <div className="commission-label">{field.label}</div>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="commission-input"
                                                        value={commissions[key] || ''}
                                                        onChange={e => handleCommissionChange(key, e.target.value)}
                                                        placeholder="0.00€"
                                                    />
                                                    <button
                                                        onClick={() => handleSaveCommission('field', associate.id, field.id)}
                                                        className="save-button"
                                                    >
                                                        💾 Αποθήκευση
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="section-divider">
                                        🎁 Bonuses & Στόχοι
                                    </div>

                                    <div className="commission-section">
                                        <div className="section-title">
                                            🎯 Ενεργά Bonuses
                                        </div>
                                        {bonuses[associate.id] && bonuses[associate.id].length > 0 ? (
                                            bonuses[associate.id].map(bonus => (
                                                <div key={bonus.id} className="bonus-item">
                                                    <div className="bonus-header">
                                                        <span className="bonus-name">{bonus.name}</span>
                                                        <span className="bonus-amount">+{bonus.bonus_amount_per_application}€/αίτηση</span>
                                                    </div>
                                                    <div className="bonus-details">
                                                        <span>Στόχος: {bonus.application_count_target} αιτήσεις μηνιαία</span>
                                                        <span>Κατάσταση: {bonus.is_active ? '✅ Ενεργό' : '❌ Ανενεργό'}</span>
                                                    </div>
                                                    {bonus.companies && bonus.companies.length > 0 && (
                                                        <div className="bonus-companies">
                                                            <strong>Εταιρείες:</strong> {bonus.companies.map(c => c.name).join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-bonuses">Δεν υπάρχουν ενεργά bonuses</div>
                                        )}

                                        <div className="section-title" style={{marginTop: '20px'}}>
                                            ✨ Δημιουργία Νέου Bonus
                                        </div>

                                        <div className="bonus-form">
                                            <div className="bonus-form-row">
                                                <input
                                                    type="text"
                                                    placeholder="Όνομα Bonus"
                                                    className="bonus-input"
                                                    value={bonusFormData.targetUserId === associate.id.toString() ? bonusFormData.name : ''}
                                                    onChange={e => {
                                                        handleBonusFormChange('targetUserId', associate.id.toString());
                                                        handleBonusFormChange('name', e.target.value);
                                                    }}
                                                />
                                            </div>
                                            <div className="bonus-form-row">
                                                <input
                                                    type="number"
                                                    placeholder="Στόχος Αιτήσεων"
                                                    className="bonus-input-half"
                                                    value={bonusFormData.targetUserId === associate.id.toString() ? bonusFormData.targetCount : ''}
                                                    onChange={e => {
                                                        handleBonusFormChange('targetUserId', associate.id.toString());
                                                        handleBonusFormChange('targetCount', e.target.value);
                                                    }}
                                                />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Ποσό €/αίτηση"
                                                    className="bonus-input-half"
                                                    value={bonusFormData.targetUserId === associate.id.toString() ? bonusFormData.bonusAmount : ''}
                                                    onChange={e => {
                                                        handleBonusFormChange('targetUserId', associate.id.toString());
                                                        handleBonusFormChange('bonusAmount', e.target.value);
                                                    }}
                                                />
                                            </div>
                                            <div className="bonus-companies-section">
                                                <div className="section-subtitle">Επιλογή Εταιρειών:</div>
                                                <div className="companies-grid">
                                                    {companies.map(company => (
                                                        <label key={company.id} className="company-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                checked={bonusFormData.targetUserId === associate.id.toString() && bonusFormData.selectedCompanies.includes(company.id)}
                                                                onChange={() => handleCompanyToggle(associate.id, company.id)}
                                                            />
                                                            <span>{company.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                {bonusFormData.selectedCompanies.length === 0 && bonusFormData.targetUserId === associate.id.toString() && (
                                                    <div className="companies-note">* Αν δεν επιλέξετε εταιρείες, θα μετρούν όλες οι αιτήσεις</div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleCreateBonus(associate.id)}
                                                className="create-bonus-button"
                                                disabled={!bonusFormData.name || !bonusFormData.targetCount || !bonusFormData.bonusAmount || bonusFormData.targetUserId !== associate.id.toString()}
                                            >
                                                🎁 Δημιουργία Bonus
                                            </button>
                                        </div>
                                    </div>
                            </div>
                        </div>
                    </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CommissionsPage;