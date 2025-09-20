import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import CookieSettingsWidget from '../components/CookieSettingsWidget';

const ProfilePage = () => {
    const { user, pushNotificationStatus, isPushNotificationsEnabled } = useContext(AuthContext);
    const {
        pushSupported,
        pushSubscribed,
        enablePushNotifications,
        disablePushNotifications,
        getPushStatus
    } = useNotifications();

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        role: user?.role || ''
    });

    // Push notification states
    const [pushLoading, setPushLoading] = useState(false);
    const [pushError, setPushError] = useState('');

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSave = () => {
        // TODO: Implement save functionality
        console.log('Saving profile:', formData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setFormData({
            name: user?.name || '',
            email: user?.email || '',
            phone: user?.phone || '',
            role: user?.role || ''
        });
        setIsEditing(false);
    };

    // Handle push notification toggle
    const handlePushToggle = async (e) => {
        const enabled = e.target.checked;
        setPushLoading(true);
        setPushError('');

        try {
            if (enabled) {
                console.log('🔔 Enabling push notifications...');
                await enablePushNotifications();
                console.log('✅ Push notifications enabled successfully');
            } else {
                console.log('📵 Disabling push notifications...');
                await disablePushNotifications();
                console.log('✅ Push notifications disabled successfully');
            }
        } catch (error) {
            console.error('Push toggle error:', error);

            let errorMessage = 'Σφάλμα κατά την ενημέρωση των push notifications';

            if (error.message.includes('permission')) {
                errorMessage = 'Δεν έχετε δώσει άδεια για notifications. Ενεργοποιήστε τα από τις ρυθμίσεις του browser.';
            } else if (error.message.includes('not supported')) {
                errorMessage = 'Ο browser σας δεν υποστηρίζει push notifications.';
            }

            setPushError(errorMessage);
            // Revert checkbox state
            e.target.checked = isPushNotificationsEnabled;
        } finally {
            setPushLoading(false);
        }
    };


    return (
        <div className="profile-page">
            <style>
                {`
                    .profile-page {
                        padding: 40px;
                        max-width: 800px;
                        margin: 0 auto;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 20px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                        margin-top: 40px;
                    }

                    .profile-header {
                        text-align: center;
                        margin-bottom: 40px;
                        padding-bottom: 20px;
                        border-bottom: 1px solid rgba(0, 0, 0, 0.1);
                    }

                    .profile-header h1 {
                        color: #667eea;
                        font-size: 2rem;
                        font-weight: 600;
                        margin: 0 0 10px 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 12px;
                    }

                    .profile-header p {
                        color: #6b7280;
                        font-size: 1.1rem;
                        margin: 0;
                    }

                    .profile-content {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 30px;
                    }

                    .profile-content-full {
                        grid-column: 1 / -1;
                    }

                    .profile-section {
                        background: rgba(102, 126, 234, 0.05);
                        padding: 25px;
                        border-radius: 15px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                    }

                    .profile-section h3 {
                        color: #667eea;
                        font-size: 1.2rem;
                        font-weight: 600;
                        margin: 0 0 20px 0;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .profile-field {
                        margin-bottom: 20px;
                    }

                    .profile-field:last-child {
                        margin-bottom: 0;
                    }

                    .profile-field label {
                        display: block;
                        color: #374151;
                        font-weight: 500;
                        margin-bottom: 8px;
                        font-size: 0.9rem;
                    }

                    .profile-field input {
                        width: 100%;
                        padding: 12px 15px;
                        border: 1px solid rgba(0, 0, 0, 0.1);
                        border-radius: 8px;
                        font-size: 1rem;
                        transition: all 0.3s ease;
                        background: rgba(255, 255, 255, 0.1);
                    }

                    .profile-field input:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                    }

                    .profile-field input:disabled {
                        background: #f9fafb;
                        color: #6b7280;
                        cursor: not-allowed;
                    }

                    .profile-field-readonly {
                        padding: 12px 15px;
                        background: #f9fafb;
                        border: 1px solid rgba(0, 0, 0, 0.1);
                        border-radius: 8px;
                        color: #374151;
                        font-size: 1rem;
                    }

                    .profile-actions {
                        grid-column: 1 / -1;
                        text-align: center;
                        padding-top: 30px;
                        border-top: 1px solid rgba(0, 0, 0, 0.1);
                        margin-top: 20px;
                    }

                    .profile-btn {
                        padding: 12px 25px;
                        border: none;
                        border-radius: 8px;
                        font-size: 1rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        margin: 0 10px;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .profile-btn-primary {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    }

                    .profile-btn-primary:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                    }

                    .profile-btn-secondary {
                        background: rgba(107, 114, 128, 0.1);
                        color: #374151;
                        border: 1px solid rgba(107, 114, 128, 0.2);
                    }

                    .profile-btn-secondary:hover {
                        background: rgba(107, 114, 128, 0.15);
                        transform: translateY(-1px);
                    }

                    .profile-btn-success {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    }

                    .profile-btn-success:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                    }

                    .profile-stats {
                        grid-column: 1 / -1;
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin-bottom: 20px;
                    }

                    .profile-stat {
                        text-align: center;
                        padding: 20px;
                        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
                        border-radius: 12px;
                        border: 1px solid rgba(102, 126, 234, 0.2);
                    }

                    .profile-stat-value {
                        font-size: 2rem;
                        font-weight: 700;
                        color: #667eea;
                        margin-bottom: 8px;
                    }

                    .profile-stat-label {
                        color: #6b7280;
                        font-size: 0.9rem;
                        font-weight: 500;
                    }

                    @media (max-width: 768px) {
                        .profile-page {
                            padding: 20px;
                            margin-top: 20px;
                        }

                        .profile-content {
                            grid-template-columns: 1fr;
                            gap: 20px;
                        }

                        .profile-header h1 {
                            font-size: 1.5rem;
                        }

                        .profile-stats {
                            grid-template-columns: 1fr;
                        }

                        .profile-btn {
                            margin: 5px;
                            display: block;
                        }
                    }

                    /* Notification Settings Styles */
                    .notification-settings {
                        margin-top: 20px;
                    }

                    .notification-setting {
                        margin-bottom: 15px;
                        padding: 15px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 10px;
                        border: 1px solid rgba(102, 126, 234, 0.2);
                    }

                    .checkbox-label {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        cursor: pointer;
                        font-size: 1rem;
                        color: #374151;
                        font-weight: 500;
                    }

                    .checkbox-label input[type="checkbox"] {
                        width: 18px;
                        height: 18px;
                        accent-color: #667eea;
                        cursor: pointer;
                    }

                    .checkbox-label input[type="checkbox"]:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    .push-status {
                        margin-top: 8px;
                        font-size: 0.85rem;
                        padding: 5px 10px;
                        border-radius: 5px;
                    }

                    .push-status.supported {
                        background: rgba(16, 185, 129, 0.1);
                        color: #059669;
                        border: 1px solid rgba(16, 185, 129, 0.2);
                    }

                    .push-status.unsupported {
                        background: rgba(239, 68, 68, 0.1);
                        color: #dc2626;
                        border: 1px solid rgba(239, 68, 68, 0.2);
                    }

                    .push-status.loading {
                        background: rgba(251, 191, 36, 0.1);
                        color: #d97706;
                        border: 1px solid rgba(251, 191, 36, 0.2);
                    }

                    .push-error {
                        margin-top: 8px;
                        font-size: 0.85rem;
                        color: #dc2626;
                        background: rgba(239, 68, 68, 0.1);
                        padding: 8px 12px;
                        border-radius: 5px;
                        border: 1px solid rgba(239, 68, 68, 0.2);
                    }

                    .loading-spinner {
                        display: inline-block;
                        width: 16px;
                        height: 16px;
                        border: 2px solid rgba(102, 126, 234, 0.3);
                        border-radius: 50%;
                        border-top-color: #667eea;
                        animation: spin 1s linear infinite;
                    }

                    @keyframes spin {
                        to {
                            transform: rotate(360deg);
                        }
                    }
                `}
            </style>

            <div className="profile-header">
                <h1>👤 Το Προφίλ μου</h1>
                <p>Διαχειριστείτε τις πληροφορίες του λογαριασμού σας</p>
            </div>

            <div className="profile-stats">
                <div className="profile-stat">
                    <div className="profile-stat-value">
                        {user?.role === 'Admin' ? '👑' :
                         user?.role === 'TeamLeader' ? '🎯' :
                         user?.role === 'Agent' ? '👨‍💼' : '📋'}
                    </div>
                    <div className="profile-stat-label">Ρόλος</div>
                </div>
                <div className="profile-stat">
                    <div className="profile-stat-value">✅</div>
                    <div className="profile-stat-label">Ενεργός Λογαριασμός</div>
                </div>
                <div className="profile-stat">
                    <div className="profile-stat-value">🔒</div>
                    <div className="profile-stat-label">Ασφαλής Σύνδεση</div>
                </div>
            </div>

            <div className="profile-content">
                <div className="profile-section">
                    <h3>📝 Προσωπικά Στοιχεία</h3>

                    <div className="profile-field">
                        <label>Όνομα</label>
                        {isEditing ? (
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Εισάγετε το όνομά σας"
                            />
                        ) : (
                            <div className="profile-field-readonly">{formData.name || 'Δεν έχει οριστεί'}</div>
                        )}
                    </div>

                    <div className="profile-field">
                        <label>Email</label>
                        <div className="profile-field-readonly">{formData.email}</div>
                    </div>

                    <div className="profile-field">
                        <label>Τηλέφωνο</label>
                        {isEditing ? (
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="Εισάγετε το τηλέφωνό σας"
                            />
                        ) : (
                            <div className="profile-field-readonly">{formData.phone || 'Δεν έχει οριστεί'}</div>
                        )}
                    </div>
                </div>

                <div className="profile-section">
                    <h3>🏢 Στοιχεία Εργασίας</h3>

                    <div className="profile-field">
                        <label>Ρόλος</label>
                        <div className="profile-field-readonly">{formData.role}</div>
                    </div>

                    <div className="profile-field">
                        <label>Κατάσταση</label>
                        <div className="profile-field-readonly">
                            <span style={{color: '#10b981', fontWeight: '600'}}>✅ Ενεργός</span>
                        </div>
                    </div>

                    <div className="profile-field">
                        <label>Τελευταία Σύνδεση</label>
                        <div className="profile-field-readonly">
                            {new Date().toLocaleDateString('el-GR')} - Τώρα
                        </div>
                    </div>
                </div>

                {/* Notifications Settings Section */}
                <div className="profile-section">
                    <h3>🔔 Ειδοποιήσεις</h3>

                    <div className="notification-settings">
                        <div className="notification-setting">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={isPushNotificationsEnabled}
                                    onChange={handlePushToggle}
                                    disabled={!pushSupported || pushLoading}
                                />
                                🖥️ Desktop notifications για νέες αιτήσεις
                                {pushLoading && <div className="loading-spinner"></div>}
                            </label>

                            {/* Status indicators */}
                            {!pushSupported && (
                                <div className="push-status unsupported">
                                    ❌ Ο browser σας δεν υποστηρίζει push notifications
                                </div>
                            )}

                            {pushSupported && !pushLoading && (
                                <div className={`push-status ${isPushNotificationsEnabled ? 'supported' : ''}`}>
                                    {isPushNotificationsEnabled ? '✅ Ενεργοποιημένες' : '⚪ Απενεργοποιημένες'}
                                    {pushNotificationStatus && (
                                        <small style={{display: 'block', fontSize: '0.75rem', marginTop: '4px', opacity: 0.7}}>
                                            {pushNotificationStatus.hasActiveSubscriptions ?
                                                `${pushNotificationStatus.subscriptionCount} ενεργές συνδέσεις` :
                                                'Καμία ενεργή σύνδεση'
                                            }
                                        </small>
                                    )}
                                </div>
                            )}

                            {pushLoading && (
                                <div className="push-status loading">
                                    ⏳ Ενημέρωση ρυθμίσεων...
                                </div>
                            )}

                            {pushError && (
                                <div className="push-error">
                                    ⚠️ {pushError}
                                </div>
                            )}
                        </div>

                        <div className="notification-setting">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={true}
                                    disabled={true}
                                />
                                📧 Email notifications
                            </label>
                            <div className="push-status supported">
                                ✅ Πάντα ενεργοποιημένες
                            </div>
                        </div>

                        <div className="notification-setting">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={true}
                                    disabled={true}
                                />
                                💬 In-app notifications (Toast)
                            </label>
                            <div className="push-status supported">
                                ✅ Πάντα ενεργοποιημένες
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cookie Settings Section */}
                <div className="profile-content-full">
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '20px',
                        padding: '30px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        marginBottom: '30px'
                    }}>
                        <CookieSettingsWidget />
                    </div>
                </div>

                <div className="profile-actions">
                    {isEditing ? (
                        <>
                            <button
                                className="profile-btn profile-btn-success"
                                onClick={handleSave}
                            >
                                💾 Αποθήκευση
                            </button>
                            <button
                                className="profile-btn profile-btn-secondary"
                                onClick={handleCancel}
                            >
                                ❌ Ακύρωση
                            </button>
                        </>
                    ) : (
                        <button
                            className="profile-btn profile-btn-primary"
                            onClick={() => setIsEditing(true)}
                        >
                            ✏️ Επεξεργασία
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;