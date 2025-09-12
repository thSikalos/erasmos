const adminMiddleware = (req, res, next) => {
  // Αυτό το middleware τρέχει ΑΦΟΥ τρέξει το authMiddleware,
  // οπότε έχουμε πρόσβαση στο req.user.
  if (req.user && req.user.role === 'Admin') {
    next(); // Αν ο ρόλος είναι 'Admin', προχώρα.
  } else {
    res.status(403).json({ message: 'Access forbidden: Admins only' });
  }
};

module.exports = adminMiddleware;