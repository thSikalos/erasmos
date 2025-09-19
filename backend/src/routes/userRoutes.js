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
    getAllTeamLeaders,
    getUserById,
    updateUser,
    deleteUser,
    getMyTeam,
    toggleUserStatus,
    toggleTeamStatus,
    toggleSubTeamStatus,
    getTeamHierarchy,
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
router.get('/team-leaders/all', adminMiddleware, getAllTeamLeaders); // Admin sees all team leaders with team info
router.put('/:id', adminMiddleware, updateUser); // Admin updates any user
router.delete('/:id', adminMiddleware, deleteUser); // Admin soft-deletes any user

// --- TEAM MANAGEMENT ROUTES (ADMIN ONLY) ---
router.put('/:id/toggle-status', adminMiddleware, toggleUserStatus); // Toggle individual user status
router.put('/:id/toggle-team', adminMiddleware, toggleTeamStatus); // Toggle entire team status
router.put('/:id/toggle-subteam', adminMiddleware, toggleSubTeamStatus); // Toggle sub-team status (user + direct children only)
router.get('/:id/team-hierarchy', adminMiddleware, getTeamHierarchy); // Get team hierarchy

// --- TEAM LEADER ROUTES ---
router.get('/my-team', getMyTeam);

// --- GENERAL AUTHENTICATED ROUTES ---
router.get('/:id', getUserById);

module.exports = router;