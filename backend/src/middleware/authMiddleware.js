const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authMiddleware = async (req, res, next) => {
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - decoded token:', decoded);

    // Get the user from database to check current status
    const userId = decoded.user ? decoded.user.id : decoded.id;
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token structure' });
    }

    const userResult = await pool.query(
      'SELECT id, name, email, role, parent_user_id, is_active, deleted_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check if user is deleted
    if (user.deleted_at) {
      return res.status(401).json({ message: 'User account has been deleted' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        message: 'Ο λογαριασμός σας έχει απενεργοποιηθεί. Επικοινωνήστε με τον διαχειριστή.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Επισύναψη των ενημερωμένων στοιχείων του χρήστη στο request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      parent_user_id: user.parent_user_id,
      is_active: user.is_active
    };

    console.log('Auth middleware - req.user set to:', req.user);
    next(); // Προχώρα στην επόμενη συνάρτηση
  } catch (err) {
    console.log('Auth middleware - error:', err.message);
    if (err.name === 'JsonWebTokenError') {
      res.status(401).json({ message: 'Token is not valid' });
    } else {
      res.status(500).json({ message: 'Server error during authentication' });
    }
  }
};

module.exports = authMiddleware;