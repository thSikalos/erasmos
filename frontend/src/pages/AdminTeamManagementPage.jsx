import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { apiUrl } from '../utils/api';
import '../App.css';

const EnhancedTeamHierarchyModal = ({ teamLeader, onClose, onRefresh }) => {
    const { token } = useContext(AuthContext);
    const { showConfirmModal } = useNotifications();
    const [hierarchy, setHierarchy] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState({});

    // Centralized toast notification function
    const sendCentralizedToast = async (type, title, message, duration = 5000) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(apiUrl('/api/notifications/toast'), {
                type,
                title,
                message,
                duration
            }, config);
        } catch (error) {
            console.error('Failed to send centralized toast:', error);
        }
    };

    // Confirm action function using custom modal
    const confirmAction = async (title, message, onConfirm) => {
        showConfirmModal({
            title,
            message,
            onConfirm: async () => {
                await onConfirm();
            },
            type: 'danger',
            confirmText: 'Επιβεβαίωση',
            cancelText: 'Ακύρωση'
        });
    };

    useEffect(() => {
        if (teamLeader?.id && token) {
            fetchTeamHierarchy();
        }
    }, [teamLeader, token]);

    const fetchTeamHierarchy = async () => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(apiUrl(`/api/users/${teamLeader.id}/team-hierarchy`), config);
            setHierarchy(response.data.hierarchy);
        } catch (err) {
            console.error('Error fetching team hierarchy:', err);
            await sendCentralizedToast('system_error', '❌ Σφάλμα', 'Αποτυχία φόρτωσης ιεραρχίας');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSubTeam = async (userId, currentStatus, userName, directChildrenCount = 0) => {
        const action = currentStatus ? 'deactivate' : 'activate';
        const totalAffected = directChildrenCount + 1;

        // Check if trying to activate but parent is inactive
        const userInHierarchy = hierarchy.find(h => h.id === userId);
        if (!currentStatus && userInHierarchy?.level > 0) {
            const parentId = userInHierarchy.parent_user_id || teamLeader.id;
            const parent = hierarchy.find(h => h.id === parentId) || teamLeader;
            if (!parent.is_active) {
                await sendCentralizedToast(
                    'system_error',
                    '❌ Σφάλμα',
                    `Δεν μπορείτε να ενεργοποιήσετε τον χρήστη "${userName}" όταν ο προϊστάμενός του "${parent.name}" είναι απενεργοποιημένος.`
                );
                return;
            }
        }

        await confirmAction(
            `${action.charAt(0).toUpperCase() + action.slice(1)} χρήστη`,
            `Είστε σίγουροι ότι θέλετε να ${action === 'activate' ? 'ενεργοποιήσετε' : 'απενεργοποιήσετε'} τον χρήστη "${userName}" και τα άμεσα μέλη του;`,
            async () => {
                setUpdating(prev => ({ ...prev, [userId]: true }));
                try {
                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    await axios.put(apiUrl(`/api/users/${userId}/toggle-subteam`), {}, config);
                    await sendCentralizedToast(
                        'system_success',
                        '✅ Επιτυχία',
                        `Ο χρήστης "${userName}" ${currentStatus ? 'απενεργοποιήθηκε' : 'ενεργοποιήθηκε'} επιτυχώς!`
                    );
                    await fetchTeamHierarchy();
                    onRefresh(); // Refresh the main table
                } catch (err) {
                    const errorMessage = err.response?.data?.message || 'Failed to toggle sub-team status';
                    await sendCentralizedToast('system_error', '❌ Σφάλμα', errorMessage);
                } finally {
                    setUpdating(prev => ({ ...prev, [userId]: false }));
                }
            },
            totalAffected
        );
    };

    const handleToggleEntireTeam = async () => {
        const action = teamLeader.is_active ? 'deactivate' : 'activate';
        const totalMembers = hierarchy.length + 1; // +1 for team leader

        await confirmAction(
            `${action.charAt(0).toUpperCase() + action.slice(1)} ομάδα`,
            `Είστε σίγουροι ότι θέλετε να ${action === 'activate' ? 'ενεργοποιήσετε' : 'απενεργοποιήσετε'} ολόκληρη την ομάδα του "${teamLeader?.name}";`,
            async () => {
                setUpdating(prev => ({ ...prev, 'team_leader': true }));
                try {
                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    await axios.put(apiUrl(`/api/users/${teamLeader.id}/toggle-team`), {}, config);
                    await sendCentralizedToast(
                        'system_success',
                        '✅ Επιτυχία',
                        `Η ομάδα ${teamLeader.is_active ? 'απενεργοποιήθηκε' : 'ενεργοποιήθηκε'} επιτυχώς!`
                    );
                    await fetchTeamHierarchy();
                    onRefresh(); // Refresh the main table
                    // Update team leader status for UI
                    teamLeader.is_active = !teamLeader.is_active;
                } catch (err) {
                    const errorMessage = err.response?.data?.message || 'Failed to toggle team status';
                    await sendCentralizedToast('system_error', '❌ Σφάλμα', errorMessage);
                } finally {
                    setUpdating(prev => ({ ...prev, 'team_leader': false }));
                }
            },
            totalMembers
        );
    };

    const getDirectChildrenCount = (userId) => {
        return hierarchy.filter(member => member.parent_user_id === userId).length;
    };

    return (
        <div className="modal-backdrop-modern">
            <div className="modal-modern" style={{ maxWidth: '900px' }}>
                <div className="modal-header">
                    <h2>🏗️ Διαχείριση Ομάδας: {teamLeader?.name}</h2>
                </div>
                <div className="modal-content" style={{ padding: '2rem' }}>
                    {/* Master Controls */}
                    <div className="master-controls">
                        <button
                            onClick={handleToggleEntireTeam}
                            disabled={updating.team_leader}
                            className={`master-toggle-button ${teamLeader?.is_active ? 'deactivate' : 'activate'}`}
                        >
                            {updating.team_leader ? (
                                <>⏳ Επεξεργασία...</>
                            ) : teamLeader?.is_active ? (
                                <>🚫 Απενεργοποίηση Ολόκληρης Ομάδας</>
                            ) : (
                                <>✅ Ενεργοποίηση Ολόκληρης Ομάδας</>
                            )}
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
                            <div className="loading-spinner"></div>
                            <p>Φόρτωση ιεραρχίας...</p>
                        </div>
                    ) : (
                        <div className="enhanced-hierarchy-tree">
                            {/* Team Leader */}
                            <div className="hierarchy-member team-leader">
                                <div className="member-info-row">
                                    <div className="member-details">
                                        <span className="member-icon">👑</span>
                                        <span className="member-name">{teamLeader.name}</span>
                                        <span className="member-email">({teamLeader.email})</span>
                                        <span className={`member-role role-${teamLeader.role?.toLowerCase()}`}>
                                            {teamLeader.role}
                                        </span>
                                        <span className={`status-badge ${teamLeader.is_active ? 'active' : 'inactive'}`}>
                                            {teamLeader.is_active ? '✅ Ενεργός' : '❌ Απενεργός'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Team Members */}
                            {hierarchy.map((member) => {
                                const directChildrenCount = getDirectChildrenCount(member.id);
                                const isDisabled = !teamLeader.is_active || updating[member.id];

                                return (
                                    <div key={member.id} className={`hierarchy-member level-${member.level}`}>
                                        <div className="member-info-row">
                                            <div className="member-details">
                                                <div className="hierarchy-connector">
                                                    {'  '.repeat(member.level)}
                                                    {member.level > 0 && '└─ '}
                                                </div>
                                                <span className="member-icon">
                                                    {directChildrenCount > 0 ? '👥' : '👤'}
                                                </span>
                                                <span className="member-name">{member.name}</span>
                                                <span className="member-email">({member.email})</span>
                                                <span className={`member-role role-${member.role.toLowerCase()}`}>
                                                    {member.role}
                                                </span>
                                                <span className={`status-badge ${member.is_active ? 'active' : 'inactive'}`}>
                                                    {member.is_active ? '✅ Ενεργός' : '❌ Απενεργός'}
                                                </span>
                                            </div>
                                            <div className="member-controls">
                                                {directChildrenCount > 0 && (
                                                    <span className="children-count">
                                                        +{directChildrenCount} μέλη
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleToggleSubTeam(
                                                        member.id,
                                                        member.is_active,
                                                        member.name,
                                                        directChildrenCount
                                                    )}
                                                    disabled={isDisabled}
                                                    className={`individual-toggle-button ${member.is_active ? 'deactivate' : 'activate'}`}
                                                >
                                                    {updating[member.id] ? (
                                                        <>⏳</>
                                                    ) : member.is_active ? (
                                                        <>🔇 Απενεργ.</>
                                                    ) : (
                                                        <>🔊 Ενεργ.</>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {hierarchy.length === 0 && (
                                <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', padding: '2rem' }}>
                                    <p>Ο ομαδάρχης δεν έχει μέλη στην ομάδα του.</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="modal-actions" style={{ marginTop: '2rem' }}>
                        <button onClick={onClose} className="cancel-button-modern">
                            ✅ Κλείσιμο
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdminTeamManagementPage = () => {
    const { token } = useContext(AuthContext);
    const { showConfirmModal } = useNotifications();
    const [teamLeaders, setTeamLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedTeamLeader, setSelectedTeamLeader] = useState(null);
    const [showHierarchy, setShowHierarchy] = useState(false);
    const [filter, setFilter] = useState('all'); // all, active, inactive
    const [searchTerm, setSearchTerm] = useState('');

    // Centralized toast notification function
    const sendCentralizedToast = async (type, title, message, duration = 5000) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(apiUrl('/api/notifications/toast'), {
                type,
                title,
                message,
                duration
            }, config);
        } catch (error) {
            console.error('Failed to send centralized toast:', error);
        }
    };

    // Confirm action function using custom modal
    const confirmAction = async (title, message, onConfirm) => {
        showConfirmModal({
            title,
            message,
            onConfirm: async () => {
                await onConfirm();
            },
            type: 'danger',
            confirmText: 'Επιβεβαίωση',
            cancelText: 'Ακύρωση'
        });
    };

    const fetchTeamLeaders = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(apiUrl('/api/users/team-leaders/all'), config);
            setTeamLeaders(response.data);
        } catch (err) {
            setError('Failed to fetch team leaders');
            await sendCentralizedToast('system_error', '❌ Σφάλμα', 'Αποτυχία φόρτωσης ομαδαρχών');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamLeaders();
    }, [token]);

    const handleToggleUserStatus = async (userId, currentStatus) => {
        const user = teamLeaders.find(tl => tl.id === userId);
        const action = currentStatus ? 'deactivate' : 'activate';

        await confirmAction(
            `${action.charAt(0).toUpperCase() + action.slice(1)} χρήστη`,
            `Είστε σίγουροι ότι θέλετε να ${action === 'activate' ? 'ενεργοποιήσετε' : 'απενεργοποιήσετε'} τον χρήστη "${user?.name}";`,
            async () => {
                try {
                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    await axios.put(apiUrl(`/api/users/${userId}/toggle-status`), {}, config);
                    await sendCentralizedToast('system_success', '✅ Επιτυχία', `Ο χρήστης ${currentStatus ? 'απενεργοποιήθηκε' : 'ενεργοποιήθηκε'} επιτυχώς!`);
                    fetchTeamLeaders();
                } catch (err) {
                    const errorMessage = err.response?.data?.message || 'Failed to toggle user status';
                    setError(errorMessage);
                    await sendCentralizedToast('system_error', '❌ Σφάλμα', errorMessage);
                }
            },
            1
        );
    };

    const handleToggleTeamStatus = async (teamLeaderId, currentStatus) => {
        const teamLeader = teamLeaders.find(tl => tl.id === teamLeaderId);
        const memberCount = teamLeader?.team_member_count || 0;
        const totalAffected = memberCount + 1;
        const action = currentStatus ? 'deactivate' : 'activate';

        await confirmAction(
            `${action.charAt(0).toUpperCase() + action.slice(1)} ομάδα`,
            `Είστε σίγουροι ότι θέλετε να ${action === 'activate' ? 'ενεργοποιήσετε' : 'απενεργοποιήσετε'} ολόκληρη την ομάδα του "${teamLeader?.name}";`,
            async () => {
                try {
                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    const response = await axios.put(apiUrl(`/api/users/${teamLeaderId}/toggle-team`), {}, config);
                    await sendCentralizedToast(
                        'system_success',
                        '✅ Επιτυχία',
                        `Η ομάδα ${currentStatus ? 'απενεργοποιήθηκε' : 'ενεργοποιήθηκε'} επιτυχώς! Επηρεάστηκαν ${response.data.affected_members + 1} άτομα.`
                    );
                    fetchTeamLeaders();
                } catch (err) {
                    const errorMessage = err.response?.data?.message || 'Failed to toggle team status';
                    setError(errorMessage);
                    await sendCentralizedToast('system_error', '❌ Σφάλμα', errorMessage);
                }
            },
            totalAffected
        );
    };

    const handleShowHierarchy = (teamLeader) => {
        setSelectedTeamLeader(teamLeader);
        setShowHierarchy(true);
    };

    const handleRefreshFromModal = () => {
        fetchTeamLeaders();
    };

    const filteredTeamLeaders = teamLeaders.filter(tl => {
        const matchesFilter = filter === 'all' ||
                            (filter === 'active' && tl.is_active) ||
                            (filter === 'inactive' && !tl.is_active);
        const matchesSearch = tl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            tl.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const stats = {
        total: teamLeaders.length,
        active: teamLeaders.filter(tl => tl.is_active).length,
        inactive: teamLeaders.filter(tl => !tl.is_active).length,
        totalMembers: teamLeaders.reduce((sum, tl) => sum + (tl.team_member_count || 0), 0)
    };

    if (loading) {
        return (
            <div className="admin-team-container">
                <div className="loading-container">
                    <div>
                        <div className="loading-spinner"></div>
                        <div className="loading-text">Φόρτωση ομαδαρχών...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <style>{`
                .admin-team-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    position: relative;
                    padding: 0;
                    overflow-x: hidden;
                }

                .admin-team-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background:
                        radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%);
                    pointer-events: none;
                }

                .modern-header {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 2rem 0;
                    position: relative;
                    z-index: 10;
                }

                .header-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                }

                .header-title {
                    background: linear-gradient(135deg, #ffffff, #f8f9ff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin: 0;
                    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                }

                .header-actions {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }

                .back-link {
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(10px);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 25px;
                    text-decoration: none;
                    font-weight: 600;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .back-link:hover {
                    background: rgba(255, 255, 255, 0.25);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                    text-decoration: none;
                    color: white;
                }

                .main-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                    position: relative;
                    z-index: 5;
                }

                .controls-section {
                    margin-bottom: 2rem;
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .search-box {
                    flex: 1;
                    min-width: 300px;
                    max-width: 400px;
                }

                .search-box input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    font-size: 1rem;
                    box-sizing: border-box;
                }

                .search-box input::placeholder {
                    color: rgba(255, 255, 255, 0.6);
                }

                .filter-buttons {
                    display: flex;
                    gap: 0.5rem;
                }

                .filter-button {
                    padding: 10px 20px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-weight: 500;
                }

                .filter-button.active {
                    background: linear-gradient(135deg, #10b981, #059669);
                    border-color: #10b981;
                }

                .filter-button:hover {
                    background: rgba(255, 255, 255, 0.2);
                }

                .statistics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .stat-card {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    padding: 1.5rem;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }

                .stat-number {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: white;
                    margin-bottom: 0.5rem;
                }

                .stat-label {
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                .error-message-modern {
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 12px;
                    padding: 1rem;
                    color: white;
                    margin-bottom: 1.5rem;
                    font-weight: 500;
                }

                .table-container {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    overflow: hidden;
                    position: relative;
                }

                .modern-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: transparent;
                }

                .modern-table thead {
                    background: rgba(255, 255, 255, 0.1);
                }

                .modern-table th {
                    padding: 1.5rem 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: white;
                    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
                    background: rgba(255, 255, 255, 0.05);
                }

                .modern-table td {
                    padding: 1.5rem 1rem;
                    color: rgba(255, 255, 255, 0.9);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;
                }

                .modern-table tbody tr {
                    transition: all 0.3s ease;
                }

                .modern-table tbody tr:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .status-badge {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    display: inline-block;
                }

                .status-active {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                }

                .status-inactive {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                }

                .role-badge {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .role-admin {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                }

                .role-teamleader {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                }

                .action-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .action-button {
                    border: none;
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.85rem;
                    min-width: 100px;
                }

                .toggle-user-button {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                }

                .toggle-team-button {
                    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                    color: white;
                }

                .hierarchy-button {
                    background: linear-gradient(135deg, #06b6d4, #0891b2);
                    color: white;
                }

                .action-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                }

                .hierarchy-tree {
                    font-family: 'Courier New', monospace;
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 12px;
                    padding: 1.5rem;
                    max-height: 400px;
                    overflow-y: auto;
                }

                .hierarchy-item {
                    display: flex;
                    align-items: center;
                    margin-bottom: 0.5rem;
                    color: white;
                }

                .hierarchy-connector {
                    color: rgba(255, 255, 255, 0.5);
                    margin-right: 0.5rem;
                    font-weight: bold;
                }

                .member-info {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .member-info.inactive {
                    opacity: 0.6;
                }

                .member-name {
                    font-weight: bold;
                    color: white;
                }

                .member-email {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.9rem;
                }

                .member-role {
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .loading-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    color: white;
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                .loading-text {
                    font-size: 1.1rem;
                    font-weight: 500;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .header-content {
                        flex-direction: column;
                        text-align: center;
                    }

                    .header-title {
                        font-size: 1.8rem;
                    }

                    .main-content {
                        padding: 1rem;
                    }

                    .controls-section {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .search-box {
                        min-width: auto;
                        max-width: none;
                    }

                    .statistics-grid {
                        grid-template-columns: 1fr;
                    }

                    .modern-table {
                        font-size: 0.8rem;
                    }

                    .modern-table th,
                    .modern-table td {
                        padding: 1rem 0.5rem;
                    }

                    .action-buttons {
                        flex-direction: column;
                    }

                    .action-button {
                        min-width: auto;
                        width: 100%;
                    }
                }

                /* Enhanced Modal Styles */
                .master-controls {
                    margin-bottom: 2rem;
                    text-align: center;
                }

                .master-toggle-button {
                    padding: 1rem 2rem;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 1.1rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    min-width: 300px;
                }

                .master-toggle-button.activate {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                }

                .master-toggle-button.deactivate {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                }

                .master-toggle-button:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                }

                .master-toggle-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .enhanced-hierarchy-tree {
                    background: rgba(0, 0, 0, 0.2);
                    border-radius: 12px;
                    padding: 1.5rem;
                    max-height: 500px;
                    overflow-y: auto;
                }

                .hierarchy-member {
                    margin-bottom: 1rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    border-left: 4px solid rgba(255, 255, 255, 0.3);
                }

                .hierarchy-member.team-leader {
                    border-left-color: #f59e0b;
                    background: rgba(245, 158, 11, 0.1);
                }

                .member-info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                }

                .member-details {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    flex: 1;
                    flex-wrap: wrap;
                }

                .member-icon {
                    font-size: 1.2rem;
                }

                .member-name {
                    font-weight: bold;
                    color: white;
                    font-size: 1rem;
                }

                .member-email {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.9rem;
                }

                .member-role {
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .member-controls {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .children-count {
                    background: rgba(255, 255, 255, 0.2);
                    padding: 4px 8px;
                    border-radius: 10px;
                    font-size: 0.8rem;
                    color: white;
                    white-space: nowrap;
                }

                .individual-toggle-button {
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.85rem;
                    min-width: 80px;
                }

                .individual-toggle-button.activate {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                }

                .individual-toggle-button.deactivate {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                }

                .individual-toggle-button:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                }

                .individual-toggle-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                @media (max-width: 768px) {
                    .member-info-row {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 0.5rem;
                    }

                    .member-details {
                        justify-content: center;
                        text-align: center;
                    }

                    .member-controls {
                        justify-content: center;
                    }

                    .master-toggle-button {
                        min-width: auto;
                        width: 100%;
                    }
                }
            `}</style>

            <div className="admin-team-container">
                {showHierarchy && (
                    <EnhancedTeamHierarchyModal
                        teamLeader={selectedTeamLeader}
                        onClose={() => setShowHierarchy(false)}
                        onRefresh={handleRefreshFromModal}
                    />
                )}

                <header className="modern-header">
                    <div className="header-content">
                        <h1 className="header-title">👥 Διαχείριση Ομάδων</h1>
                        <div className="header-actions">
                            <Link to="/admin" className="back-link">
                                ← Πίσω στο Admin Panel
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="main-content">
                    <div className="controls-section">
                        <div className="search-box">
                            <input
                                type="text"
                                placeholder="🔍 Αναζήτηση ομαδάρχη..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-buttons">
                            <button
                                className={`filter-button ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => setFilter('all')}
                            >
                                Όλοι
                            </button>
                            <button
                                className={`filter-button ${filter === 'active' ? 'active' : ''}`}
                                onClick={() => setFilter('active')}
                            >
                                Ενεργοί
                            </button>
                            <button
                                className={`filter-button ${filter === 'inactive' ? 'active' : ''}`}
                                onClick={() => setFilter('inactive')}
                            >
                                Απενεργοί
                            </button>
                        </div>
                    </div>

                    <div className="statistics-grid">
                        <div className="stat-card">
                            <div className="stat-number">{stats.total}</div>
                            <div className="stat-label">Σύνολο Ομαδαρχών</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{stats.active}</div>
                            <div className="stat-label">Ενεργοί Ομαδάρχες</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{stats.inactive}</div>
                            <div className="stat-label">Απενεργοί Ομαδάρχες</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{stats.totalMembers}</div>
                            <div className="stat-label">Σύνολο Μελών Ομάδων</div>
                        </div>
                    </div>

                    {error && <div className="error-message-modern">❌ {error}</div>}

                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>👤 Ομαδάρχης</th>
                                    <th>📧 Email</th>
                                    <th>🎭 Ρόλος</th>
                                    <th>👥 Μέλη Ομάδας</th>
                                    <th>📊 Κατάσταση</th>
                                    <th>⚙️ Ενέργειες</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTeamLeaders.map(tl => (
                                    <tr key={tl.id}>
                                        <td style={{ fontWeight: '600' }}>{tl.name}</td>
                                        <td>{tl.email}</td>
                                        <td>
                                            <span className={`role-badge role-${tl.role.toLowerCase()}`}>
                                                {tl.role}
                                            </span>
                                        </td>
                                        <td>
                                            <div>
                                                <strong>{tl.team_member_count || 0}</strong> μέλη
                                                {tl.team_member_count > 0 && (
                                                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                                                        ({tl.active_team_members || 0} ενεργά)
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${tl.is_active ? 'active' : 'inactive'}`}>
                                                {tl.is_active ? '✅ Ενεργός' : '❌ Απενεργός'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => handleToggleUserStatus(tl.id, tl.is_active)}
                                                    className="action-button toggle-user-button"
                                                >
                                                    {tl.is_active ? '🔇 Απενεργ.' : '🔊 Ενεργ.'} Χρήστη
                                                </button>
                                                <button
                                                    onClick={() => handleToggleTeamStatus(tl.id, tl.is_active)}
                                                    className="action-button toggle-team-button"
                                                >
                                                    {tl.is_active ? '🚫 Απενεργ.' : '✅ Ενεργ.'} Ομάδα
                                                </button>
                                                <button
                                                    onClick={() => handleShowHierarchy(tl)}
                                                    className="action-button hierarchy-button"
                                                >
                                                    🏗️ Ιεραρχία
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredTeamLeaders.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
                            <p>Δεν βρέθηκαν ομαδάρχες με αυτά τα κριτήρια.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminTeamManagementPage;