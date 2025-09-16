import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import InfoPortalEditor from '../components/InfoPortalEditor';
import axios from 'axios';

const InfoPortalPage = () => {
    const { user } = useContext(AuthContext);
    const [companies, setCompanies] = useState([]);
    const [activeCompanyId, setActiveCompanyId] = useState(null);
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);

    // Load companies data
    useEffect(() => {
        const fetchCompaniesWithSections = async () => {
            try {
                const response = await axios.get('/api/infoportal/companies');
                const companiesData = Array.isArray(response.data) ? response.data : [];
                setCompanies(companiesData);

                // Set first company as active if available
                if (companiesData.length > 0) {
                    const firstCompany = companiesData[0];
                    if (firstCompany?.company_id) {
                        setActiveCompanyId(firstCompany.company_id);
                        if (firstCompany?.sections?.length > 0) {
                            setActiveSectionId(firstCompany.sections[0].id);
                        }
                    }
                }
                setLoading(false);
            } catch (err) {
                console.error('Error fetching companies:', err);
                if (err.response?.status === 401) {
                    setError('Δεν έχετε δικαίωμα πρόσβασης. Παρακαλώ συνδεθείτε ξανά.');
                } else if (err.response?.status === 500) {
                    setError('Σφάλμα διακομιστή. Παρακαλώ δοκιμάστε ξανά αργότερα.');
                } else {
                    setError('Σφάλμα φόρτωσης δεδομένων. Ελέγξτε τη σύνδεσή σας.');
                }
                setLoading(false);
            }
        };

        fetchCompaniesWithSections();
    }, []);

    const activeCompany = Array.isArray(companies) ? companies.find(c => c.company_id === activeCompanyId) : null;
    const activeSection = activeCompany?.sections?.find ? activeCompany.sections.find(s => s.id === activeSectionId) : null;

    const handleCompanyClick = (companyId) => {
        setActiveCompanyId(companyId);
        if (Array.isArray(companies)) {
            const company = companies.find(c => c.company_id === companyId);
            if (company?.sections?.length > 0) {
                setActiveSectionId(company.sections[0].id);
            } else {
                setActiveSectionId(null);
            }
        } else {
            setActiveSectionId(null);
        }
    };

    const handleSectionClick = (sectionId) => {
        setActiveSectionId(sectionId);
    };

    const toggleEditMode = () => {
        setIsEditMode(!isEditMode);
    };

    // Handle section updates from editor
    const handleSectionUpdate = (updatedSection) => {
        if (!updatedSection || !activeCompanyId) return;

        setCompanies(prevCompanies => {
            if (!Array.isArray(prevCompanies)) return [];

            return prevCompanies.map(company => {
                if (company.company_id === activeCompanyId) {
                    return {
                        ...company,
                        sections: Array.isArray(company.sections)
                            ? company.sections.map(section =>
                                section.id === updatedSection.id ? updatedSection : section
                            )
                            : [updatedSection]
                    };
                }
                return company;
            });
        });
    };

    const handleSectionCreate = (newSection) => {
        if (!newSection || !activeCompanyId) return;

        setCompanies(prevCompanies => {
            if (!Array.isArray(prevCompanies)) return [];

            return prevCompanies.map(company => {
                if (company.company_id === activeCompanyId) {
                    return {
                        ...company,
                        sections: Array.isArray(company.sections)
                            ? [...company.sections, newSection]
                            : [newSection]
                    };
                }
                return company;
            });
        });

        // Set the new section as active
        if (newSection.id) {
            setActiveSectionId(newSection.id);
        }
    };

    const handleSectionDelete = (deletedSectionId) => {
        if (!deletedSectionId || !activeCompanyId) return;

        setCompanies(prevCompanies => {
            if (!Array.isArray(prevCompanies)) return [];

            return prevCompanies.map(company => {
                if (company.company_id === activeCompanyId) {
                    const currentSections = Array.isArray(company.sections) ? company.sections : [];
                    const remainingSections = currentSections.filter(section => section.id !== deletedSectionId);

                    // If we deleted the active section, set the first remaining as active
                    if (activeSectionId === deletedSectionId && remainingSections.length > 0) {
                        setActiveSectionId(remainingSections[0].id);
                    } else if (remainingSections.length === 0) {
                        setActiveSectionId(null);
                    }

                    return {
                        ...company,
                        sections: remainingSections
                    };
                }
                return company;
            });
        });
    };

    if (loading) {
        return (
            <div className="infoportal-loading">
                <div className="loading-spinner"></div>
                <p>Φόρτωση πληροφοριών...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="infoportal-error">
                <h3>Σφάλμα</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="infoportal-container">
            <style>
                {`
                    .infoportal-container {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow-x: hidden;
                    }

                    .infoportal-container::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                        pointer-events: none;
                    }

                    .infoportal-header {
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

                    .admin-controls {
                        display: flex;
                        gap: 10px;
                    }

                    .edit-toggle-btn {
                        padding: 12px 20px;
                        background: linear-gradient(135deg, #16a085, #f39c12);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(243, 156, 18, 0.3);
                    }

                    .edit-toggle-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(243, 156, 18, 0.4);
                    }

                    .edit-toggle-btn.active {
                        background: linear-gradient(135deg, #e74c3c, #c0392b);
                        box-shadow: 0 4px 15px rgba(231, 76, 60, 0.3);
                    }

                    .infoportal-content {
                        display: grid;
                        grid-template-columns: 300px 1fr;
                        gap: 30px;
                        position: relative;
                        z-index: 10;
                    }

                    .companies-tabs {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 20px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        height: fit-content;
                    }

                    .company-tab {
                        display: block;
                        width: 100%;
                        padding: 15px 20px;
                        background: transparent;
                        border: none;
                        border-radius: 12px;
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 1rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        text-align: left;
                        margin-bottom: 8px;
                        position: relative;
                        overflow: hidden;
                    }

                    .company-tab::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .company-tab:hover::before {
                        left: 100%;
                    }

                    .company-tab:hover {
                        background: rgba(255, 255, 255, 0.15);
                        color: white;
                        transform: translateX(5px);
                    }

                    .company-tab.active {
                        background: rgba(255, 255, 255, 0.25);
                        color: white;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                    }

                    .content-area {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                    }

                    .sections-nav {
                        background: rgba(255, 255, 255, 0.1);
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                        padding: 20px;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 10px;
                    }

                    .section-tab {
                        padding: 10px 20px;
                        background: transparent;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 0.9rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }

                    .section-tab:hover {
                        background: rgba(255, 255, 255, 0.15);
                        color: white;
                    }

                    .section-tab.active {
                        background: rgba(255, 255, 255, 0.25);
                        color: white;
                        border-color: rgba(255, 255, 255, 0.4);
                    }

                    .content-display {
                        flex: 1;
                        padding: 30px;
                        color: white;
                        min-height: 400px;
                    }

                    .section-title {
                        font-size: 2rem;
                        font-weight: 600;
                        margin-bottom: 20px;
                        color: white;
                    }

                    .section-content {
                        font-size: 1.1rem;
                        line-height: 1.6;
                        color: rgba(255, 255, 255, 0.9);
                        white-space: pre-wrap;
                    }

                    .no-content {
                        color: rgba(255, 255, 255, 0.6);
                        font-style: italic;
                        text-align: center;
                        padding: 50px;
                    }

                    .infoportal-loading,
                    .infoportal-error {
                        min-height: 50vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        text-align: center;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 20px;
                        margin: 20px;
                        padding: 40px;
                    }

                    .loading-spinner {
                        width: 50px;
                        height: 50px;
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

                    /* Responsive Design */
                    @media (max-width: 1024px) {
                        .infoportal-content {
                            grid-template-columns: 250px 1fr;
                            gap: 20px;
                        }

                        .header-title {
                            font-size: 2rem;
                        }
                    }

                    @media (max-width: 768px) {
                        .infoportal-container {
                            padding: 15px;
                        }

                        .infoportal-content {
                            grid-template-columns: 1fr;
                            gap: 20px;
                        }

                        .companies-tabs {
                            order: 2;
                            display: flex;
                            overflow-x: auto;
                            padding: 10px;
                            gap: 10px;
                        }

                        .company-tab {
                            flex-shrink: 0;
                            white-space: nowrap;
                            margin-bottom: 0;
                        }

                        .content-area {
                            order: 1;
                        }

                        .header-content {
                            flex-direction: column;
                            text-align: center;
                        }

                        .header-title {
                            font-size: 1.8rem;
                        }

                        .sections-nav {
                            overflow-x: auto;
                            white-space: nowrap;
                            padding: 15px;
                        }

                        .section-tab {
                            flex-shrink: 0;
                            display: inline-block;
                            margin-right: 10px;
                        }

                        .content-display {
                            padding: 20px;
                        }

                        .section-title {
                            font-size: 1.5rem;
                        }
                    }
                `}
            </style>

            <div className="infoportal-header">
                <div className="header-content">
                    <h1 className="header-title">
                        ℹ️ InfoPortal
                    </h1>
                    {user?.role === 'Admin' && (
                        <div className="admin-controls">
                            <button
                                className={`edit-toggle-btn ${isEditMode ? 'active' : ''}`}
                                onClick={toggleEditMode}
                            >
                                {isEditMode ? '📝 Τέλος Επεξεργασίας' : '✏️ Επεξεργασία'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="infoportal-content">
                <div className="companies-tabs">
                    {Array.isArray(companies) && companies.map(company => (
                        <button
                            key={company.company_id}
                            className={`company-tab ${activeCompanyId === company.company_id ? 'active' : ''}`}
                            onClick={() => handleCompanyClick(company.company_id)}
                        >
                            🏢 {company.company_name}
                        </button>
                    ))}
                </div>

                <div className="content-area">
                    {activeCompany && (
                        <>
                            <div className="sections-nav">
                                {Array.isArray(activeCompany.sections) && activeCompany.sections.map(section => (
                                    <button
                                        key={section.id}
                                        className={`section-tab ${activeSectionId === section.id ? 'active' : ''}`}
                                        onClick={() => handleSectionClick(section.id)}
                                    >
                                        {section.title}
                                    </button>
                                ))}
                            </div>

                            <div className="content-display">
                                {activeSection ? (
                                    <>
                                        <h2 className="section-title">{activeSection.title}</h2>
                                        <div className="section-content">
                                            {activeSection.content || 'Δεν υπάρχει περιεχόμενο για αυτή την ενότητα.'}
                                        </div>
                                    </>
                                ) : (
                                    <div className="no-content">
                                        Επιλέξτε μια ενότητα για προβολή
                                    </div>
                                )}

                                {user?.role === 'Admin' && (
                                    <InfoPortalEditor
                                        activeCompany={activeCompany}
                                        activeSection={activeSection}
                                        onSectionUpdate={handleSectionUpdate}
                                        onSectionCreate={handleSectionCreate}
                                        onSectionDelete={handleSectionDelete}
                                        isEditMode={isEditMode}
                                        setIsEditMode={setIsEditMode}
                                    />
                                )}
                            </div>
                        </>
                    )}

                    {!activeCompany && (
                        <div className="no-content">
                            Επιλέξτε μια εταιρεία για προβολή πληροφοριών
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InfoPortalPage;