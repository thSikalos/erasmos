const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  let token;
  
  // 1. Προσπάθεια λήψης από το header (για κανονικές κλήσεις API)
  if (req.header('authorization')) {
    token = req.header('authorization').split(' ')[1];
  }
  // 2. Εναλλακτικά, από το URL (για downloads)
  else if (req.query.token) {
    token = req.query.token;
  }

  // Αν δεν βρεθεί token με κανέναν τρόπο, απαγόρευσε την πρόσβαση
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Επιβεβαίωση του token
    const decoded = jwt.verify(token, 'mySuperSecretKey123');
    console.log('Auth middleware - decoded token:', decoded);
    // Επισύναψη των στοιχείων του χρήστη στο request για να είναι διαθέσιμα στους controllers
    req.user = decoded.user || decoded; // Try both decoded.user and decoded directly
    console.log('Auth middleware - req.user set to:', req.user);
    next(); // Προχώρα στην επόμενη συνάρτηση
  } catch (err) {
    console.log('Auth middleware - token verification failed:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;