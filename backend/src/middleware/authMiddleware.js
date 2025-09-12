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
    // Επισύναψη των στοιχείων του χρήστη στο request για να είναι διαθέσιμα στους controllers
    req.user = decoded.user;
    next(); // Προχώρα στην επόμενη συνάρτηση
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;