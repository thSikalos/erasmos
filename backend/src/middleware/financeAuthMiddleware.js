const financeAuthMiddleware = (req, res, next) => {
    // Αυτό το middleware τρέχει μετά το authMiddleware, οπότε έχουμε πρόσβαση στο req.user.
    const userRole = req.user.role;

    // Επιτρέπουμε την πρόσβαση μόνο σε Admin και TeamLeader.
    if (userRole === 'Admin' || userRole === 'TeamLeader') {
        next(); // Προχώρα στο επόμενο βήμα.
    } else {
        // Για οποιονδήποτε άλλο ρόλο (π.χ. Secretary), απαγορεύουμε την πρόσβαση.
        res.status(403).json({ message: 'Access Forbidden: This action is reserved for Team Leaders and Admins.' });
    }
};

module.exports = financeAuthMiddleware;