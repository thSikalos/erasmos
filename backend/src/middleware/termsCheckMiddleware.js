const termsCheckMiddleware = (req, res, next) => {
    // Ελέγχουμε αν ο χρήστης είναι συνδεδεμένος και αν δεν έχει αποδεχτεί τους όρους
    if (req.user && !req.user.has_accepted_terms) {
        // Επιτρέπουμε την πρόσβαση μόνο στα endpoints που χρειάζονται για την αποδοχή
        if (req.path === '/accept-terms' || req.path.endsWith('/agreement')) {
            return next();
        }
        // Για όλα τα άλλα, στέλνουμε ένα ειδικό σφάλμα
        return res.status(403).json({ 
            message: 'Terms of service must be accepted.',
            errorCode: 'TERMS_NOT_ACCEPTED' 
        });
    }
    next();
};

module.exports = termsCheckMiddleware;