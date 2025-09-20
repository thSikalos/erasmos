import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNotifications } from '../context/NotificationContext';
import { apiUrl } from '../utils/api';

const InfoPortalEditor = ({
    activeCompany,
    activeSection,
    onSectionUpdate,
    onSectionCreate,
    onSectionDelete,
    isEditMode,
    setIsEditMode
}) => {
    const { showConfirmModal } = useNotifications();
    const [editingContent, setEditingContent] = useState('');
    const [editingTitle, setEditingTitle] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newSectionData, setNewSectionData] = useState({
        title: '',
        content: '',
        section_type: 'general'
    });
    const [loading, setLoading] = useState(false);

    // Update editing state when active section changes
    useEffect(() => {
        if (activeSection?.id) {
            setEditingContent(activeSection.content || '');
            setEditingTitle(activeSection.title || '');
        } else {
            setEditingContent('');
            setEditingTitle('');
        }
    }, [activeSection]);

    const handleSaveSection = async () => {
        if (!activeSection?.id || !editingTitle.trim()) {
            alert('Παρακαλώ συμπληρώστε τον τίτλο της ενότητας');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.put(apiUrl(`/api/infoportal/sections/${activeSection.id}`), {
                title: editingTitle,
                content: editingContent
            }, config);

            if (response.data && onSectionUpdate) {
                onSectionUpdate(response.data);
            }
            setIsEditMode(false);
        } catch (error) {
            console.error('Error updating section:', error);
            const message = error.response?.data?.error || 'Σφάλμα κατά την ενημέρωση της ενότητας';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSection = async () => {
        if (!activeCompany?.company_id || !newSectionData.title.trim()) {
            alert('Παρακαλώ συμπληρώστε τον τίτλο της ενότητας');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.post(apiUrl(`/api/infoportal/companies/${activeCompany.company_id}/sections`), newSectionData, config);

            if (response.data && onSectionCreate) {
                onSectionCreate(response.data);
            }
            setIsCreating(false);
            setNewSectionData({ title: '', content: '', section_type: 'general' });
        } catch (error) {
            console.error('Error creating section:', error);
            const message = error.response?.data?.error || 'Σφάλμα κατά τη δημιουργία της ενότητας';
            alert(message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSection = async () => {
        if (!activeSection?.id) return;

        showConfirmModal({
            title: 'Διαγραφή Ενότητας',
            message: `Είστε σίγουροι ότι θέλετε να διαγράψετε την ενότητα "${activeSection.title}";`,
            onConfirm: async () => {
                setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(apiUrl(`/api/infoportal/sections/${activeSection.id}`), config);
            if (onSectionDelete) {
                onSectionDelete(activeSection.id);
            }
                } catch (error) {
                    console.error('Error deleting section:', error);
                    const message = error.response?.data?.error || 'Σφάλμα κατά τη διαγραφή της ενότητας';
                    alert(message);
                } finally {
                    setLoading(false);
                }
            },
            type: 'danger',
            confirmText: 'Διαγραφή',
            cancelText: 'Ακύρωση'
        });
    };

    const cancelEdit = () => {
        setEditingContent(activeSection?.content || '');
        setEditingTitle(activeSection?.title || '');
        setIsEditMode(false);
    };

    const cancelCreate = () => {
        setIsCreating(false);
        setNewSectionData({ title: '', content: '', section_type: 'general' });
    };

    if (!activeCompany) {
        return (
            <div className="admin-message">
                Επιλέξτε μια εταιρεία για διαχείριση περιεχομένου
            </div>
        );
    }

    return (
        <div className="infoportal-editor">
            <style>
                {`
                    .infoportal-editor {
                        padding: 20px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 15px;
                        margin-top: 20px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .admin-controls {
                        display: flex;
                        gap: 10px;
                        margin-bottom: 20px;
                        flex-wrap: wrap;
                    }

                    .admin-btn {
                        padding: 10px 16px;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        font-size: 0.9rem;
                        min-width: 100px;
                    }

                    .admin-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    .btn-primary {
                        background: linear-gradient(135deg, #3498db, #2980b9);
                        color: white;
                        box-shadow: 0 4px 15px rgba(52, 152, 219, 0.3);
                    }

                    .btn-primary:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
                    }

                    .btn-success {
                        background: linear-gradient(135deg, #27ae60, #229954);
                        color: white;
                        box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
                    }

                    .btn-success:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
                    }

                    .btn-danger {
                        background: linear-gradient(135deg, #e74c3c, #c0392b);
                        color: white;
                        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
                    }

                    .btn-danger:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
                    }

                    .btn-secondary {
                        background: linear-gradient(135deg, #95a5a6, #7f8c8d);
                        color: white;
                        box-shadow: 0 4px 15px rgba(149, 165, 166, 0.3);
                    }

                    .btn-secondary:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(149, 165, 166, 0.4);
                    }

                    .edit-form {
                        display: flex;
                        flex-direction: column;
                        gap: 15px;
                    }

                    .form-group {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }

                    .form-label {
                        color: white;
                        font-weight: 600;
                        font-size: 0.9rem;
                    }

                    .form-input,
                    .form-textarea {
                        padding: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        font-size: 1rem;
                        backdrop-filter: blur(10px);
                    }

                    .form-input::placeholder,
                    .form-textarea::placeholder {
                        color: rgba(255, 255, 255, 0.6);
                    }

                    .form-input:focus,
                    .form-textarea:focus {
                        outline: none;
                        border-color: rgba(52, 152, 219, 0.7);
                        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
                        background: rgba(255, 255, 255, 0.15);
                    }

                    .form-textarea {
                        min-height: 150px;
                        resize: vertical;
                        font-family: inherit;
                    }

                    .form-buttons {
                        display: flex;
                        gap: 10px;
                        margin-top: 10px;
                    }

                    .create-section {
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 12px;
                        padding: 20px;
                        margin-top: 20px;
                    }

                    .create-section h3 {
                        color: white;
                        margin-bottom: 15px;
                        font-size: 1.2rem;
                    }

                    .admin-message {
                        color: rgba(255, 255, 255, 0.8);
                        text-align: center;
                        padding: 30px;
                        font-style: italic;
                    }

                    .loading-overlay {
                        position: relative;
                    }

                    .loading-overlay::after {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: inherit;
                    }

                    @media (max-width: 768px) {
                        .admin-controls {
                            flex-direction: column;
                        }

                        .admin-btn {
                            width: 100%;
                        }

                        .form-buttons {
                            flex-direction: column;
                        }
                    }
                `}
            </style>

            <div className="admin-controls">
                {!isEditMode && !isCreating && (
                    <>
                        <button
                            className="admin-btn btn-primary"
                            onClick={() => setIsEditMode(true)}
                            disabled={!activeSection}
                        >
                            ✏️ Επεξεργασία
                        </button>
                        <button
                            className="admin-btn btn-success"
                            onClick={() => setIsCreating(true)}
                        >
                            ➕ Νέα Ενότητα
                        </button>
                        <button
                            className="admin-btn btn-danger"
                            onClick={handleDeleteSection}
                            disabled={!activeSection}
                        >
                            🗑️ Διαγραφή
                        </button>
                    </>
                )}
            </div>

            {isEditMode && activeSection && (
                <div className={`edit-form ${loading ? 'loading-overlay' : ''}`}>
                    <div className="form-group">
                        <label className="form-label">Τίτλος Ενότητας</label>
                        <input
                            type="text"
                            className="form-input"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            placeholder="Εισάγετε τίτλο ενότητας..."
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Περιεχόμενο</label>
                        <textarea
                            className="form-textarea"
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            placeholder="Εισάγετε το περιεχόμενο της ενότητας..."
                        />
                    </div>

                    <div className="form-buttons">
                        <button
                            className="admin-btn btn-success"
                            onClick={handleSaveSection}
                            disabled={loading}
                        >
                            💾 Αποθήκευση
                        </button>
                        <button
                            className="admin-btn btn-secondary"
                            onClick={cancelEdit}
                            disabled={loading}
                        >
                            ❌ Ακύρωση
                        </button>
                    </div>
                </div>
            )}

            {isCreating && (
                <div className={`create-section ${loading ? 'loading-overlay' : ''}`}>
                    <h3>Δημιουργία Νέας Ενότητας</h3>

                    <div className="edit-form">
                        <div className="form-group">
                            <label className="form-label">Τίτλος</label>
                            <input
                                type="text"
                                className="form-input"
                                value={newSectionData.title}
                                onChange={(e) => setNewSectionData({...newSectionData, title: e.target.value})}
                                placeholder="Εισάγετε τίτλο ενότητας..."
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Περιεχόμενο</label>
                            <textarea
                                className="form-textarea"
                                value={newSectionData.content}
                                onChange={(e) => setNewSectionData({...newSectionData, content: e.target.value})}
                                placeholder="Εισάγετε το περιεχόμενο της ενότητας..."
                            />
                        </div>

                        <div className="form-buttons">
                            <button
                                className="admin-btn btn-success"
                                onClick={handleCreateSection}
                                disabled={loading}
                            >
                                ✅ Δημιουργία
                            </button>
                            <button
                                className="admin-btn btn-secondary"
                                onClick={cancelCreate}
                                disabled={loading}
                            >
                                ❌ Ακύρωση
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InfoPortalEditor;