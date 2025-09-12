import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

const AdminPage = () => {
    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Admin Panel</h1>
                <Link to="/dashboard" className="button-new">Πίσω στο Dashboard</Link>
            </header>
            <main>
                <div className="admin-grid-3">
                    <div className="admin-section">
                        <h3><Link to="/admin/fields">Διαχείριση Πεδίων</Link></h3>
                        <p>Δημιούργησε και επεξεργάσου όλα τα διαθέσιμα πεδία για τις φόρμες αιτήσεων.</p>
                    </div>
                    <div className="admin-section">
                        <h3><Link to="/admin/companies">Διαχείριση Εταιρειών</Link></h3>
                        <p>Δημιούργησε εταιρείες και ανάθεσε πεδία στις φόρμες αιτήσεών τους.</p>
                    </div>
                    <div className="admin-section">
                        <h3><Link to="/admin/recycle-bin">Κάδος Ανακύκλωσης</Link></h3>
                        <p>Δες τους διεγραμμένους πελάτες και κάνε επαναφορά ή οριστική διαγραφή.</p>
                    </div>
                    <div className="admin-section">
                        <h3><Link to="/admin/users">Διαχείριση Χρηστών</Link></h3>
                        <p>Δημιούργησε, επεξεργάσου και διαχειρίσου όλους τους χρήστες και τους ρόλους τους.</p>
                    </div>
                    <div className="admin-section">
                        <h3><Link to="/admin/billing-settings">Ρυθμίσεις Χρέωσης</Link></h3>
                        <p>Όρισε τη βασική χρέωση ανά αίτηση και τις κλίμακες εκπτώσεων.</p>
                    </div>
                    <div className="admin-section">
                        <h3><Link to="/admin/invoicing">Χρέωση Ομαδαρχών</Link></h3>
                        <p>Δημιούργησε και δες τις ταμειακές καταστάσεις για τους ομαδάρχες.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminPage;