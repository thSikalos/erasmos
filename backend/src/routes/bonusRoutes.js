const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createBonus, getBonuses, getBonusProgress, getBonusProgressForDashboard, getAllBonuses } = require('../controllers/bonusController');

router.use(authMiddleware); // Όλα τα routes για bonus απαιτούν σύνδεση

// Route για τη δημιουργία bonus (TeamLeader/Admin only)
router.post('/', createBonus);

// Route για να πάρεις τα bonuses ενός χρήστη
router.get('/user/:userId', getBonuses);

// Route για να πάρεις τα bonuses του τρέχοντος χρήστη
router.get('/my-bonuses', (req, res) => {
    req.params.userId = req.user.id;
    getBonuses(req, res);
});

// Route για την πρόοδο bonuses ενός χρήστη
router.get('/user/:userId/progress', getBonusProgress);

// Route για την πρόοδο bonuses του τρέχοντος χρήστη
router.get('/my-progress', (req, res) => {
    req.params.userId = req.user.id;
    getBonusProgress(req, res);
});

// Route για την πρόοδο bonuses του τρέχοντος χρήστη (για dashboard - μετράει "Καταχωρήθηκε")
router.get('/my-dashboard-progress', (req, res) => {
    req.params.userId = req.user.id;
    getBonusProgressForDashboard(req, res);
});

// Route για όλα τα bonuses (Admin/TeamLeader only)
router.get('/all', getAllBonuses);

module.exports = router;