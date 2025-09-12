import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = () => {
    const { token } = useContext(AuthContext);

    if (!token) {
        // Αν δεν υπάρχει token, στείλε τον χρήστη στη σελίδα login
        return <Navigate to="/login" replace />;
    }

    // Αν υπάρχει, δείξε την σελίδα που ζήτησε
    return <Outlet />;
};

export default ProtectedRoute;