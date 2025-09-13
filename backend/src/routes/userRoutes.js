const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const termsCheckMiddleware = require('../middleware/termsCheckMiddleware');

const {
    loginUser,
    registerUserRequest,
    refreshToken,
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getMyTeam,
    acceptTerms,
    getUserAgreement,
    generateAgreementPdf
} = require('../controllers/userController');

// Public Routes
router.post('/login', loginUser);
router.post('/register', registerUserRequest);

// --- All subsequent routes are protected ---
router.use(authMiddleware);

// Token Refresh Route (requires valid token but not terms acceptance)
router.post('/refresh-token', refreshToken);

// Accept Terms Route
router.post('/accept-terms', acceptTerms);

// --- All subsequent routes require terms acceptance ---
router.use(termsCheckMiddleware);

// --- ADMIN ONLY ROUTES ---
router.post('/', adminMiddleware, createUser); // Admin creates all users
router.get('/', adminMiddleware, getAllUsers); // Admin sees all users
router.put('/:id', adminMiddleware, updateUser); // Admin updates any user
router.delete('/:id', adminMiddleware, deleteUser); // Admin soft-deletes any user
router.get('/:id/agreement', adminMiddleware, getUserAgreement); // Admin gets user agreement details
router.get('/:id/agreement/pdf', adminMiddleware, generateAgreementPdf); // Admin downloads agreement PDF

// --- TEAM LEADER ROUTES ---
router.get('/my-team', getMyTeam);

// --- GENERAL AUTHENTICATED ROUTES ---
router.get('/:id', getUserById);

module.exports = router;