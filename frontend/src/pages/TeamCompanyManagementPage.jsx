import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import axios from 'axios';
import { apiUrl } from '../utils/api';

const TeamCompanyManagementPage = () => {
    const { token, user } = useContext(AuthContext);
    const { showSuccessToast, showErrorToast } = useNotifications();

    const [companies, setCompanies] = useState([]);
    const [teamMembers, setTeamMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Check if user has access to this page
    // Top-Level Manager includes both Admins and TeamLeaders without parent
    const isTopLevelManager = (user?.role === 'Admin' || user?.role === 'TeamLeader') && user?.parent_user_id === null;

    useEffect(() => {
        if (!isTopLevelManager) {
            return; // Don't load data if user doesn't have access
        }

        fetchData();
    }, [isTopLevelManager, token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Fetch companies and team members in parallel
            const [companiesRes, teamMembersRes] = await Promise.all([
                axios.get(apiUrl('/api/team-companies'), config),
                axios.get(apiUrl('/api/team-companies/members'), config)
            ]);

            setCompanies(companiesRes.data);
            setTeamMembers(teamMembersRes.data);

        } catch (err) {
            console.error('Error fetching data:', err);
            showErrorToast('Σφάλμα', 'Αποτυχία φόρτωσης δεδομένων');
        } finally {
            setLoading(false);
        }
    };

    const handleCompanyToggle = (companyId) => {
        setCompanies(prevCompanies =>
            prevCompanies.map(company =>
                company.id === companyId
                    ? { ...company, is_accessible: !company.is_accessible }
                    : company
            )
        );
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Get selected company IDs
            const selectedCompanyIds = companies
                .filter(company => company.is_accessible)
                .map(company => company.id);

            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.put(apiUrl('/api/team-companies'), {
                companyIds: selectedCompanyIds
            }, config);

            showSuccessToast('Επιτυχία', 'Οι ρυθμίσεις εταιριών αποθηκεύτηκαν επιτυχώς');

            // Refresh data to show updated state
            await fetchData();

        } catch (err) {
            console.error('Error saving company access:', err);
            const errorMessage = err.response?.data?.message || 'Σφάλμα κατά την αποθήκευση';
            showErrorToast('Σφάλμα', errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleSelectAll = () => {
        const allSelected = companies.every(company => company.is_accessible);
        setCompanies(prevCompanies =>
            prevCompanies.map(company => ({
                ...company,
                is_accessible: !allSelected
            }))
        );
    };

    if (!isTopLevelManager) {
        return (
            <div className="access-denied">
                <div className="access-denied-content">
                    <h1>🚫 Περιορισμένη Πρόσβαση</h1>
                    <p>Αυτή η σελίδα είναι διαθέσιμη μόνο για ανώτερους διαχειριστές και ομαδάρχες.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Φόρτωση δεδομένων...</p>
            </div>
        );
    }

    const selectedCount = companies.filter(company => company.is_accessible).length;
    const allSelected = companies.length > 0 && companies.every(company => company.is_accessible);

    return (
        <div className="team-company-management">
            <div className="page-header">
                <h1>🏢 Διαχείριση Εταιριών Ομάδας</h1>
                <p>Επιλέξτε τις εταιρίες που θα είναι διαθέσιμες στην ομάδα σας κατά τη δημιουργία αιτήσεων. Ως ανώτερος διαχειριστής/ομαδάρχης, μπορείτε να ελέγχετε ποιες εταιρίες βλέπουν τα μέλη της ομάδας σας.</p>
            </div>

            <div className="content-container">
                <div className="companies-section">
                    <div className="section-header">
                        <h2>📋 Διαθέσιμες Εταιρίες</h2>
                        <div className="section-actions">
                            <button
                                className="btn-select-all"
                                onClick={handleSelectAll}
                                disabled={saving || companies.length === 0}
                            >
                                {allSelected ? '❌ Αποεπιλογή Όλων' : '✅ Επιλογή Όλων'}
                            </button>
                        </div>
                    </div>

                    <div className="selection-summary">
                        <span className="selected-count">
                            {selectedCount} από {companies.length} εταιρίες επιλεγμένες
                        </span>
                    </div>

                    <div className="companies-grid">
                        {companies.map(company => (
                            <div
                                key={company.id}
                                className={`company-card ${company.is_accessible ? 'selected' : ''}`}
                                onClick={() => handleCompanyToggle(company.id)}
                            >
                                <div className="company-header">
                                    <div className="company-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={company.is_accessible}
                                            onChange={() => handleCompanyToggle(company.id)}
                                            disabled={saving}
                                        />
                                    </div>
                                    <h3 className="company-name">{company.name}</h3>
                                </div>
                                <div className="company-status">
                                    {company.is_accessible ? (
                                        <span className="status-accessible">✅ Διαθέσιμη</span>
                                    ) : (
                                        <span className="status-not-accessible">⛔ Μη διαθέσιμη</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {companies.length === 0 && (
                        <div className="no-companies">
                            <p>Δεν βρέθηκαν εταιρίες στο σύστημα.</p>
                        </div>
                    )}
                </div>

                <div className="team-members-section">
                    <div className="section-header">
                        <h2>👥 Μέλη Ομάδας</h2>
                        <p>Αυτοί οι χρήστες θα βλέπουν μόνο τις εταιρίες που επιλέξατε:</p>
                    </div>

                    <div className="team-members-list">
                        {teamMembers.map(member => (
                            <div key={member.id} className="team-member-card">
                                <div className="member-info">
                                    <h4>{member.name}</h4>
                                    <p>{member.email}</p>
                                    <span className="member-role">{member.role}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {teamMembers.length === 0 && (
                        <div className="no-team-members">
                            <p>Δεν έχετε μέλη στην ομάδα σας.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="page-actions">
                <button
                    className="btn-save"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <>
                            <span className="spinner"></span>
                            Αποθήκευση...
                        </>
                    ) : (
                        '💾 Αποθήκευση Αλλαγών'
                    )}
                </button>
            </div>

            <style>{`
                .team-company-management {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .page-header {
                    text-align: center;
                    margin-bottom: 30px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    padding: 30px;
                }

                .page-header h1 {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0 0 10px 0;
                }

                .page-header p {
                    font-size: 1.1rem;
                    color: #6b7280;
                    margin: 0;
                }

                .content-container {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 30px;
                    margin-bottom: 30px;
                }

                .companies-section,
                .team-members-section {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    padding: 25px;
                }

                .section-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .section-header h2 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0;
                }

                .section-header p {
                    color: #6b7280;
                    margin: 5px 0 0 0;
                    font-size: 0.9rem;
                }

                .btn-select-all {
                    padding: 8px 16px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    font-size: 0.875rem;
                    transition: all 0.2s;
                }

                .btn-select-all:hover:not(:disabled) {
                    background: #2563eb;
                    transform: translateY(-1px);
                }

                .btn-select-all:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .selection-summary {
                    margin-bottom: 20px;
                    padding: 10px 15px;
                    background: rgba(59, 130, 246, 0.1);
                    border-radius: 8px;
                    border: 1px solid rgba(59, 130, 246, 0.2);
                }

                .selected-count {
                    font-weight: 600;
                    color: #1e40af;
                    font-size: 0.9rem;
                }

                .companies-grid {
                    display: grid;
                    gap: 15px;
                    max-height: 500px;
                    overflow-y: auto;
                }

                .company-card {
                    padding: 15px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .company-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    border-color: rgba(59, 130, 246, 0.5);
                }

                .company-card.selected {
                    border-color: #10b981;
                    background: rgba(16, 185, 129, 0.1);
                }

                .company-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 8px;
                }

                .company-checkbox input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    accent-color: #10b981;
                }

                .company-name {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0;
                    flex: 1;
                }

                .company-status {
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                .status-accessible {
                    color: #065f46;
                }

                .status-not-accessible {
                    color: #7f1d1d;
                }

                .team-members-list {
                    display: grid;
                    gap: 10px;
                    max-height: 300px;
                    overflow-y: auto;
                }

                .team-member-card {
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .member-info h4 {
                    margin: 0 0 4px 0;
                    font-size: 1rem;
                    font-weight: 600;
                    color: #1f2937;
                }

                .member-info p {
                    margin: 0 0 6px 0;
                    font-size: 0.875rem;
                    color: #6b7280;
                }

                .member-role {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #3b82f6;
                    background: rgba(59, 130, 246, 0.1);
                    padding: 2px 8px;
                    border-radius: 4px;
                }

                .no-companies,
                .no-team-members {
                    text-align: center;
                    padding: 40px 20px;
                    color: #6b7280;
                    font-style: italic;
                }

                .page-actions {
                    text-align: center;
                }

                .btn-save {
                    padding: 15px 30px;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1.1rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin: 0 auto;
                }

                .btn-save:hover:not(:disabled) {
                    background: #059669;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                }

                .btn-save:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .loading-container,
                .access-denied {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                }

                .access-denied-content {
                    text-align: center;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 16px;
                    padding: 40px;
                }

                .access-denied-content h1 {
                    font-size: 2rem;
                    color: #1f2937;
                    margin: 0 0 15px 0;
                }

                .access-denied-content p {
                    color: #6b7280;
                    font-size: 1.1rem;
                    margin: 0;
                }

                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .content-container {
                        grid-template-columns: 1fr;
                        gap: 20px;
                    }

                    .section-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 10px;
                    }

                    .page-header {
                        padding: 20px;
                    }

                    .page-header h1 {
                        font-size: 2rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default TeamCompanyManagementPage;