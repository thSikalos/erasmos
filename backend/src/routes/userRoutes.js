const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

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
    forgotPassword,
    resetPassword,
    changePassword,
} = require('../controllers/userController');

// Public Routes
router.post('/login', loginUser);
router.post('/register', registerUserRequest);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// --- All subsequent routes are protected ---
router.use(authMiddleware);

// Token Refresh Route
router.post('/refresh-token', refreshToken);

// Password Change Route (for authenticated users)
router.post('/change-password', changePassword);


// --- ADMIN ONLY ROUTES ---
router.post('/', adminMiddleware, createUser); // Admin creates all users
router.get('/', adminMiddleware, getAllUsers); // Admin sees all users
router.put('/:id', adminMiddleware, updateUser); // Admin updates any user
router.delete('/:id', adminMiddleware, deleteUser); // Admin soft-deletes any user

// --- TEAM LEADER ROUTES ---
router.get('/my-team', getMyTeam);

// --- GENERAL AUTHENTICATED ROUTES ---
router.get('/:id', getUserById);

module.exports = router;