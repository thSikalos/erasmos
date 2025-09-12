import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const FinanceProtectedRoute = () => {
    const { user } = useContext(AuthContext);

    // Αν ο χρήστης είναι Γραμματέας, δεν επιτρέπουμε την πρόσβαση και τον στέλνουμε στο dashboard.
    if (user?.role === 'Secretary') {
        return <Navigate to="/dashboard" replace />;
    }

    // Για όλους τους άλλους επιτρεπόμενους ρόλους, εμφανίζουμε κανονικά τη σελίδα.
    return <Outlet />;
};

export default FinanceProtectedRoute;