const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createBonus } = require('../controllers/bonusController');

router.use(authMiddleware); // Όλα τα routes για bonus απαιτούν σύνδεση

// Route για τη δημιουργία bonus (προς το παρόν για όλους, θα το περιορίσουμε)
router.post('/', createBonus);

module.exports = router;